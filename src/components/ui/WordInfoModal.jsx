import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { SpeakButton } from "./SpeakButton.jsx";
import { speakText } from "./tts.js";
import { posFormsRows, posLabelFull, posMeta } from "./pos.js";
import { freqLabel, freqCls } from "./freq.js";
import { ActionMenu } from "./Dropdown.jsx";
import { BtnSpinner, Dots } from "./Spinner.jsx";
import AskWordModal from "./AskWordModal.jsx";
import FixDescriptionModal from "./FixDescriptionModal.jsx";
import EditWordModal from "./EditWordModal.jsx";
import WordDiff from "./WordDiff.jsx";
import { useWordsStore } from "../../store/wordStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";

// Описание слова + похожие слова (кликабельные — навигация по пулу) +
// кнопка добавить/удалить просматриваемое слово в текущий словарь.
// wordId передаётся только для исходного слова словаря — тогда описание
// тянется по id (генерится по требованию). Синонимы — всегда слова из пула.
export const WordInfoModal = ({ open, word, wordId, lang, t, onClose }) => {
    const addToLearning = useWordsStore((s) => s.addToLearning);
    const removeFromLearning = useWordsStore((s) => s.removeFromLearning);
    const loadData = useWordsStore((s) => s.loadData);
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);

    const [view, setView] = useState(null); // { no, desc, descLoading, synonyms }
    const [dictBusy, setDictBusy] = useState(false);
    const [diffWith, setDiffWith] = useState(null); // с каким близким словом сравниваем (см. WordDiff)
    const [fixOpen, setFixOpen] = useState(false); // открыта форма исправления описания (см. FixDescriptionModal)
    const [editOpen, setEditOpen] = useState(false); // открыт модал правки слова и переводов (см. EditWordModal)
    const [delConfirm, setDelConfirm] = useState(false); // подтверждение удаления слова из БД (админ)
    const [delBusy, setDelBusy] = useState(false);
    const [askOpen, setAskOpen] = useState(false);   // открыт вопрос о слове нейросети (см. AskWordModal)

    // Стек навигации ВНУТРИ карточки: клик по части композита / синониму открывает новую
    // карточку и кладёт текущую в стек; свайп/«Назад» возвращает на предыдущую, а закрывает
    // только на корневой. Историю ведём сами (Modal с manageHistory={false}): в state каждой
    // записи кладём её глубину — так лишний popstate от закрытия саб-модалки (правка/вопрос,
    // у них своя history-запись) не путается с нашим «назад» (сравниваем глубину приземления).
    const [stack, setStack] = useState([]);            // [{ no, id }] предыдущих карточек (для кнопки «назад»)
    const stackRef = useRef([]); stackRef.current = stack;
    const curRef = useRef({ no: null, id: undefined }); // текущая карточка — что кладём в стек при переходе
    const depthRef = useRef(0);                        // наша глубина в истории (1 = корень)
    const onCloseRef = useRef(onClose); onCloseRef.current = onClose;

    // Мини-попап части составного слова: клик по части в заголовке → перевод + «открыть карточку».
    const [partPop, setPartPop] = useState(null);   // { lemma, left, translate, loading, generating }
    const openPart = (lemma, e) => {
        const el = e?.currentTarget;
        const parentW = el?.offsetParent?.clientWidth || 0;
        const left = Math.max(0, Math.min(el?.offsetLeft ?? 0, Math.max(0, parentW - 224)));
        setPartPop({ lemma, left, translate: null, loading: true, generating: false });
        const upd = (patch) => setPartPop((p) => (p && p.lemma === lemma ? { ...p, ...patch } : p));
        const trOf = (m) => (m?.translate?.[lang] || []).slice(0, 3).join(", ");
        api.getPoolMeta(lemma).then((m) => {
            if (m && m.pool_id) { upd({ loading: false, translate: trOf(m) }); return; }
            // части нет в базе → генерируем (перевод/формы), показываем индикатор генерации
            upd({ loading: false, generating: true });
            api.generateWord(lemma)
                .then((g) => upd({ generating: false, translate: trOf(g) }))
                .catch(() => upd({ generating: false }));
        }).catch(() => upd({ loading: false }));
    };

    const [revoiceBusy, setRevoiceBusy] = useState(false);
    const revoice = async () => {
        if (!view || revoiceBusy) return;
        setRevoiceBusy(true);
        try {
            await api.revoiceWord(view.no);
            // обновляем кэш браузера (аудио кэшируется на 7 дней) и проигрываем заново
            try { await fetch(api.ttsUrl(view.no), { cache: "reload" }); } catch { /* no-op */ }
            speakText(view.no).catch(() => {});
        } catch { /* не вышло — тихо */ }
        setRevoiceBusy(false);
    };

    const doDelete = async () => {
        if (!view || delBusy) return;
        setDelBusy(true);
        try {
            await api.adminDeletePoolWord(view.no);
            loadData?.(true);
            onClose?.();
        } catch { /* не вышло — оставляем окно */ }
        setDelBusy(false);
    };

    // одобренная правка слова из EditWordModal: обновить view (мерж переводов как раньше) + перезагрузить
    const onWordSaved = ({ no, translate, edited }) => {
        setView((v) => (v ? { ...v, no, translate: translate || { ...(v.translate || {}), ...edited } } : v));
        loadData?.(true);
    };


    // Разница между текущим словом и близким по смыслу (по клику на «?»). Повторный клик — закрыть.
    // тоггл сравнения с близким словом: повторный клик по тому же — закрыть (загрузку ведёт WordDiff)
    const toggleDiff = (other) => setDiffWith((cur) => (cur === other ? null : other));

    const loadWord = (no, id, triedGen = false) => {
        curRef.current = { no, id };
        setPartPop(null);
        setView({ no, desc: "", descLoading: true, synonyms: null, topics: [], level: null, compound: null, generating: false });
        setDiffWith(null); setFixOpen(false); setDelConfirm(false);
        setAskOpen(false);   // вопрос о слове сбрасывает своё поле сам (AskWordModal на open=false)
        const fresh = (v) => v && v.no === no; // игнорируем ответы устаревшей навигации
        const descP = id ? api.getWordDescription(id) : api.getPoolDescription(no);
        const synP = id ? api.getSynonyms(id, { lang }) : api.getPoolSynonyms(no, { lang });
        descP.then((r) => setView((v) => fresh(v) ? { ...v, desc: r.description?.[lang] || r.description?.en || "", descLoading: false } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, descLoading: false } : v));
        synP.then((r) => setView((v) => fresh(v) ? { ...v, synonyms: r.synonyms || [] } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, synonyms: [] } : v));
        api.getPoolMeta(no, id).then((m) => {
            setView((v) => fresh(v) ? { ...v, topics: m?.topics || [], level: m?.level || null, forms: m?.forms || null, compound: m?.compound || null, hasTts: !!m?.hasTts, translate: m?.translate || null, part_of_speech: m?.part_of_speech || null, freqBand: m?.freqBand || null, freq: m?.freq ?? null, inLearning: !!m?.inLearning, pool_id: m?.pool_id ?? null } : v);
            // карточки нет в базе (напр. часть композита) → генерируем слово и перезагружаем.
            // triedGen страхует от петли, если генерация так и не создала запись.
            if (!m?.pool_id && !triedGen) {
                setView((v) => fresh(v) ? { ...v, generating: true } : v);
                api.generateWord(no)
                    .then(() => { if (curRef.current.no === no) loadWord(no, id, true); })
                    .catch(() => setView((v) => fresh(v) ? { ...v, generating: false } : v));
            }
        }).catch(() => {});
    };

    // Переход по клику (часть композита / синоним): текущую карточку — в стек и в историю,
    // затем грузим новую. pushState добавляет запись, которую «Назад»/свайп потом снимет.
    const navTo = (no, id) => {
        if (!no || no === curRef.current.no) return;
        const prev = curRef.current;   // ЗАХВАТ до loadWord: иначе updater setStack прочитает уже НОВОЕ
        setStack((s) => [...s, prev]); // слово (loadWord перезаписывает curRef синхронно) → «назад» вернул бы ту же карточку
        depthRef.current += 1;
        if (typeof window !== "undefined") window.history.pushState({ __wim: depthRef.current }, "");
        loadWord(no, id);
    };
    // Назад по стеку карточек (единственный вызывающий — onPop истории, чтобы учёт записей был один).
    const goBack = () => {
        const s = stackRef.current;
        if (!s.length) return;
        const prev = s[s.length - 1];
        setStack(s.slice(0, -1));
        loadWord(prev.no, prev.id);
    };

    useEffect(() => {
        if (open && word) { setStack([]); loadWord(word, wordId); }
        if (!open) { setView(null); setStack([]); setPartPop(null); setDiffWith(null); setFixOpen(false); setEditOpen(false); setDelConfirm(false); }
    }, [open, word, wordId]); // eslint-disable-line

    // Закрыть мини-попап части по клику вне него.
    useEffect(() => {
        if (!partPop) return;
        const onDown = (e) => { if (!e.target.closest?.(".cw-pop") && !e.target.closest?.(".cw-part")) setPartPop(null); };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [partPop]);

    // История карточки: 1 запись на корень + по одной на каждый переход. «Назад»/свайп (popstate)
    // сравнивает глубину приземления с нашей: меньше — возвращаемся на предыдущую карточку;
    // ноль — выходим из модалки; равна (снялась саб-модалка) — ничего не делаем.
    useEffect(() => {
        if (!open || typeof window === "undefined") return;
        depthRef.current = 1;
        window.history.pushState({ __wim: 1 }, "");
        const onPop = () => {
            const st = window.history.state;
            const j = st && typeof st.__wim === "number" ? st.__wim : 0;
            if (j >= depthRef.current) return;          // приземлились на нашу текущую (саб-модалка) — не наш back
            if (j > 0) { depthRef.current = j; goBack(); }   // назад к предыдущей карточке
            else { depthRef.current = 0; onCloseRef.current?.(); }  // вышли из модалки
        };
        window.addEventListener("popstate", onPop);
        return () => {
            window.removeEventListener("popstate", onPop);
            // закрыли не «Назад» (крестик/фон) → снимаем все свои записи истории
            if (depthRef.current > 0) { window.history.go(-depthRef.current); depthRef.current = 0; }
        };
    }, [open]); // eslint-disable-line

    // (back/свайп-закрытие теперь обеспечивает сам <Modal> через useHistoryClose)

    const inDict = !!view?.inLearning;   // слово в «Учёбе» пользователя
    const posKey = view?.part_of_speech;
    const posText = posKey ? posLabelFull(posKey, t) : "";

    // Разбор составного слова для ЗАГОЛОВКА: режем само слово на части по forledd/fuge/etterledd
    // (только если они реально складываются в слово — иначе санди/несовпадение, показываем целиком).
    // Части кликабельны (пунктир снизу), соединитель (fuge) приглушён — читается как одно слово.
    const cwSegs = (() => {
        const cw = view?.compound;
        const w = view?.no || "";
        if (!cw || !w) return null;
        if ((cw.forledd + (cw.fuge || "") + cw.etterledd).toLowerCase() !== w.toLowerCase()) return null;
        const cut1 = cw.forledd.length, cut2 = cut1 + (cw.fuge || "").length;
        const segs = [{ text: w.slice(0, cut1), lemma: cw.forledd }];
        if (cut2 > cut1) segs.push({ text: w.slice(cut1, cut2) });   // соединитель (fuge) — не кликабельный
        segs.push({ text: w.slice(cut2), lemma: cw.etterledd });
        return segs;
    })();

    // Шапка слова для под-модалок: слово + озвучка + часть речи + перевод (как в основной модалке)
    const wordRefNode = view ? (
        <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap", marginBottom: "var(--sp-1)" }}>
            <b style={{ fontSize: "var(--fs-18)" }}>{view.no}</b>
            <SpeakButton text={view.no} hasTts={view.hasTts} ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
            {posText && <span className={`chip pos ${posMeta(posKey).cls}`}>{posText}</span>}
            {view.translate?.[lang]?.length > 0 && (
                <span className="muted" style={{ fontSize: "var(--fs-13)" }}>{view.translate[lang].join(", ")}</span>
            )}
        </div>
    ) : null;

    // Добавить/убрать слово из «Учёбы» (оптимистично переключаем флаг).
    const toggleDict = async () => {
        if (!view || dictBusy || !view.pool_id) return;
        const next = !inDict;
        const pid = view.pool_id;
        setDictBusy(true);
        setView((v) => (v ? { ...v, inLearning: next } : v));
        try {
            if (next) await addToLearning(pid);
            else await removeFromLearning(pid);
            const phrase = next ? t.addedToLearning : t.removedFromLearning;
            useSystemStore.getState().showToast(`«${view.no}» ${phrase}`, next ? "success" : "warning");
        } catch { setView((v) => (v ? { ...v, inLearning: !next } : v)); }
        setDictBusy(false);
    };

    const titleNode = (
        posText
            ? <span className={`chip pos ${posMeta(posKey).cls}`} style={{ fontWeight: 600 }}>{posText}</span>
            : <span />
    );
    // Кнопка «назад» по стеку карточек — абсолютно на модалке (зеркально крестику, см. .modalback),
    // видна только когда есть куда возвращаться. Клик = history.back → onPop → goBack.
    const backNode = stack.length > 0 ? (
        <button className="iconbtn modalback" onClick={() => window.history.back()}
            aria-label={t.back || "Назад"} title={t.back || "Назад"}><Icon n="chevron-left" /></button>
    ) : null;

    // Меню «Действия» — в шапке модалки справа, у крестика
    const actionsNode = view ? (
        <ActionMenu label={t.actions || "Действия"} align="right" iconRight iconLg items={[
            { key: "dict", label: inDict ? (t.removeFromDict || "Из словаря") : (t.addToDict || "В словарь"),
              icon: inDict ? "trash" : "plus", danger: inDict, disabled: dictBusy, busy: dictBusy, onClick: toggleDict },
            { key: "edit", label: t.editWord || "Изменить слово", icon: "edit", onClick: () => setEditOpen(true) },
            { key: "ask", label: t.askWord || "Спросить о слове", icon: "info", onClick: () => { setAskOpen(true); setFixOpen(false); } },
            { key: "revoice", label: t.revoice || "Переозвучить", icon: "volume", busy: revoiceBusy, disabled: revoiceBusy, onClick: revoice },
            (!view.descLoading ? { key: "fix", label: t.fixDesc, icon: "edit", onClick: () => { setFixOpen(true); setAskOpen(false); } } : null),
            (isAdmin ? { key: "del", label: t.deleteFromBase || "Удалить из базы", icon: "trash", danger: true, onClick: () => setDelConfirm(true) } : null),
        ]} />
    ) : null;

    return (
        <>
        <Modal open={open} onClose={onClose} title={titleNode} headerExtra={actionsNode} headerLeft={backNode} manageHistory={false}>
            {/* Само слово + озвучка — крупно, слитно; под ним перевод. Подтянуто к части речи сверху. */}
            <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flexWrap: "nowrap", minWidth: 0, position: "relative", marginTop: "calc(-1 * var(--sp-3))", marginBottom: view?.translate?.[lang]?.length ? "var(--sp-1)" : "var(--sp-4)" }}>
                <span style={{ fontSize: "var(--fs-24)", fontWeight: 800, overflow: cwSegs ? "visible" : "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, paddingTop: cwSegs ? "0.5em" : 0 }}>
                    {cwSegs
                        ? cwSegs.map((s, i) => s.lemma ? (
                            // часть слова: НАД ней — полоса с засечками (⎴), сама кликабельна; слово читается как есть
                            <span key={i} className="cw-part" onClick={(e) => openPart(s.lemma, e)}
                                title={t.openCard || "Открыть карточку"}>{s.text}</span>
                        ) : (
                            // соединительная морфема (fuge) — обычным текстом, без полосы
                            <span key={i}>{s.text}</span>
                        ))
                        : (view?.no || word || "")}
                </span>
                <SpeakButton text={view?.no || word} hasTts={view?.hasTts}
                    ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                {partPop && (
                    <div className="cw-pop card" style={{ position: "absolute", top: "calc(100% + 4px)", left: partPop.left, zIndex: 20,
                        padding: "var(--sp-3)", boxShadow: "var(--shadow-lg)", borderRadius: "var(--r-md)", minWidth: 150, maxWidth: 224 }}>
                        <div className="row" style={{ gap: "var(--sp-2)", alignItems: "baseline", justifyContent: "space-between" }}>
                            <b style={{ fontSize: "var(--fs-15)" }}>{partPop.lemma}</b>
                            <span className="muted" style={{ fontSize: "var(--fs-13)", textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {partPop.loading ? <Dots />
                                    : partPop.generating ? <span className="row" style={{ gap: 4, alignItems: "center", justifyContent: "flex-end" }}><BtnSpinner /> {t.genWord || "Генерирую…"}</span>
                                    : (partPop.translate || "—")}
                            </span>
                        </div>
                        <button className="btn btn--outline btn--sm" style={{ marginTop: "var(--sp-2)", width: "100%" }}
                            onClick={() => navTo(partPop.lemma)}>
                            <Icon n="arrow-right" sm /> {t.openCard || "Открыть карточку"}
                        </button>
                    </div>
                )}
            </div>
            {view?.translate?.[lang]?.length > 0 && (
                <p style={{ margin: "0 0 var(--sp-4)", fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>
                    {view.translate[lang].join(", ")}
                </p>
            )}
            {delConfirm && (
                <div className="row wrap" style={{ gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-3)" }}>
                    <span className="muted" style={{ fontSize: "var(--fs-13)" }}>{t.deleteFromBaseConfirm || "Удалить из базы для всех?"}</span>
                    <button className="btn btn--danger-ghost btn--sm" disabled={delBusy} onClick={doDelete}>{delBusy ? <BtnSpinner /> : t.yes}</button>
                    <button className="btn btn--ghost btn--sm" disabled={delBusy} onClick={() => setDelConfirm(false)}>{t.no}</button>
                </div>
            )}
            {(view?.level || view?.freqBand || view?.topics?.length > 0) && (
                <div className="row wrap" style={{ gap: "6px", marginBottom: "var(--sp-3)" }}>
                    {view.level && <span className="chip lvl">{view.level}</span>}
                    {view.freqBand && (
                        <span className={`chip freq ${freqCls(view.freqBand)}`} title={t.freqHint || "частота употребления"}>
                            <span className="dot" /> {freqLabel(view.freqBand, lang)}
                        </span>
                    )}
                    {(view.topics || []).map((k) => (
                        <span key={k} className="chip" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                            {t.topics?.[k] || k}
                        </span>
                    ))}
                </div>
            )}
            {view?.generating && (
                <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center", color: "var(--ember-600)", marginBottom: "var(--sp-3)" }}>
                    <BtnSpinner /> <span style={{ fontSize: "var(--fs-14)" }}>{t.genWord || "Генерирую слово…"}</span>
                </div>
            )}
            {!view || view.descLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }} aria-busy="true">
                    <span className="skel skel--line" style={{ width: "100%" }} />
                    <span className="skel skel--line" style={{ width: "94%" }} />
                    <span className="skel skel--line" style={{ width: "78%" }} />
                </div>
            ) : (
                <p className="muted" style={{ margin: 0, lineHeight: "var(--lh-normal)" }}>
                    {view.desc || t.descUnavailable}
                </p>
            )}


            {view?.forms && posFormsRows(view.no, view.forms, lang).length > 0 && (
                <div style={{ marginTop: "var(--sp-5)" }}>
                    <div className="label row" style={{ gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-2)" }}>
                        <Icon n="type" sm /> {t.grammForms || "Грамматические формы"}
                    </div>
                    <div className="forms-tbl">
                        {posFormsRows(view.no, view.forms, lang).map(({ label, value }) => (
                            <div key={label} className="forms-tbl__row">
                                <span className="forms-tbl__label">{label}</span>
                                <span className="forms-tbl__val">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view?.synonyms === null && !view?.descLoading && (
                <div className="row" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-5)", color: "var(--ink-3)" }}>
                    <Dots /> <span style={{ fontSize: "var(--fs-14)" }}>{t.similar}</span>
                </div>
            )}
            {view?.synonyms?.length > 0 && (
                <div style={{ marginTop: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-2)" }}>{t.similar}</div>
                    <div className="row wrap" style={{ gap: "var(--sp-2)" }}>
                        {view.synonyms.map((s) => (
                            <span key={s.word} className="chip syn" style={{ background: "var(--surface-3)", color: "var(--ink)" }}>
                                <span className="syn__go" title={t.description} onClick={() => navTo(s.word)}>
                                    <b>{s.word}</b>{s.translate?.[0] ? ` — ${s.translate[0]}` : ""}
                                </span>
                                <button
                                    className={`syn__diff${diffWith === s.word ? " is-on" : ""}`}
                                    title={t.difference} aria-label={t.difference}
                                    onClick={() => toggleDiff(s.word)}
                                >
                                    <Icon n="compare" sm />
                                </button>
                            </span>
                        ))}
                    </div>

                    {diffWith && <WordDiff key={diffWith} word={view.no} other={diffWith} lang={lang} t={t} />}
                </div>
            )}
        </Modal>

        {/* Отдельный модал «Исправить описание» (самодостаточный) */}
        <FixDescriptionModal open={fixOpen} no={view?.no} lang={lang} t={t} header={wordRefNode}
            onClose={() => setFixOpen(false)}
            onFixed={(no, nd) => setView((v) => (v && v.no === no ? { ...v, desc: nd } : v))} />

        {/* Отдельный модал «Спросить о слове» (самодостаточный, view-независимый) */}
        <AskWordModal open={askOpen} no={view?.no} lang={lang} t={t} header={wordRefNode}
            onClose={() => setAskOpen(false)} />

        {/* Отдельный модал правки слова и переводов (самодостаточный, AI-ревью внутри) */}
        <EditWordModal open={editOpen} view={view} lang={lang} t={t} header={wordRefNode}
            onClose={() => setEditOpen(false)} onSaved={onWordSaved} />
        </>
    );
};

export default WordInfoModal;
