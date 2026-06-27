// Модалка задать/сменить пароль (в т.ч. первый пароль для Google-аккаунта). Владеет полем/busy/
// ошибкой; на успехе зовёт onSaved (refreshMe), затем onClose. Вынесено из MyPage.jsx.
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";

export default function PasswordModal({ open, hasPassword, t, onClose, onSaved }) {
    const [value, setValue] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => { if (!open) { setValue(""); setError(""); setSaving(false); } }, [open]);

    const close = () => { if (!saving) onClose?.(); };
    const save = async () => {
        if (value.length < 6) { setError(t.passwordLengthError); return; }
        setSaving(true); setError("");
        try { await api.setPassword(value); await onSaved?.(); onClose?.(); }
        catch { setError(t.unexpectedError); }
        setSaving(false);
    };

    return (
        <Modal open={open} onClose={close} title={hasPassword ? t.changePassword : t.setPassword}
            footer={<>
                <button className="btn btn--ghost" disabled={saving} onClick={close}>{t.cancel}</button>
                <button className="btn btn--accent" disabled={saving || value.length < 6} onClick={save}>{saving ? <BtnSpinner /> : t.save}</button>
            </>}>
            <div className="field">
                <div className="input-icon">
                    <Icon n="lock" sm />
                    <input className={`input${error ? " is-error" : ""}`} type="password" autoFocus value={value}
                        placeholder={t.newPasswordPlaceholder}
                        onChange={(e) => { setValue(e.target.value); setError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
                </div>
                {error && <span className="alert"><Icon n="x" sm /> {error}</span>}
            </div>
        </Modal>
    );
}
