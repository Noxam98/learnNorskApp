// Вкладка «Все слова» раздела «Учёба»: фильтры по статусу/теме/уровню/поиску/сортировке,
// список слов с быстрыми действиями и массовыми операциями. Дизайн — study.css (хендофф).
import { useCallback, useEffect, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { StatusBadge, StrengthBar, RampBar } from "../../components/learning/StatusBits.jsx";
import { ActionMenu } from "../../components/ui/Dropdown.jsx";
import { FilterChipsPopup } from "../../components/ui/FilterChipsPopup.jsx";
import { SortControl } from "../../components/ui/SortControl.jsx";
import { sortOptions } from "../../components/ui/sortOptions.js";
import { SearchBox } from "../../components/ui/SearchBox.jsx";
import { posMeta, posLabel } from "../../components/ui/pos.js";
import { speakText } from "../../components/ui/tts.js";
import { SkeletonWordlist } from "../../components/ui/Spinner.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { L } from "./WordsTab.i18n.js";



const STATUS_CHIPS = ["all", "new", "in_progress", "repeat", "mastered", "known", "weak", "archived"];
const STATUS_DOT = { new: "new", in_progress: "learn", repeat: "review", mastered: "master", known: "known", weak: "weak" };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOPIC_KEYS = ["family", "food", "home", "work", "school", "travel", "health", "body", "clothing", "nature", "animals", "weather", "city", "transport", "traffic", "shopping", "time", "sport", "hobby", "technology", "communication", "emotions", "holidays", "society", "other"];

const MS_DAY = 86400000;

// Когда слово реально «прилетит в повтор»: у сертифицированных — по аудиту (audit_due),
// у остальных — по due_at. Для отображения срока на карточке.
function nextReviewAt(w) {
    return (w?.certified && w?.audit_due) ? w.audit_due : (w?.due_at || w?.due || null);
}

// Относительный срок до повтора из ISO: минуты/часы/дни (когда прилетит в повтор).
function dueText(at, tt) {
    if (!at) return null;
    const due = new Date(at); if (isNaN(due)) return null;
    const ms = due - new Date();
    if (ms <= 0) return tt.overdue;                       // срок настал
    const mins = Math.round(ms / 60000);
    if (mins < 60) return tt.inMin(Math.max(1, mins));    // < часа → минуты
    const hours = Math.round(mins / 60);
    if (hours < 24) return tt.inHours(hours);             // < суток → часы
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(due); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / MS_DAY);
    if (diff <= 0) return tt.today;
    if (diff === 1) return tt.tomorrow;
    return tt.inDays(diff);
}

