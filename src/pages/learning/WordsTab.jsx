// Вкладка «Все слова» раздела «Учёба»: фильтры по статусу/теме/уровню/поиску/сортировке,
// список слов с быстрыми действиями и массовыми операциями. Дизайн — study.css (хендофф).
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { StatusBadge, StrengthBar } from "../../components/learning/StatusBits.jsx";
import { ActionMenu } from "../../components/ui/Dropdown.jsx";
import { Dropdown } from "../../components/ui/Dropdown.jsx";
import { SearchBox } from "../../components/ui/SearchBox.jsx";
import { posMeta, posLabel } from "../../components/ui/pos.js";
import { speakText } from "../../components/ui/tts.js";
import { SkeletonWordlist } from "../../components/ui/Spinner.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";

// --- Локальные 5-язычные строки (i18n этого файла; interfaceTranslation не трогаем) ---
const L = {
    ru: {
        chips: { all: "Все", new: "Новые", learning: "Учу", review: "Повторение", mastered: "Выучено", weak: "Слабые", archived: "Архив" },
        searchPh: "Поиск по всем языкам — norsk, рус, eng…",
        topicAll: "Тема: все", topic: "Тема", levelAll: "Уровень: все", level: "Уровень",
        sortStrength: "По силе", sortDue: "Скоро повторять", sortAlpha: "Алфавит",
        know: "Знаю", knowMenu: "Я это знаю", openCard: "Открыть карточку", speak: "Озвучить",
        reset: "Сбросить прогресс", toArchive: "В архив",
        selected: "Выбрано:", markMastered: "Отметить выученными", practice: "Практика по выбранным", clear: "Снять",
        empty: "Слов не найдено", emptyHint: "Измените фильтры или поисковый запрос.",
        today: "сегодня", tomorrow: "завтра", overdue: "просрочено",
        inDays: (n) => `через ${n} ${plRu(n)}`,
    },
    en: {
        chips: { all: "All", new: "New", learning: "Learning", review: "Review", mastered: "Mastered", weak: "Weak", archived: "Archive" },
        searchPh: "Search across all languages — norsk, rus, eng…",
        topicAll: "Topic: all", topic: "Topic", levelAll: "Level: all", level: "Level",
        sortStrength: "By strength", sortDue: "Due soon", sortAlpha: "Alphabetical",
        know: "Know", knowMenu: "I know this", openCard: "Open card", speak: "Speak",
        reset: "Reset progress", toArchive: "Archive",
        selected: "Selected:", markMastered: "Mark as mastered", practice: "Practice selected", clear: "Clear",
        empty: "No words found", emptyHint: "Change filters or search query.",
        today: "today", tomorrow: "tomorrow", overdue: "overdue",
        inDays: (n) => `in ${n} day${n === 1 ? "" : "s"}`,
    },
    ukr: {
        chips: { all: "Усі", new: "Нові", learning: "Вчу", review: "Повторення", mastered: "Вивчено", weak: "Слабкі", archived: "Архів" },
        searchPh: "Пошук усіма мовами — norsk, укр, eng…",
        topicAll: "Тема: усі", topic: "Тема", levelAll: "Рівень: усі", level: "Рівень",
        sortStrength: "За силою", sortDue: "Скоро повторювати", sortAlpha: "Алфавіт",
        know: "Знаю", knowMenu: "Я це знаю", openCard: "Відкрити картку", speak: "Озвучити",
        reset: "Скинути прогрес", toArchive: "В архів",
        selected: "Вибрано:", markMastered: "Позначити вивченими", practice: "Практика за вибраними", clear: "Зняти",
        empty: "Слів не знайдено", emptyHint: "Змініть фільтри або пошуковий запит.",
        today: "сьогодні", tomorrow: "завтра", overdue: "прострочено",
        inDays: (n) => `через ${n} ${plUk(n)}`,
    },
    pl: {
        chips: { all: "Wszystkie", new: "Nowe", learning: "Uczę się", review: "Powtórka", mastered: "Opanowane", weak: "Słabe", archived: "Archiwum" },
        searchPh: "Szukaj we wszystkich językach — norsk, pol, eng…",
        topicAll: "Temat: wszystkie", topic: "Temat", levelAll: "Poziom: wszystkie", level: "Poziom",
        sortStrength: "Wg siły", sortDue: "Wkrótce powtórka", sortAlpha: "Alfabetycznie",
        know: "Znam", knowMenu: "Znam to", openCard: "Otwórz kartę", speak: "Wymów",
        reset: "Zresetuj postęp", toArchive: "Do archiwum",
        selected: "Wybrano:", markMastered: "Oznacz jako opanowane", practice: "Ćwicz wybrane", clear: "Wyczyść",
        empty: "Nie znaleziono słów", emptyHint: "Zmień filtry lub zapytanie.",
        today: "dziś", tomorrow: "jutro", overdue: "zaległe",
        inDays: (n) => `za ${n} ${plPl(n)}`,
    },
    lt: {
        chips: { all: "Visi", new: "Nauji", learning: "Mokausi", review: "Kartojimas", mastered: "Išmokti", weak: "Silpni", archived: "Archyvas" },
        searchPh: "Ieškoti visomis kalbomis — norsk, lt, eng…",
        topicAll: "Tema: visos", topic: "Tema", levelAll: "Lygis: visi", level: "Lygis",
        sortStrength: "Pagal stiprumą", sortDue: "Greitai kartoti", sortAlpha: "Abėcėlė",
        know: "Žinau", knowMenu: "Tai žinau", openCard: "Atverti kortelę", speak: "Įgarsinti",
        reset: "Atstatyti progresą", toArchive: "Į archyvą",
        selected: "Pasirinkta:", markMastered: "Pažymėti išmoktais", practice: "Praktika su pasirinktais", clear: "Nuimti",
        empty: "Žodžių nerasta", emptyHint: "Pakeiskite filtrus arba paieškos užklausą.",
        today: "šiandien", tomorrow: "rytoj", overdue: "pavėluota",
        inDays: (n) => `po ${n} ${plLt(n)}`,
    },
};

