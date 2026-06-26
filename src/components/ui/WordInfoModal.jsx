import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { SpeakButton } from "./SpeakButton.jsx";
import { speakText } from "./tts.js";
import { posFormsRows, posLabelFull, posMeta } from "./pos.js";
import { freqLabel, freqCls } from "./freq.js";
import { ActionMenu } from "./Dropdown.jsx";
import { BtnSpinner, Dots } from "./Spinner.jsx";
import { useWordsStore } from "../../store/wordStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useHistoryClose } from "../tools/useHistoryClose.js";
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
    const [diff, setDiff] = useState(null); // { with, loading, data } — разбор разницы с близким словом
    const [fixOpen, setFixOpen] = useState(false); // форма исправления описания
    const [fixHint, setFixHint] = useState("");
    const [fixBusy, setFixBusy] = useState(false);
    const [dfixOpen, setDfixOpen] = useState(false); // форма исправления разницы
    const [dfixHint, setDfixHint] = useState("");
    const [dfixBusy, setDfixBusy] = useState(false);
    const [editOpen, setEditOpen] = useState(false); // модал правки слова и переводов
    const [edit, setEdit] = useState(null);          // { no, ru, ukr, en, pl, lt } — строки через запятую
    const [editBusy, setEditBusy] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false); // раскрыть остальные языки
    const [review, setReview] = useState(null);      // вердикт ревью: { approved, reason }
    const [hint, setHint] = useState("");            // подсказка пользователя (часть речи и т.п.)
    const [delConfirm, setDelConfirm] = useState(false); // подтверждение удаления слова из БД (админ)
    const [delBusy, setDelBusy] = useState(false);
    const [askOpen, setAskOpen] = useState(false);   // вопрос о слове нейросети
    const [askQ, setAskQ] = useState("");
    const [askA, setAskA] = useState("");
    const [askBusy, setAskBusy] = useState(false);

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

    const submitAsk = async () => {
        const q = askQ.trim();
        if (!q || askBusy || !view) return;
        setAskBusy(true); setAskA("");
        try {
            const r = await api.askWord(view.no, q, lang);
            setAskA(r?.answer || t.descUnavailable || "—");
        } catch { setAskA(t.unexpectedError || "—"); }
        setAskBusy(false);
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

    const LANG_LABEL = { ru: t.russian, ukr: t.ukrainian, en: t.english, pl: t.polish, lt: t.lithuanian };

    const openEdit = () => {
        const tr = view?.translate || {};
        const join = (a) => (Array.isArray(a) ? a.join(", ") : "");
        setEdit({
            no: join(tr.no) || view?.no || "",
            ru: join(tr.ru), ukr: join(tr.ukr), en: join(tr.en), pl: join(tr.pl), lt: join(tr.lt),
        });
        setMoreOpen(false); setReview(null); setHint("");
        setEditOpen(true);
    };

    const saveEdit = async () => {
        if (editBusy || !edit || !view) return;
        const parse = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
        const translate = {};
        for (const k of ["no", "ru", "ukr", "en", "pl", "lt"]) {
            const v = parse(edit[k]);
            if (v.length) translate[k] = v;
        }
        setEditBusy(true); setReview(null);
        try {
            const r = await api.editPoolWord(view.no, translate, lang, hint);   // ревью + правка общего пула
            setReview({ approved: !!r.approved, reason: r.reason || "" });
            if (r.approved) {  // одобрено: нейросеть вернула стандартизованное слово — берём его
                const newNo = r.no || translate.no?.[0] || view.no;
                setView((v) => (v ? { ...v, no: newNo, translate: r.translate || { ...(v.translate || {}), ...translate } } : v));
                loadData?.(true);
            }
        } catch (e) {
            const m = String(e?.message || "").toLowerCase();
            setReview({ approved: false, reason: m.includes("exist") ? (t.dictExistsError || "") : m.includes("review") ? (t.reviewFailed || "Не удалось проверить правку, попробуйте позже") : (t.unexpectedError || "—") });
        }
        setEditBusy(false);
    };

    const submitRediff = async () => {
        if (!diff || !view || dfixBusy) return;
        const other = diff.with;
        setDfixBusy(true);
        try {
            const r = await api.rediff(view.no, other, lang, dfixHint.trim());
            setDiff((d) => (d && d.with === other ? { ...d, data: r.diff, loading: false } : d));
            setDfixOpen(false); setDfixHint("");
        } catch { /* не вышло */ }
        setDfixBusy(false);
    };

    const submitFix = async () => {
        if (fixBusy || !view) return;
        const no = view.no;
        setFixBusy(true);
        try {
            const r = await api.redescribe(no, fixHint.trim());
            const nd = r.description?.[lang] || r.description?.en || "";
            setView((v) => (v && v.no === no ? { ...v, desc: nd } : v));
            setFixOpen(false); setFixHint("");
        } catch { /* не вышло — оставляем как есть */ }
        setFixBusy(false);
    };

    // Разница между текущим словом и близким по смыслу (по клику на «?»). Повторный клик — закрыть.
    const openDiff = (other) => {
        setDfixOpen(false); setDfixHint("");
        if (diff && diff.with === other) { setDiff(null); return; }
        setDiff({ with: other, loading: true, data: null });
        api.getWordDiff(view.no, other, lang)
            .then((r) => setDiff((d) => (d && d.with === other ? { ...d, loading: false, data: r.diff } : d)))
            .catch(() => setDiff((d) => (d && d.with === other ? { ...d, loading: false, data: null } : d)));
    };

    const loadWord = (no, id) => {
        setView({ no, desc: "", descLoading: true, synonyms: null, topics: [], level: null });
        setDiff(null); setFixOpen(false); setFixHint(""); setDfixOpen(false); setDfixHint(""); setDelConfirm(false);
        setAskOpen(false); setAskQ(""); setAskA(""); setAskBusy(false);
        const fresh = (v) => v && v.no === no; // игнорируем ответы устаревшей навигации
        const descP = id ? api.getWordDescription(id) : api.getPoolDescription(no);
        const synP = id ? api.getSynonyms(id, { lang }) : api.getPoolSynonyms(no, { lang });
        descP.then((r) => setView((v) => fresh(v) ? { ...v, desc: r.description?.[lang] || r.description?.en || "", descLoading: false } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, descLoading: false } : v));
        synP.then((r) => setView((v) => fresh(v) ? { ...v, synonyms: r.synonyms || [] } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, synonyms: [] } : v));
        api.getPoolMeta(no).then((m) => setView((v) => fresh(v) ? { ...v, topics: m?.topics || [], level: m?.level || null, forms: m?.forms || null, hasTts: !!m?.hasTts, translate: m?.translate || null, part_of_speech: m?.part_of_speech || null, freqBand: m?.freqBand || null, freq: m?.freq ?? null, inLearning: !!m?.inLearning, pool_id: m?.pool_id ?? null } : v)).catch(() => {});
    };

    useEffect(() => {
        if (open && word) loadWord(word, wordId);
        if (!open) { setView(null); setDiff(null); setFixOpen(false); setFixHint(""); setDfixOpen(false); setDfixHint(""); setEditOpen(false); setDelConfirm(false); }
    }, [open, word, wordId]); // eslint-disable-line

    // Свайп/кнопка «Назад» закрывает карточку слова (на всех экранах, где она открыта)
    useHistoryClose(open, onClose);

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
            { key: "edit", label: t.editWord || "Изменить слово", icon: "edit", onClick: openEdit },
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


            {view?.forms && posFormsRows(view.no, view.forms).length > 0 && (
                <div style={{ marginTop: "var(--sp-5)" }}>
                    <div className="label row" style={{ gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-2)" }}>
                        <Icon n="type" sm /> {t.grammForms || "Грамматические формы"}
                    </div>
                    <div className="forms-tbl">
                        {posFormsRows(view.no, view.forms).map(({ label, value }) => (
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
                                <span className="syn__go" title={t.description} onClick={() => loadWord(s.word)}>
                                    <b>{s.word}</b>{s.translate?.[0] ? ` — ${s.translate[0]}` : ""}
                                </span>
                                <button
                                    className={`syn__diff${diff?.with === s.word ? " is-on" : ""}`}
                                    title={t.difference} aria-label={t.difference}
                                    onClick={() => openDiff(s.word)}
                                >
                                    <Icon n="compare" sm />
                                </button>
                            </span>
                        ))}
                    </div>

                    {diff && (
                        <div className="diffbox">
                            <div className="label" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "var(--sp-2)" }}>
                                <Icon n="compare" sm /> {t.difference}: <b>{view.no}</b> / <b>{diff.with}</b>
                            </div>
                            {diff.loading ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-busy="true">
                                    <span className="skel skel--line" style={{ width: "100%" }} />
                                    <span className="skel skel--line" style={{ width: "85%" }} />
                                </div>
                            ) : diff.data ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", lineHeight: "var(--lh-normal)" }}>
                                    <span>{diff.data.summary}</span>
                                    <span><b>{view.no}</b> — {diff.data.when_a}</span>
                                    <span><b>{diff.with}</b> — {diff.data.when_b}</span>
                                    {diff.data.example && <span className="muted">{diff.data.example}</span>}
                                    {dfixOpen ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginTop: "var(--sp-1)" }}>
                                            <textarea className="input" rows={2} value={dfixHint} autoFocus
                                                onChange={(e) => setDfixHint(e.target.value)} placeholder={t.fixHintPlaceholder} />
                                            <div className="row" style={{ gap: "var(--sp-2)" }}>
                                                <button className="btn btn--primary btn--sm" disabled={dfixBusy} onClick={submitRediff}>
                                                    {dfixBusy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {t.regenerate}
                                                </button>
                                                <button className="btn btn--ghost btn--sm" disabled={dfixBusy} onClick={() => { setDfixOpen(false); setDfixHint(""); }}>
                                                    {t.cancel}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="diff-link" onClick={() => setDfixOpen(true)} style={{ marginTop: "var(--sp-1)" }}>
                                            <Icon n="edit" sm /> {t.fix}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="muted" style={{ margin: 0 }}>{t.descUnavailable}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>

        {/* Отдельный модал «Исправить описание» */}
        <Modal open={fixOpen} onClose={() => !fixBusy && (setFixOpen(false), setFixHint(""))} title={t.fixDesc || "Исправить описание"}
            footer={<>
                <button className="btn btn--ghost" disabled={fixBusy} onClick={() => { setFixOpen(false); setFixHint(""); }}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={fixBusy} onClick={submitFix}>
                    {fixBusy ? <><BtnSpinner /> {t.asking || "…"}</> : <><Icon n="sparkles" sm /> {t.regenerate}</>}
                </button>
            </>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                {wordRefNode}
                <textarea className="input" rows={3} value={fixHint} autoFocus
                    onChange={(e) => setFixHint(e.target.value)} placeholder={t.fixHintPlaceholder} />
            </div>
        </Modal>

        {/* Отдельный модал «Спросить о слове» */}
        <Modal open={askOpen} onClose={() => !askBusy && (setAskOpen(false), setAskQ(""), setAskA(""))} title={t.askWord || "Спросить о слове"}
            footer={<>
                <button className="btn btn--ghost" disabled={askBusy} onClick={() => { setAskOpen(false); setAskQ(""); setAskA(""); }}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={askBusy || !askQ.trim()} onClick={submitAsk}>
                    {askBusy ? <><BtnSpinner /> {t.asking}</> : <><Icon n="sparkles" sm /> {t.askSend}</>}
                </button>
            </>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                {wordRefNode}
                <form onSubmit={(e) => { e.preventDefault(); submitAsk(); }}>
                    <input className="input" value={askQ} autoFocus type="text"
                        placeholder={t.askPlaceholder} onChange={(e) => setAskQ(e.target.value)} />
                </form>
                {askA && (
                    <p className="muted" style={{ margin: 0, lineHeight: "var(--lh-normal)", whiteSpace: "pre-wrap" }}>{askA}</p>
                )}
            </div>
        </Modal>

        {/* Отдельный модал правки: норвежское слово + перевод на твой язык; «Дополнительно» — остальные языки. */}
        <Modal open={editOpen} onClose={() => !editBusy && setEditOpen(false)} title={t.editWord || "Изменить слово"}
            footer={<>
                <button className="btn btn--ghost" disabled={editBusy} onClick={() => setEditOpen(false)}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={editBusy} onClick={saveEdit}>{editBusy ? <><BtnSpinner /> {t.reviewing || "Проверка…"}</> : t.save}</button>
            </>}>
            {edit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {wordRefNode}
                    <div className="field">
                        <label className="label">{t.norwegianWord || "Норвежское слово"}</label>
                        <input className="input" value={edit.no} autoFocus
                            onChange={(e) => setEdit((s) => ({ ...s, no: e.target.value }))} />
                    </div>
                    <div className="field">
                        <label className="label">{LANG_LABEL[lang] || lang}</label>
                        <input className="input" value={edit[lang] || ""} placeholder={t.translate}
                            onChange={(e) => setEdit((s) => ({ ...s, [lang]: e.target.value }))} />
                        <span className="input-hint">{t.multipleVariantsHint}</span>
                    </div>
                    {moreOpen ? (
                        Object.keys(LANG_LABEL).filter((k) => k !== lang).map((k) => (
                            <div className="field" key={k}>
                                <label className="label">{LANG_LABEL[k]}</label>
                                <input className="input" value={edit[k] || ""}
                                    onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))} />
                            </div>
                        ))
                    ) : (
                        <button className="diff-link" onClick={() => setMoreOpen(true)}>
                            <Icon n="plus" sm /> {t.more || "Дополнительно"}
                        </button>
                    )}
                    <div className="field">
                        <label className="label">{t.editHintLabel || "Подсказка (необязательно)"}</label>
                        <input className="input" value={hint} placeholder={t.editHintPlaceholder || "напр.: это глагол, не существительное"}
                            onChange={(e) => setHint(e.target.value)} />
                    </div>
                    {review && (
                        <div style={{
                            display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
                            fontSize: "var(--fs-13)", lineHeight: "var(--lh-normal)",
                            background: review.approved ? "var(--success-bg)" : "var(--danger-bg)",
                            color: review.approved ? "var(--success)" : "var(--danger)",
                        }}>
                            <Icon n={review.approved ? "check" : "x"} sm style={{ flexShrink: 0, marginTop: 2 }} />
                            <span><b>{review.approved ? (t.reviewApproved || "Одобрено") : (t.reviewRejected || "Отклонено")}.</b> {review.reason}</span>
                        </div>
                    )}
                </div>
            )}
        </Modal>
        </>
    );
};

export default WordInfoModal;