export default function WordsTab({ lang, openSession, openWord, reloadKey, refresh }) {
    const tt = L[lang] || L.ru;
    const ig = interfaceTranslate[lang] || interfaceTranslate.ru || {};
    const topicNames = ig.topics || {};

    const [status, setStatus] = useState("all");
    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState("");
    const [sort, setSort] = useState("strength");
    const [order, setOrder] = useState("asc");
    const [q, setQ] = useState("");
    const [dq, setDq] = useState("");        // debounced query
    const [phase, setPhase] = useState("idle");

    const [words, setWords] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState(() => new Set());
    const [busy, setBusy] = useState(false);

    // Дебаунс поиска (~300мс).
    useEffect(() => {
        if (q !== dq) setPhase("counting");
        const id = setTimeout(() => setDq(q), 300);
        return () => clearTimeout(id);
    }, [q]); // eslint-disable-line

    // Счётчики статусов.
    useEffect(() => {
        let on = true;
        api.learningStats().then((s) => { if (on) setStats(s || null); }).catch(() => {});
        return () => { on = false; };
    }, [reloadKey]);

    // Список слов.
    const load = useCallback(() => {
        let on = true;
        setLoading(true);
        if (dq) setPhase("searching");
        api.learningList({
            status: status === "all" ? "all" : status,
            level: level || undefined,
            topic: topic || undefined,
            q: dq || undefined,
            sort, order,
        }).then((r) => {
            if (!on) return;
            setWords(Array.isArray(r?.words) ? r.words : []);
            setSel(new Set());
        }).catch(() => { if (on) setWords([]); })
            .finally(() => { if (on) { setLoading(false); setPhase("idle"); } });
        return () => { on = false; };
    }, [status, level, topic, dq, sort, order]);

    useEffect(() => load(), [load, reloadKey]);

    const counts = stats?.byStatus || {};
    const total = stats?.total;
    const chipCount = (k) => {
        if (k === "all") return total ?? Object.values(counts).reduce((a, b) => a + (b || 0), 0);
        return counts[k] ?? 0;
    };

    // --- Мутации ---
    const mutate = async (poolId, action) => {
        try { await api.learningStatus(poolId, action); } catch { /* */ }
        load(); refresh?.();
    };
    // «Не учить»: мусорное слово — убрать у себя из Учёбы + отправить админу на модерацию.
    const report = async (poolId) => {
        try { await api.learningReport(poolId); } catch { /* */ }
        load(); refresh?.();
    };
    const bulk = async (action) => {
        const ids = words.filter((w) => sel.has(w.pool_id)).map((w) => w.pool_id);
        if (!ids.length) return;
        setBusy(true);
        try { await Promise.allSettled(ids.map((id) => api.learningStatus(id, action))); }
        finally { setBusy(false); }
        load(); refresh?.();
    };

    const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const clearSel = () => setSel(new Set());
    const selectedWords = words.filter((w) => sel.has(w.pool_id));

    const primaryTr = (w) => {
        const arr = w?.translate?.[lang] || w?.translate?.ru || [];
        return { first: arr[0] || "", rest: arr.slice(1).join(", ") };
    };

    return (
        <>
            {/* Фильтры */}
            <div className="filterbar">
                <div className="chiprow chiprow--scroll">
                    {STATUS_CHIPS.map((k) => (
                        <button key={k} type="button"
                            className={"fchip" + (status === k ? " is-active" : "")}
                            onClick={() => setStatus(k)}>
                            {k === "archived"
                                ? <Icon n="archive" sm />
                                : STATUS_DOT[k] && <span className={"sdot sdot--" + STATUS_DOT[k]} />}
                            {tt.chips[k]} <span className="fchip__count">{chipCount(k)}</span>
                        </button>
                    ))}
                </div>
                <div className="searchrow">
                    <SortControl value={sort} order={order}
                        options={sortOptions(interfaceTranslate[lang], ["strength", "due", "alpha", "level", "freq", "pos"])}
                        onChange={(s, o) => { setSort(s); setOrder(o); }} />
                    <FilterChipsPopup icon="grid" label={tt.topic} count={topic ? 1 : 0}
                        sections={[{
                            key: "topic", multi: false, selected: topic,
                            onPick: (v) => setTopic((c) => (c === v ? "" : v)),
                            options: TOPIC_KEYS.map((k) => ({ value: k, label: topicNames[k] || k })),
                        }]} />
                    <FilterChipsPopup icon="layers" label={tt.level} count={level ? 1 : 0}
                        sections={[{
                            key: "level", multi: false, selected: level,
                            onPick: (v) => setLevel((c) => (c === v ? "" : v)),
                            options: LEVELS.map((l) => ({ value: l, label: l })),
                        }]} />
                    <SearchBox value={q} onChange={setQ} placeholder={tt.searchPh}
                        phase={phase} debounceMs={300} />
                </div>
            </div>

            {/* Массовые действия */}
            {sel.size > 0 && (
                <div className="bulkbar">
                    <span className="bulkbar__count">{tt.selected} {sel.size}</span>
                    <button className="bulk-btn" disabled={busy} onClick={() => bulk("known")}>
                        <Icon n="check-circle" /> {tt.know}
                    </button>
                    <button className="bulk-btn" disabled={busy} onClick={() => bulk("know")}>
                        <Icon n="archive" /> {tt.toArchive}
                    </button>
                    <button className="bulk-btn" onClick={() => openSession?.(selectedWords, "choice")}>
                        <Icon n="play" /> {tt.practice}
                    </button>
                    <div className="grow" />
                    <button className="bulk-btn" onClick={clearSel}>
                        <Icon n="x" /> {tt.clear}
                    </button>
                </div>
            )}

            {/* Список слов */}
            {loading ? (
                <SkeletonWordlist count={10} />
            ) : words.length === 0 ? (
                <div className="empty">
                    <div className="empty__ic"><Icon n="search" lg /></div>
                    <div className="empty__t">{tt.empty}</div>
                    <div className="empty__d">{tt.emptyHint}</div>
                </div>
            ) : (
                <div className="swordlist">
                    {words.map((w) => (
                        <WordRow key={w.pool_id} w={w} lang={lang} tt={tt} t={ig}
                            selected={sel.has(w.pool_id)}
                            onToggle={() => toggleSel(w.pool_id)}
                            onOpen={() => openWord?.(w.no, null)}
                            onKnow={() => mutate(w.pool_id, "known")}
                            onArchive={() => mutate(w.pool_id, "know")}
                            onReset={() => mutate(w.pool_id, "reset")}
                            onReport={() => report(w.pool_id)}
                            primaryTr={primaryTr(w)} />
                    ))}
                </div>
            )}
        </>
    );
}