// Множественные формы «день» для относительного срока.
function plRu(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "день"; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дня"; return "дней"; }
function plUk(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "день"; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дні"; return "днів"; }
function plPl(n) { const m10 = n % 10, m100 = n % 100; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "dni"; return "dni"; }
function plLt(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 0 || (m100 >= 11 && m100 <= 19)) return "dienų"; if (m10 === 1) return "dieną"; return "dienų"; }

const STATUS_CHIPS = ["all", "new", "learning", "review", "mastered", "weak", "archived"];
const STATUS_DOT = { new: "new", learning: "learn", review: "review", mastered: "master", weak: "weak" };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SORTS = ["strength", "due", "alpha"];
const TOPIC_KEYS = ["family", "food", "home", "work", "school", "travel", "health", "body", "clothing", "nature", "animals", "weather", "city", "transport", "shopping", "time", "sport", "hobby", "technology", "communication", "emotions", "holidays", "society", "other"];

const MS_DAY = 86400000;

// Относительный срок повторения из ISO due_at.
function dueText(dueAt, tt) {
    if (!dueAt) return null;
    const due = new Date(dueAt); if (isNaN(due)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(due); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / MS_DAY);
    if (diff < 0) return tt.overdue;
    if (diff === 0) return tt.today;
    if (diff === 1) return tt.tomorrow;
    return tt.inDays(diff);
}

export default function WordsTab({ lang, go, openSession, openWord, reloadKey, refresh }) {
    const tt = L[lang] || L.ru;
    const ig = interfaceTranslate[lang] || interfaceTranslate.ru || {};
    const topicNames = ig.topics || {};

    const [status, setStatus] = useState("all");
    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState("");
    const [sort, setSort] = useState("strength");
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
            sort,
        }).then((r) => {
            if (!on) return;
            setWords(Array.isArray(r?.words) ? r.words : []);
            setSel(new Set());
        }).catch(() => { if (on) setWords([]); })
            .finally(() => { if (on) { setLoading(false); setPhase("idle"); } });
        return () => { on = false; };
    }, [status, level, topic, dq, sort]);

    useEffect(() => load(), [load, reloadKey]);

    const counts = stats?.byStatus || {};
    const total = stats?.total;
    const chipCount = (k) => {
        if (k === "all") return total ?? Object.values(counts).reduce((a, b) => a + (b || 0), 0);
        return counts[k] ?? 0;
    };

    const topicOptions = useMemo(() => ([
        { value: "", label: tt.topicAll },
        ...TOPIC_KEYS.map((k) => ({ value: k, label: topicNames[k] || k })),
    ]), [tt, topicNames]);
    const levelOptions = useMemo(() => ([
        { value: "", label: tt.levelAll },
        ...LEVELS.map((l) => ({ value: l, label: l })),
    ]), [tt]);
    const sortOptions = useMemo(() => ([
        { value: "strength", label: tt.sortStrength },
        { value: "due", label: tt.sortDue },
        { value: "alpha", label: tt.sortAlpha },
    ]), [tt]);

    // --- Мутации ---
    const mutate = async (poolId, action) => {
        try { await api.learningStatus(poolId, action); } catch { /* */ }
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
                    <SearchBox value={q} onChange={setQ} placeholder={tt.searchPh}
                        phase={phase} debounceMs={300} />
                    <Dropdown value={topic} options={topicOptions} onChange={setTopic} placeholder={tt.topicAll} />
                    <Dropdown value={level} options={levelOptions} onChange={setLevel} placeholder={tt.levelAll} />
                    <Dropdown value={sort} options={sortOptions} onChange={setSort} placeholder={tt.sortStrength} />
                </div>
            </div>

            {/* Массовые действия */}
            {sel.size > 0 && (
                <div className="bulkbar">
                    <span className="bulkbar__count">{tt.selected} {sel.size}</span>
                    <button className="bulk-btn" disabled={busy} onClick={() => bulk("know")}>
                        <Icon n="check" /> {tt.markMastered}
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
                            onKnow={() => mutate(w.pool_id, "know")}
                            onReset={() => mutate(w.pool_id, "reset")}
                            primaryTr={primaryTr(w)} />
                    ))}
                </div>
            )}
        </>
    );
}

function WordRow({ w, lang, tt, t, selected, onToggle, onOpen, onKnow, onReset, primaryTr }) {
    const showKnow = w.status !== "mastered" && w.status !== "archived";
    const due = w.status === "review" ? dueText(w.due_at || w.due, tt) : null;

    const menuItems = [
        { key: "know", label: tt.knowMenu, icon: "check-circle", onClick: onKnow },
        { key: "open", label: tt.openCard, icon: "book", onClick: onOpen },
        { key: "speak", label: tt.speak, icon: "volume", onClick: () => speakText(w.no) },
        { key: "reset", label: tt.reset, icon: "rotate", onClick: onReset },
        { key: "archive", label: tt.toArchive, icon: "archive", onClick: onKnow, danger: true },
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
                    <StatusBadge status={w.status} lang={lang} />
                    <StrengthBar value={w.strength} status={w.status} sm showVal />
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
