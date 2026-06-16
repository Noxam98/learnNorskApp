import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner, Dots } from "./Spinner.jsx";
import { useWordsStore } from "../../store/wordStore.jsx";
import api from "../tools/api.js";

// Описание слова + похожие слова (кликабельные — навигация по пулу) +
// кнопка добавить/удалить просматриваемое слово в текущий словарь.
// wordId передаётся только для исходного слова словаря — тогда описание
// тянется по id (генерится по требованию). Синонимы — всегда слова из пула.
export const WordInfoModal = ({ open, word, wordId, lang, t, onClose }) => {
    const dictList = useWordsStore((s) => s.dictList);
    const currentDictName = useWordsStore((s) => s.currentDictName);
    const addFromPool = useWordsStore((s) => s.addFromPool);
    const removeFromDict = useWordsStore((s) => s.removeFromDict);

    const [view, setView] = useState(null); // { no, desc, descLoading, synonyms }
    const [dictBusy, setDictBusy] = useState(false);
    const [diff, setDiff] = useState(null); // { with, loading, data } — разбор разницы с близким словом

    // Разница между текущим словом и близким по смыслу (по клику на «?»). Повторный клик — закрыть.
    const openDiff = (other) => {
        if (diff && diff.with === other) { setDiff(null); return; }
        setDiff({ with: other, loading: true, data: null });
        api.getWordDiff(view.no, other, lang)
            .then((r) => setDiff((d) => (d && d.with === other ? { ...d, loading: false, data: r.diff } : d)))
            .catch(() => setDiff((d) => (d && d.with === other ? { ...d, loading: false, data: null } : d)));
    };

    const loadWord = (no, id) => {
        setView({ no, desc: "", descLoading: true, synonyms: null });
        setDiff(null);
        const fresh = (v) => v && v.no === no; // игнорируем ответы устаревшей навигации
        const descP = id ? api.getWordDescription(id) : api.getPoolDescription(no);
        const synP = id ? api.getSynonyms(id, { lang }) : api.getPoolSynonyms(no, { lang });
        descP.then((r) => setView((v) => fresh(v) ? { ...v, desc: r.description?.[lang] || r.description?.en || "", descLoading: false } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, descLoading: false } : v));
        synP.then((r) => setView((v) => fresh(v) ? { ...v, synonyms: r.synonyms || [] } : v))
            .catch(() => setView((v) => fresh(v) ? { ...v, synonyms: [] } : v));
    };

    useEffect(() => {
        if (open && word) loadWord(word, wordId);
        if (!open) { setView(null); setDiff(null); }
    }, [open, word, wordId]); // eslint-disable-line

    const curDict = dictList.find((d) => d.dictName === currentDictName);
    const member = curDict?.words.find((w) => (w.translate?.no?.[0] || "").toLowerCase() === (view?.no || "").toLowerCase());
    const inDict = !!member;

    const toggleDict = async () => {
        if (!view || dictBusy) return;
        setDictBusy(true);
        try {
            if (inDict) await removeFromDict(member.id);
            else await addFromPool(view.no);
        } catch { /* офлайн — не критично */ }
        setDictBusy(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={view?.no || word || ""}>
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

            <div style={{ marginTop: "var(--sp-5)" }}>
                <button
                    className={`btn ${inDict ? "btn--danger-ghost" : "btn--primary"}`}
                    disabled={dictBusy || !currentDictName}
                    onClick={toggleDict}
                >
                    {dictBusy ? <BtnSpinner /> : <Icon n={inDict ? "trash" : "plus"} sm />}
                    {" "}{inDict ? t.removeFromDict : t.addToDict}
                </button>
            </div>

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
                                </div>
                            ) : (
                                <p className="muted" style={{ margin: 0 }}>{t.descUnavailable}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default WordInfoModal;
