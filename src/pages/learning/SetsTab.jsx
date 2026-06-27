// Вкладка «Наборы»: личные подборки слов. Слой курации над общим SRS (прогресс по слову
// общий). Можно создавать/переименовывать/удалять наборы, искать слова (попап с умным поиском
// Базы) и добавлять в набор, перемещать слова между наборами, включать набор в ежедневную учёбу
// (тоггл studying) и учить набор отдельным дриллом («Учить набор» → сессия с setId).
import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { ActionMenu } from "../../components/ui/Dropdown.jsx";
import { BtnSpinner } from "../../components/ui/Spinner.jsx";
import { WordCard } from "../../components/ui/WordCard.jsx";
import { pl } from "../../components/ui/plural.js";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { L } from "./SetsTab.i18n.js";
import { useIsMobile } from "../../hooks/useMediaQuery.js";
import PoolSearchPanel from "../../components/learning/PoolSearchPanel.jsx";
import GenerateSetModal from "../../components/sets/GenerateSetModal.jsx";
import PhotoImportModal from "../../components/sets/PhotoImportModal.jsx";


const MIN_UNLEARNED = 5;   // «Учить набор» доступно, когда в наборе ≥5 НЕвыученных слов
// Мобильная раскладка: высоты свёрнутых полосок и разделителя (для расчёта высот панелей + анимации)
const DIVIDER_H = 30, SEARCH_COLLAPSED = 58, SET_COLLAPSED = 58;

