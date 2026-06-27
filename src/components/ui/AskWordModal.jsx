// Модалка «Спросить о слове у нейросети»: вопрос → api.askWord(no) → ответ.
// View-независима (читает только норвежское слово `no`, ничего не мутирует), поэтому
// самодостаточна: владеет полем вопроса/ответа/busy. Шапка слова приходит пропом `header`.
// Вынесено из WordInfoModal.jsx.
import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import api from "../tools/api.js";

export default function AskWordModal({ open, no, lang, t, header, onClose }) {
    const [q, setQ] = useState("");
    const [a, setA] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!open) { setQ(""); setA(""); setBusy(false); } }, [open]);

    const submit = async () => {
        const query = q.trim();
        if (!query || busy || !no) return;
        setBusy(true); setA("");
        try {
            const r = await api.askWord(no, query, lang);
            setA(r?.answer || t.descUnavailable || "—");
        } catch { setA(t.unexpectedError || "—"); }
        setBusy(false);
    };

    return (
        <Modal open={open} onClose={() => !busy && onClose?.()} title={t.askWord || "Спросить о слове"}
            footer={<>
                <button className="btn btn--ghost" disabled={busy} onClick={() => onClose?.()}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={busy || !q.trim()} onClick={submit}>
                    {busy ? <><BtnSpinner /> {t.asking}</> : <><Icon n="sparkles" sm /> {t.askSend}</>}
                </button>
            </>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                {header}
                <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                    <input className="input" value={q} autoFocus type="text"
                        placeholder={t.askPlaceholder} onChange={(e) => setQ(e.target.value)} />
                </form>
                {a && (
                    <p className="muted" style={{ margin: 0, lineHeight: "var(--lh-normal)", whiteSpace: "pre-wrap" }}>{a}</p>
                )}
            </div>
        </Modal>
    );
}
