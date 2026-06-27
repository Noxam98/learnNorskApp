// Модалка смены отображаемого имени. Владеет полем/busy; на успехе зовёт onSaved (refreshMe),
// затем onClose. Вынесено из MyPage.jsx.
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";

export default function NameEditModal({ open, initial, t, onClose, onSaved }) {
    const [value, setValue] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (open) setValue(initial || ""); }, [open, initial]);

    const close = () => { if (!saving) onClose?.(); };
    const save = async () => {
        setSaving(true);
        try { await api.setName(value.trim()); await onSaved?.(); onClose?.(); }
        catch { /* тост покажет api.js */ }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={close} title={t.displayName}
            footer={<>
                <button className="btn btn--ghost" disabled={saving} onClick={close}>{t.cancel}</button>
                <button className="btn btn--accent" disabled={saving} onClick={save}>{saving ? <BtnSpinner /> : t.save}</button>
            </>}>
            <div className="field">
                <div className="input-icon">
                    <Icon n="user" sm />
                    <input className="input" type="text" autoFocus value={value} maxLength={40}
                        placeholder={t.displayNamePlaceholder}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
                </div>
            </div>
        </Modal>
    );
}