export default function SetsTab({ lang, openSession, openWord }) {
    const ll = L[lang] || L.ru;
    const t = interfaceTranslate[lang] || interfaceTranslate.en;

    const [sets, setSets] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [words, setWords] = useState([]);
    const [wLoading, setWLoading] = useState(false);
    const [prompt, setPrompt] = useState(null);   // { mode:'create'|'rename', value, id }
    const [genOpen, setGenOpen] = useState(false); // открыта модалка AI-генерации слов (см. GenerateSetModal)
    const [photoOpen, setPhotoOpen] = useState(false); // открыт импорт слов с фото/камеры (см. PhotoImportModal)
    const [confirmDel, setConfirmDel] = useState(null); // набор, ожидающий подтверждения удаления
    const [confirmReset, setConfirmReset] = useState(false); // подтверждение сброса прогресса набора
    const [busy, setBusy] = useState(false);
    const [hoverPid, setHoverPid] = useState(null); // наведённое слева слово → подсветка в наборе справа
    const isMobile = useIsMobile();
    const [mob, setMob] = useState("set"); // мобилка: какая панель активна — "set" | "search"
    const [mobH, setMobH] = useState(0);   // высота мобильной раскладки (под экран, без скролла страницы)
    const [dragH, setDragH] = useState(null); // высота панели поиска во время перетаскивания разделителя (null = не тянем)
    const mobRef = useRef(null);
    const dragRef = useRef(null);          // { startY, moved, lastH } — состояние текущего перетаскивания

    const active = sets.find((s) => s.id === activeId) || null;
    const inSet = useMemo(() => new Set(words.map((w) => w.pool_id)), [words]);

    const loadSets = useCallback(async (selectId) => {
        const list = await api.setsList().catch(() => []);
        setSets(list || []);
        setActiveId((cur) => {
            const want = selectId != null ? selectId : cur;
            if (want != null && (list || []).some((s) => s.id === want)) return want;
            return (list || [])[0]?.id ?? null;
        });
    }, []);

    const loadWords = useCallback(async (id) => {
        if (id == null) { setWords([]); return; }
        setWLoading(true);
        try { const r = await api.setWords(id); setWords(r?.words || []); }
        catch { setWords([]); }
        finally { setWLoading(false); }
    }, []);

    useEffect(() => { loadSets(); }, [loadSets]);
    useEffect(() => { loadWords(activeId); }, [activeId, loadWords]);

    // Мобилка: высота раскладки = от её позиции в документе до низа экрана (минус нижний таб-бар) →
    // страница не скроллится, скроллится только активная панель. Считаем по факту (без магических
    // чисел). document-offset (rect.top+scrollY), чтобы не зависеть от текущего скролла.
    useLayoutEffect(() => {
        if (!isMobile) { setMobH(0); return undefined; }
        // visualViewport точнее innerHeight в установленном приложении (standalone): не считает
        // площадь под системными панелями, которых на момент первого кадра ещё может «не быть».
        const vh = () => (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        const estimate = () => {
            const el = mobRef.current; if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;     // позиция панели в документе
            const bar = document.querySelector(".tabbar");                   // нижний таб-бар (рендерится в App)
            // авто-скрытый таб-бар (is-hidden) уехал за край → его место свободно, не вычитаем
            const barH = (bar && !bar.classList.contains("is-hidden") && getComputedStyle(bar).display !== "none")
                ? bar.getBoundingClientRect().height : 0;
            setMobH(Math.max(240, Math.floor(vh() - top - barH - 4)));
        };
        estimate();
        // Самокоррекция переполнения. КРИТИЧНО: вычитаем overflow ТОЛЬКО когда прошлая правка УЖЕ
        // применилась к DOM (scrollHeight изменился). Иначе один и тот же overflow вычитается каждый
        // кадр (setMobH асинхронный) и панель схлопывается в разы — в standalone, где вьюпорт «доезжает»
        // медленнее, это и давало обрезку до половины экрана.
        let tries = 0, raf = 0, lastSH = -1;
        const tick = () => {
            const sh = document.documentElement.scrollHeight;
            const over = Math.ceil(sh - vh());
            if (over > 0 && sh !== lastSH) { lastSH = sh; setMobH((h0) => Math.max(200, h0 - over)); }
            if (++tries < 8) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        // standalone-PWA: системные панели стабилизируются уже ПОСЛЕ первого кадра → пересчитать ещё раз
        const t1 = setTimeout(estimate, 120);
        const t2 = setTimeout(estimate, 400);
        window.addEventListener("resize", estimate);
        return () => {
            cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
            window.removeEventListener("resize", estimate);
        };
    }, [isMobile, activeId, sets.length]);

    // высоты панелей мобильной раскладки: активная тянется, свёрнутая = фикс-полоска (для анимации height).
    // dragH != null → идёт перетаскивание разделителя: высота поиска = dragH (живо, без анимации).
    const innerH = Math.max(0, mobH - DIVIDER_H);
    let searchH, setH;
    if (dragH != null) {
        searchH = dragH;
        setH = Math.max(0, innerH - dragH);
    } else {
        searchH = mob === "search" ? Math.max(120, innerH - SET_COLLAPSED) : SEARCH_COLLAPSED;
        setH = mob === "set" ? Math.max(120, innerH - SEARCH_COLLAPSED) : SET_COLLAPSED;
    }

    // Разделитель: тап = тоггл активной панели; перетаскивание = живой ресайз, но «прилипает» только
    // к 2 позициям (поиск-активен / набор-активен) — отпустили за серединой → туда и снапнулось.
    const dragDown = (e) => {
        dragRef.current = { startY: e.clientY, moved: false, lastH: null };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* нет pointer capture — ок */ }
    };
    const dragMove = (e) => {
        const d = dragRef.current; if (!d) return;
        if (!d.moved && Math.abs(e.clientY - d.startY) < 5) return;   // порог: отличаем тап от тяги
        d.moved = true;
        const cont = mobRef.current; if (!cont) return;
        const top = cont.getBoundingClientRect().top;
        const inner = Math.max(0, mobH - DIVIDER_H);
        let h = e.clientY - top - DIVIDER_H / 2;                       // высота верхней (поиск) панели под указателем
        h = Math.max(SEARCH_COLLAPSED, Math.min(inner - SET_COLLAPSED, h));   // обе панели не меньше свёрнутой полоски
        d.lastH = h; setDragH(h);
    };
    const dragUp = () => {
        const d = dragRef.current; dragRef.current = null;
        if (!d) return;
        if (!d.moved) { setMob((m) => (m === "set" ? "search" : "set")); return; }   // тап → тоггл
        const inner = Math.max(0, mobH - DIVIDER_H);
        setMob((d.lastH ?? 0) >= inner / 2 ? "search" : "set");        // ближайшая из 2 липких позиций
        setDragH(null);
    };

    const submitPrompt = async () => {
        const name = (prompt?.value || "").trim();
        if (!name || busy) return;
        setBusy(true);
        try {
            if (prompt.mode === "create") { const r = await api.setCreate(name); setPrompt(null); await loadSets(r?.id); }
            else { await api.setRename(prompt.id, name); setPrompt(null); await loadSets(); }
        } catch { setPrompt(null); } finally { setBusy(false); }
    };

    const delSet = async (id) => {
        setConfirmDel(null);
        await api.setDelete(id).catch(() => {});
        await loadSets();
    };

    const toggleStudying = async (s) => {
        setSets((prev) => prev.map((x) => x.id === s.id ? { ...x, studying: !x.studying } : x)); // оптимистично
        await api.setStudying(s.id, !s.studying).catch(() => loadSets());
    };

    const addToSet = async (poolId) => { await api.setAddWords(activeId, [poolId]); await loadWords(activeId); await loadSets(activeId); };
    const removeWord = async (poolId) => { await api.setRemoveWord(activeId, poolId).catch(() => {}); await loadWords(activeId); await loadSets(activeId); };
    const learned = useMemo(() => words.filter((w) => w.status === "mastered").length, [words]);
    const unlearned = words.length - learned;
    const allLearned = words.length > 0 && unlearned === 0;
    const canStudy = unlearned >= MIN_UNLEARNED;
    const studySet = () => { if (canStudy) openSession?.(null, "choice", { setId: active.id }); };
    const doReset = async () => {
        if (!activeId) return;
        setConfirmReset(false);
        await api.setReset(activeId).catch(() => {});
        await loadWords(activeId); await loadSets(activeId);
    };
    const reloadActive = () => { loadWords(activeId); loadSets(activeId); };  // после генерации/импорта

    // ---- готовые куски: используются и в десктоп-двухколонке, и в мобильной раскладке ----

    const searchFull = (
        <PoolSearchPanel lang={lang} setId={activeId} inSet={inSet} onPick={addToSet} onRemove={removeWord}
            openWord={openWord} onHover={(w) => setHoverPid(w?.pool_id ?? null)} t={t} />
    );
    const searchCompact = (
        <PoolSearchPanel lang={lang} setId={activeId} inSet={inSet} onPick={addToSet} onRemove={removeWord}
            openWord={openWord} compact t={t} />
    );
    const searchHead = (
        <div className="sets-pane__head">
            <span className="sets-pane__title"><Icon n="search" sm /> <b>{ll.searchWords}</b></span>
        </div>
    );
    const setHead = active && (
        <>
            <div className="sets-pane__head">
                <label className="sets-pane__study" title={ll.studyingHint}>
                    <span className={"toggle" + (active.studying ? " is-on" : "")} onClick={() => toggleStudying(active)} />
                    <span className="sets-pane__study-l">{ll.studyingShort}</span>
                </label>
                <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center", justifyContent: "flex-end" }}>
                    {/* все действия набора — под одним троеточием */}
                    <ActionMenu icon="more" align="right" items={[
                        allLearned
                            ? { key: "reset", label: ll.resetRamp, icon: "repeat", onClick: () => setConfirmReset(true) }
                            : { key: "study", label: ll.studySet, icon: "play", disabled: !canStudy, onClick: studySet },
                        { key: "gen", label: ll.generate, icon: "sparkles", onClick: () => setGenOpen(true) },
                        { key: "photo", label: ll.importPhoto, icon: "camera", onClick: () => setPhotoOpen(true) },
                        { key: "rename", label: ll.rename, icon: "edit", onClick: () => setPrompt({ mode: "rename", value: active.name, id: active.id }) },
                        { key: "del", label: ll.del, icon: "trash", danger: true, onClick: () => setConfirmDel(active) },
                    ]} />
                </span>
            </div>
            {/* полоска с названием — заодно прогресс-бар (выученная доля светлее);
                справа подпись в 2 строки мелким шрифтом: «N слов» / «выучено: N» */}
            <div className="sets-pane__nameline">
                {active.count > 0 && (
                    <span className="sets-pane__fill" style={{ width: Math.round(learned / active.count * 100) + "%" }} />
                )}
                <b className="sets-pane__name">{active.name}</b>
                <span className="sets-pane__stat">
                    <span>{active.count} {pl(lang, active.count, "word")}</span>
                    <span className="muted">{ll.learned}: {learned}</span>
                </span>
            </div>
        </>
    );
    const setBody = (
        <div className="sets-pane__body">
            {words.length === 0 && !wLoading ? (
                <div className="empty empty--mini">
                    <div className="empty__ic"><Icon n="sparkles" lg /></div>
                    <div className="empty__t">{ll.noWords}</div>
                    <div className="empty__d">{ll.noWordsHint}</div>
                    <button className="btn btn--sm btn--gen" style={{ marginTop: "var(--sp-3)" }} onClick={() => setGenOpen(true)}>
                        <Icon n="sparkles" /> {ll.generate}
                    </button>
                </div>
            ) : (
                <div className="wordlist" style={wLoading ? { opacity: .5 } : undefined}>
                    {words.map((w) => (
                        <WordCard key={w.pool_id} word={w} lang={lang} t={t} flat status={w.status} ramp={w.ramp}
                            added highlight={hoverPid != null && w.pool_id === hoverPid}
                            onToggle={() => removeWord(w.pool_id)}
                            onInfo={openWord ? (() => openWord(w.norwegian)) : undefined} />
                    ))}
                </div>
            )}
        </div>
    );
    const setStrip = (
        <div className="setstrip">
            {words.length === 0
                ? <span className="muted" style={{ padding: "6px 10px" }}>{ll.noWords}</span>
                : words.map((w) => (
                    <span className="setchip" key={w.pool_id} onClick={() => setMob("set")}>
                        <span className="setchip__w">{w.norwegian}</span>
                        <button className="setchip__x" aria-label="×" onClick={(e) => { e.stopPropagation(); removeWord(w.pool_id); }}>
                            <Icon n="x" sm />
                        </button>
                    </span>
                ))}
        </div>
    );

    return (
        <div className="sets-tab">
            <div className="page-head" style={{ marginBottom: "var(--sp-3)" }}>
                <div>
                    <p className="muted" style={{ margin: 0 }}>{ll.desc}</p>
                </div>
            </div>

            {/* строка чипов-наборов + кнопка «+» нового набора в том же ряду */}
            {sets.length > 0 && (
                <div className="chiprow chiprow--scroll" style={{ marginBottom: "var(--sp-4)" }}>
                    {sets.map((s) => (
                        <button key={s.id} className={"fchip" + (s.id === activeId ? " is-on" : "")} onClick={() => setActiveId(s.id)}>
                            {s.studying && <Icon n="zap" sm />} {s.name} <span className="fchip__count">{s.count}</span>
                        </button>
                    ))}
                    <button className="fchip fchip--add" aria-label={ll.newSet} title={ll.newSet}
                        onClick={() => setPrompt({ mode: "create", value: "" })}>
                        <Icon n="plus" sm />
                    </button>
                </div>
            )}

            {/* пусто: нет наборов */}
            {sets.length === 0 ? (
                <div className="empty">
                    <div className="empty__ic"><Icon n="layers" lg /></div>
                    <div className="empty__t">{ll.noSets}</div>
                    <div className="empty__d">{ll.noSetsHint}</div>
                    <button className="btn btn--accent" style={{ marginTop: "var(--sp-4)" }} onClick={() => setPrompt({ mode: "create", value: "" })}>
                        <Icon n="plus" sm /> {ll.newSet}
                    </button>
                </div>
            ) : active && (
                isMobile ? (
                    /* Мобилка: активна одна панель, вторая свёрнута в полоску; всё в одну высоту экрана */
                    <div className={"sets-mob" + (dragH != null ? " is-dragging" : "")} ref={mobRef} style={mobH ? { height: mobH } : undefined}>
                        {/* ВЕРХ: поиск — компактный (активен набор) или полный (активен поиск) */}
                        <section className={"sets-mpane" + (mob === "search" ? " is-active" : "")} style={{ height: searchH }}>
                            {mob === "search" ? searchFull : searchCompact}
                        </section>
                        {/* разделитель: тап по строке = тоггл; тяга за грип = живой ресайз со снапом
                            к 2 позициям. Слева «Поиск слов» ↑, по центру грип (12 точек), справа «коллекция» ↓ */}
                        <button className="sets-divider" onPointerDown={dragDown} onPointerMove={dragMove}
                            onPointerUp={dragUp} onPointerCancel={dragUp}
                            aria-label={mob === "set" ? ll.openSearch : ll.openSet}>
                            <span className={"sets-divider__side" + (mob === "search" ? " is-active" : "")}>
                                <Icon n="chevron-up" sm /> <span className="sets-divider__txt">{ll.searchWords}</span>
                            </span>
                            <span className="sets-divider__grip" aria-hidden="true">
                                {Array.from({ length: 12 }).map((_, i) => <i key={i} />)}
                            </span>
                            <span className={"sets-divider__side sets-divider__side--r" + (mob === "set" ? " is-active" : "")}>
                                <span className="sets-divider__txt">{ll.collection}</span> <Icon n="chevron-down" sm />
                            </span>
                        </button>
                        {/* НИЗ: набор — полный (активен) или полоска чипов (свёрнут) */}
                        <section className={"sets-mpane" + (mob === "set" ? " is-active" : "")} style={{ height: setH }}>
                            {mob === "set" ? <>{setHead}{setBody}</> : setStrip}
                        </section>
                    </div>
                ) : (
                    /* ПК: две колонки рядом — слева поиск по Базе, справа активный набор */
                    <div className="sets-cols">
                        <section className="sets-pane">{searchHead}{searchFull}</section>
                        <section className="sets-pane">{setHead}{setBody}</section>
                    </div>
                )
            )}

            {/* создать / переименовать набор */}
            <Modal open={!!prompt} onClose={() => setPrompt(null)} title={prompt?.mode === "rename" ? ll.rename : ll.newSet} maxWidth={420}>
                <input className="input" autoFocus value={prompt?.value || ""} placeholder={ll.namePh} maxLength={20}
                    onChange={(e) => setPrompt((p) => ({ ...p, value: e.target.value.slice(0, 20) }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitPrompt(); }} style={{ width: "100%" }} />
                <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }} disabled={busy || !(prompt?.value || "").trim()} onClick={submitPrompt}>
                    {busy ? <BtnSpinner /> : <Icon n="check" sm />} {ll.save}
                </button>
            </Modal>

            {/* генерация слов в набор: тема + уровень + количество (5–20) */}
            <GenerateSetModal open={genOpen} setId={activeId} lang={lang} ll={ll} defaultTopic={active?.name}
                onClose={() => setGenOpen(false)} onGenerated={reloadActive} />

            {/* подтверждение удаления набора (модалка вместо системного confirm) */}
            <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={ll.del} maxWidth={400}>
                <p style={{ margin: "0 0 var(--sp-4)" }}>{ll.delConfirm}</p>
                <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-end" }}>
                    <button className="btn btn--ghost" onClick={() => setConfirmDel(null)}>{ll.cancel}</button>
                    <button className="btn btn--danger" onClick={() => delSet(confirmDel.id)}>
                        <Icon n="trash" sm /> {ll.del}
                    </button>
                </div>
            </Modal>

            {/* подтверждение сброса прогресса набора (рампа выученных слов → звуковое задание) */}
            <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={ll.resetRamp} maxWidth={400}>
                <p style={{ margin: "0 0 var(--sp-4)" }}>{ll.resetConfirm.replace("{n}", String(learned))}</p>
                <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-end" }}>
                    <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>{ll.cancel}</button>
                    <button className="btn btn--accent" onClick={doReset}>
                        <Icon n="repeat" sm /> {ll.resetRamp}
                    </button>
                </div>
            </Modal>

            {/* импорт слов с фото/камеры — самодостаточный поток (выбор источника → OCR → правка) */}
            <PhotoImportModal open={photoOpen} setId={activeId} lang={lang} ll={ll}
                onClose={() => setPhotoOpen(false)} onImported={reloadActive} />
        </div>
    );
}
