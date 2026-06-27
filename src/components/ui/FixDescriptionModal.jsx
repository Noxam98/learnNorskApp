// Модалка «Исправить описание»: подсказка → api.redescribe(no, hint) → новое описание наружу
// (onFixed(no, desc) — родитель обновляет view). Держит только своё поле подсказки/busy; шапка
// слова приходит пропом header. Вынесено из WordInfoModal.jsx.
import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import api from "../tools/api.js";

export default function FixDescriptionModal({ open, no, lang, t, header, onClose, onFixed }) {
    const [hint, setHint] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!open) { setHint(""); setBusy(false); } }, [open]);

    const submit = async () => {
        if (busy || !no) return;
        setBusy(true);
        try {
            const r = await api.redescribe(no, hint.trim());
            const nd = r.description?.[lang] || r.description?.en || "";
            onFixed?.(no, nd);
            onClose?.();
        } catch { /* не вышло — оставляем окно открытым */ }
        setBusy(false);
    };

    return (
        <Modal open={open} onClose={() => !busy && onClose?.()} title={t.fixDesc || "Исправить описание"}
            footer={<>
                <button className="btn btn--ghost" disabled={busy} onClick={() => onClose?.()}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={busy} onClick={submit}>
                    {busy ? <><BtnSpinner /> {t.asking || "…"}</> : <><Icon n="sparkles" sm /> {t.regenerate}</>}
                </button>
            </>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                {header}
                <textarea className="input" rows={3} value={hint} autoFocus
                    onChange={(e) => setHint(e.target.value)} placeholder={t.fixHintPlaceholder} />
            </div>
        </Modal>
    );
}
