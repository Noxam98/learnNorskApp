import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";

const MAX_WORD = 80, MAX_TRANSLATION = 240;

export default function ImportReview({ items, setItems, max, ll, busy, busyText, error, onBack, onImport }) {
    const selected = items.filter((item) => item.enabled !== false && item.word.trim());
    const update = (i, patch) => setItems((prev) => prev.map((item, j) => j === i ? { ...item, ...patch } : item));
    const remove = (i) => setItems((prev) => prev.filter((_, j) => j !== i));
    const add = () => setItems((prev) => prev.length >= max
        ? prev
        : [...prev, { word: "", translation: "", enabled: true }]);

    return (
        <>
            <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>
                {ll.imgReview}
            </div>
            <div className="import-count">
                {ll.importSelected.replace("{n}", String(selected.length)).replace("{total}", String(items.length))}
            </div>
            <div className="ocr-list">
                {items.map((item, i) => (
                    <div className={"import-row" + (item.enabled === false ? " is-off" : "")} key={i}>
                        <input type="checkbox" checked={item.enabled !== false}
                            aria-label={ll.importSelectWord.replace("{word}", item.word || String(i + 1))}
                            onChange={(e) => update(i, { enabled: e.target.checked })} />
                        <div className="import-fields">
                            <input className="input" value={item.word} maxLength={MAX_WORD}
                                aria-label={ll.importWordLabel} placeholder={ll.importWordLabel}
                                onChange={(e) => update(i, { word: e.target.value })} />
                            <input className="input" value={item.translation || ""} maxLength={MAX_TRANSLATION}
                                aria-label={ll.importTranslationLabel} placeholder={ll.importTranslationLabel}
                                onChange={(e) => update(i, { translation: e.target.value })} />
                        </div>
                        <button className="ocr-del" aria-label={ll.importRemoveWord.replace("{word}", item.word || String(i + 1))}
                            onClick={() => remove(i)}><Icon n="x" sm /></button>
                    </div>
                ))}
            </div>
            {items.length < max && (
                <button className="btn btn--ghost btn--sm" style={{ marginTop: "var(--sp-2)" }} onClick={add}>
                    <Icon n="plus" sm /> {ll.addWord}
                </button>
            )}
            {error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{error}</div>}
            <div className="import-actions">
                <button className="btn btn--ghost" disabled={busy} onClick={onBack}>
                    <Icon n="chevron-left" sm /> {ll.importBack}
                </button>
                <button className="btn btn--accent" disabled={busy || !selected.length}
                    onClick={() => onImport(selected)}>
                    {busy ? <BtnSpinner /> : <Icon n="check" sm />}{" "}
                    {busy ? (busyText || ll.importAdding) : ll.imgAdd.replace("{n}", String(selected.length))}
                </button>
            </div>
        </>
    );
}
