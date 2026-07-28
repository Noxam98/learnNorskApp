// Импорт слов из произвольного текста: ввод → структурированный разбор → проверка → честный итог.
// Явные пары «norsk — перевод» сохраняют перевод; при ошибке черновик остаётся в модалке.
import { useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import ImportReview from "./ImportReview.jsx";
import ImportResult from "./ImportResult.jsx";
import { IMPORT_I18N } from "./Import.i18n.js";
import { importErrorText } from "./importErrors.js";
import { importWordsInBatches } from "./importBatches.js";

const MAX = 50, MAX_TEXT = 8000, MAX_HINT = 500;

export default function TextImportModal({ open, setId, lang, ll, onClose, onImported }) {
    const ui = { ...ll, ...(IMPORT_I18N[lang] || IMPORT_I18N.en) };
    const [text, setText] = useState("");
    const [hint, setHint] = useState("");
    const [items, setItems] = useState(/** @type {{word:string,translation:string,enabled?:boolean}[]|null} */(null));
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState("");

    const reset = () => {
        setText(""); setHint(""); setItems(null); setResult(null); setBusy(false); setProgress(null); setError("");
    };
    const close = () => {
        if (busy) return;
        reset(); onClose?.();
    };
    const parse = async () => {
        if (busy || !setId || !text.trim()) return;
        setBusy(true); setError("");
        try {
            const r = await api.setParseText(setId, { text, hint });
            const list = (r?.items || (r?.words || []).map((word) => ({ word, translation: "" })))
                .slice(0, MAX)
                .map((item) => ({ word: item.word || "", translation: item.translation || "", enabled: true }));
            setItems(list);
            setError(list.length ? "" : ui.textEmpty);
        } catch (e) {
            setError(importErrorText(e, ui, ui.textFail));
        } finally {
            setBusy(false);
        }
    };
    const doImport = async (selected) => {
        if (busy || !setId || !selected.length) return;
        setBusy(true); setError("");
        try {
            const r = await importWordsInBatches({
                setId,
                items: selected.map(({ word, translation }) => ({ word: word.trim(), translation: (translation || "").trim() })),
                lang,
                onProgress: setProgress,
            });
            setResult(r);
            onImported?.(r);
        } catch (e) {
            setError(importErrorText(e, ui, ui.importFailed));
        } finally {
            setBusy(false); setProgress(null);
        }
    };
    const retry = () => {
        const failed = result?.failed || [];
        setItems(failed.map((item) => ({
            word: item.word || "", translation: item.translation || "", enabled: true,
        })));
        setResult(null); setError("");
    };

    return (
        <Modal open={open} onClose={close}
            title={result ? ui.importResultTitle : (items === null ? ui.importText : ui.importReviewTitle)}
            maxWidth={560}>
            {result ? (
                <ImportResult result={result} ll={ui} onRetry={retry} onMore={reset} onDone={close} />
            ) : items === null ? (
                <>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>{ui.textHint}</div>
                    <textarea className="input" rows={7} value={text} placeholder={ui.textPh} autoFocus maxLength={MAX_TEXT}
                        onChange={(e) => setText(e.target.value)}
                        style={{ width: "100%", resize: "vertical" }} />
                    <div className="import-limit">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</div>
                    <textarea className="input" rows={2} value={hint} placeholder={ui.imgHintPh} maxLength={MAX_HINT}
                        onChange={(e) => setHint(e.target.value)}
                        style={{ width: "100%", marginTop: "var(--sp-2)", resize: "none" }} />
                    {error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{error}</div>}
                    <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                        disabled={busy || !text.trim()} onClick={parse}>
                        {busy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {busy ? ui.textBusy : ui.textRun}
                    </button>
                </>
            ) : (
                <ImportReview items={items} setItems={setItems} max={MAX} ll={ui} busy={busy} error={error}
                    busyText={progress ? ui.importProgress
                        .replace("{done}", String(progress.done)).replace("{total}", String(progress.total)) : ""}
                    onBack={() => { setItems(null); setError(""); }} onImport={doImport} />
            )}
        </Modal>
    );
}
