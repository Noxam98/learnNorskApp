// Импорт слов в набор из ПРОИЗВОЛЬНОГО текста (как с фото, но текстом). Две фазы:
//   1) вставка свободного текста (чат-лог с метками времени/именами, список через запятую/перенос,
//      строки «norsk — перевод», даже на другом языке) + уточнение → api.setParseText (LLM разбирает);
//   2) правка предложенного списка (≤MAX) → api.setImportWords → onImported (родитель перезагружает).
// Владеет своим состоянием; родитель лишь открывает (open) и слушает onClose/onImported.
import { useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";

const MAX = 50;   // потолок слов за один импорт (бэк обрабатывает пачками по 20)

export default function TextImportModal({ open, setId, lang, ll, onClose, onImported }) {
    // фаза 1: ввод текста; фаза 2 (words!==null): правка списка
    const [text, setText] = useState("");
    const [hint, setHint] = useState("");
    const [words, setWords] = useState(/** @type {string[]|null} */(null));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const reset = () => { setText(""); setHint(""); setWords(null); setBusy(false); setError(""); };
    const close = () => { if (busy) return; reset(); onClose?.(); };

    const parse = async () => {
        if (busy || !setId || !text.trim()) return;
        setBusy(true); setError("");
        try {
            const r = await api.setParseText(setId, { text, hint });
            const list = (r?.words || []).slice(0, MAX);
            setWords(list); setError(list.length ? "" : ll.imgEmpty);
        } catch { setError(ll.imgFail); } finally { setBusy(false); }
    };
    const setWord = (i, v) => setWords((p) => p.map((w, j) => j === i ? v : w));
    const delWord = (i) => setWords((p) => p.filter((_, j) => j !== i));
    const addWord = () => setWords((p) => (p.length >= MAX ? p : [...p, ""]));
    const doImport = async () => {
        if (busy || !setId) return;
        const list = (words || []).map((w) => w.trim()).filter(Boolean);
        if (!list.length) return;
        setBusy(true); setError("");
        try {
            await api.setImportWords(setId, { words: list, lang });
            reset(); onImported?.();
        } catch { setError(ll.imgFail); setBusy(false); }
    };

    const nWords = (words || []).filter((w) => w.trim()).length;
    return (
        <Modal open={open} onClose={close} title={ll.importText} maxWidth={460}>
            {words === null ? (
                /* фаза 1: свободный текст + уточнение + «Обработать» */
                <>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>{ll.textHint}</div>
                    <textarea className="input" rows={7} value={text} placeholder={ll.textPh} autoFocus
                        onChange={(e) => setText(e.target.value)}
                        style={{ width: "100%", resize: "vertical" }} />
                    <textarea className="input" rows={2} value={hint} placeholder={ll.imgHintPh}
                        onChange={(e) => setHint(e.target.value)}
                        style={{ width: "100%", marginTop: "var(--sp-2)", resize: "none" }} />
                    {error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{error}</div>}
                    <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                        disabled={busy || !text.trim()} onClick={parse}>
                        {busy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {busy ? ll.textBusy : ll.textRun}
                    </button>
                </>
            ) : (
                /* фаза 2: правка предложенного списка + «Добавить N» */
                <>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>{ll.imgReview}</div>
                    <div className="ocr-list">
                        {words.map((w, i) => (
                            <div className="ocr-row" key={i}>
                                <input className="input" value={w} placeholder={ll.namePh}
                                    onChange={(e) => setWord(i, e.target.value)} />
                                <button className="ocr-del" aria-label="×" onClick={() => delWord(i)}><Icon n="x" sm /></button>
                            </div>
                        ))}
                    </div>
                    {words.length < MAX && (
                        <button className="btn btn--ghost btn--sm" style={{ marginTop: "var(--sp-2)" }} onClick={addWord}>
                            <Icon n="plus" sm /> {ll.addWord}
                        </button>
                    )}
                    {error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{error}</div>}
                    <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                        disabled={busy || !nWords} onClick={doImport}>
                        {busy ? <BtnSpinner /> : <Icon n="check" sm />}{" "}
                        {busy ? ll.generating : ll.imgAdd.replace("{n}", String(nWords))}
                    </button>
                </>
            )}
        </Modal>
    );
}
