import { useEffect, useState } from "react";
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

    const loadWord = (no, id) => {
        setView({ no, desc: "", descLoading: true, synonyms: null, topics: [], level: null, compound: null });
        setDiffWith(null); setFixOpen(false); setDelConfirm(false);
        setAskOpen(false);   // вопрос о слове сбрасывает своё поле сам (AskWordModal на open=false)
        const fresh = (v) => v && v.no === no; // игнорируем ответы устаревшей навигации
        const descP = id ? api.getWordDescription(id) : api.getPoolDescription(no);
        const synP = id ? api.getSynonyms(id, { lang }) : api.getPoolSynonyms(no, { lang });
        descP.then((r) => setView((v) => fresh(v) ? { ...v, desc: r.description?.[lang] || r.description?.en || "", descLoading: false } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, descLoading: false } : v));
        synP.then((r) => setView((v) => fresh(v) ? { ...v, synonyms: r.synonyms || [] } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, synonyms: [] } : v));
        api.getPoolMeta(no).then((m) => setView((v) => fresh(v) ? { ...v, topics: m?.topics || [], level: m?.level || null, forms: m?.forms || null, compound: m?.compound || null, hasTts: !!m?.hasTts, translate: m?.translate || null, part_of_speech: m?.part_of_speech || null, freqBand: m?.freqBand || null, freq: m?.freq ?? null, inLearning: !!m?.inLearning, pool_id: m?.pool_id ?? null } : v)).catch(() => {});
    };

    useEffect(() => {
        if (open && word) loadWord(word, wordId);
        if (!open) { setView(null); setDiffWith(null); setFixOpen(false); setEditOpen(false); setDelConfirm(false); }
    }, [open, word, wordId]); // eslint-disable-line

    // (back/свайп-закрытие теперь обеспечивает сам <Modal> через useHistoryClose)

    const inDict = !!view?.inLearning;   // слово в «Учёбе» пользователя
    const posKey = view?.part_of_speech;
    const posText = posKey ? posLabelFull(posKey, t) : "";

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
        <Modal open={open} onClose={onClose} title={titleNode} headerExtra={actionsNode}>
            {/* Само слово + озвучка — крупно, слитно; под ним перевод. Подтянуто к части речи сверху. */}
            <div className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flexWrap: "nowrap", minWidth: 0, marginTop: "calc(-1 * var(--sp-3))", marginBottom: view?.translate?.[lang]?.length ? "var(--sp-1)" : "var(--sp-4)" }}>
                <span style={{ fontSize: "var(--fs-24)", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{view?.no || word || ""}</span>
                <SpeakButton text={view?.no || word} hasTts={view?.hasTts}
                    ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
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

            {/* Составное слово (sammensetning): части кликабельны — навигация внутри модалки,
                как у синонимов; соединитель (fuge -s-/-e-) показываем между частями. */}
            {view?.compound && (
                <div style={{ marginTop: "var(--sp-5)" }}>
                    <div className="label row" style={{ gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-2)" }}>
                        <Icon n="layers" sm /> {t.compound || "Составное слово"}
                    </div>
                    <div className="row wrap" style={{ gap: "var(--sp-2)", alignItems: "center" }}>
                        {view.compound.parts.map((part, i) => (
                            <span key={i} className="row" style={{ gap: "var(--sp-2)", alignItems: "center" }}>
                                {i > 0 && (
                                    <span className="muted" style={{ fontSize: "var(--fs-13)" }}>
                                        {view.compound.fuge ? `+ ${view.compound.fuge} +` : "+"}
                                    </span>
                                )}
                                <span className="chip syn" style={{ background: "var(--surface-3)", color: "var(--ink)", cursor: "pointer" }}
                                    onClick={() => loadWord(part)} title={t.description}>
                                    <b>{part}</b>
                                </span>
                            </span>
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
                                <span className="syn__go" title={t.description} onClick={() => loadWord(s.word)}>
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