function WordRow({ w, lang, tt, t, selected, onToggle, onOpen, onKnow, onArchive, onReset, onReport, primaryTr }) {
    const ds = w.dstatus || w.status;   // отображаемый статус (in_progress/repeat/...)
    const showKnow = w.status !== "mastered" && w.status !== "archived" && w.status !== "known";   // по ВНУТРЕННЕМУ статусу
    // срок «когда повторять» — только у выученного/повторения (у них есть расписание повтора).
    // «в процессе» ещё учатся (нет графика повторов), новые/архив — тоже без срока.
    const due = (ds === "mastered" || ds === "repeat") ? dueText(nextReviewAt(w), tt) : null;

    const menuItems = [
        { key: "know", label: tt.knowMenu, icon: "check-circle", onClick: onKnow },
        { key: "open", label: tt.openCard, icon: "bookmark", onClick: onOpen },
        { key: "speak", label: tt.speak, icon: "volume", onClick: () => speakText(w.no) },
        { key: "reset", label: tt.reset, icon: "rotate", onClick: onReset },
        { key: "report", label: t.dontLearn || "Не учить", icon: "x-circle", danger: true, onClick: onReport },
        { key: "archive", label: tt.toArchive, icon: "archive", onClick: onArchive, danger: true },
    ];

    // Клик по телу карточки (не по чекбоксу/меню/«Знаю») → открыть карточку слова.
    const onBody = (e) => { if (e.target.closest(".check,.sword__right,.know-btn,.sword__menu,.tool,.actionsmenu")) return; onOpen(); };

    return (
        <div className={"sword" + (selected ? " is-selected" : "")} onClick={onBody}>
            <span className={"check" + (selected ? " is-on" : "")}
                role="checkbox" aria-checked={selected} tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } }}>
                {selected && <Icon n="check" />}
            </span>

            <div className="sword__main">
                <div className="sword__top">
                    <span className="sword__word">{w.no}</span>
                    <span className="sword__tr">
                        <b>{primaryTr.first}</b>{primaryTr.rest ? `, ${primaryTr.rest}` : ""}
                    </span>
                </div>
                <div className="sword__meta">
                    <span className={"chip pos " + posMeta(w.part_of_speech).cls}>{posLabel(w.part_of_speech, t)}</span>
                    <StatusBadge status={ds} lang={lang} />
                    {/* «в процессе» — прогресс по рампе (ступени), у остальных — сила (% недавних верных) */}
                    {ds === "in_progress"
                        ? <RampBar done={w.ramp?.done} total={w.ramp?.total} sm />
                        : <StrengthBar value={w.strength} status={ds} sm showVal />}
                    {due && <span className="sword__due"><Icon n="clock" /> {due}</span>}
                </div>
            </div>

            <div className="sword__right" onClick={(e) => e.stopPropagation()}>
                {showKnow && (
                    <button className="know-btn" onClick={onKnow}>
                        <Icon n="check" /> {tt.know}
                    </button>
                )}
                <ActionMenu icon="more" align="right" items={menuItems} />
            </div>
        </div>
    );
}
