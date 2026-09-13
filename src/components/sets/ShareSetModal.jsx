// «Поделиться набором»: поиск человека по имени/логину → отправка предложения.
// Получателю прилетает уведомление (колокольчик в шапке) и пуш; по «Принять» у него создаётся
// СВОЯ копия набора — оригинал у отправителя живёт своей жизнью.
import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";
import { S } from "../notifications/Notifications.i18n.js";

const DEBOUNCE_MS = 350;
const MIN_Q = 2;

const ERR = { self: "errSelf", empty: "errEmpty", "too many": "errMany" };

export default function ShareSetModal({ open, setId, setName = "", lang = "ru", onClose }) {
    const t = S[lang] || S.ru;
    const [q, setQ] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [sentId, setSentId] = useState(null);
    const [err, setErr] = useState("");
    const reqRef = useRef(0);

    useEffect(() => { if (!open) { setQ(""); setUsers([]); setErr(""); setSentId(null); } }, [open]);

    // Поиск с дебаунсом; ответы нумеруем — поздний ответ на старый запрос не перетирает свежий.
    useEffect(() => {
        const term = q.trim();
        if (!open || term.length < MIN_Q) { setUsers([]); setLoading(false); return; }
        setLoading(true);
        const id = ++reqRef.current;
        const tm = setTimeout(() => {
            api.searchUsers(term)
                .then((r) => { if (id === reqRef.current) setUsers(r?.users || []); })
                .catch(() => { if (id === reqRef.current) setUsers([]); })
                .finally(() => { if (id === reqRef.current) setLoading(false); });
        }, DEBOUNCE_MS);
        return () => clearTimeout(tm);
    }, [q, open]);

    const send = async (u) => {
        setSendingId(u.id); setErr("");
        try {
            await api.setShare(setId, u.id);
            setSentId(u.id);
            useSystemStore.getState().showToast(`${t.sent}: ${u.name}`, "success");
        } catch (e) {
            const detail = e?.detail || e?.message || "";
            setErr(t[ERR[detail]] || t.errGeneric);
        } finally { setSendingId(null); }
    };

    if (!open) return null;
    const short = q.trim().length > 0 && q.trim().length < MIN_Q;
    return (
        <Modal open={open} onClose={onClose} title={`${t.title}${setName ? ` · ${setName}` : ""}`} maxWidth={440}>
            <p className="muted" style={{ margin: "0 0 var(--sp-3)", fontSize: "var(--fs-13)" }}>{t.hint}</p>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.ph}
                autoComplete="off" spellCheck="false" style={{ width: "100%" }} />
            {err && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{err}</div>}
            <div style={{ marginTop: "var(--sp-3)", display: "flex", flexDirection: "column", gap: 6 }}>
                {short ? (
                    <span className="muted">{t.short}</span>
                ) : loading ? (
                    <span className="muted"><BtnSpinner /></span>
                ) : q.trim().length >= MIN_Q && !users.length ? (
                    <span className="muted">{t.empty}</span>
                ) : users.map((u) => (
                    <div key={u.id} className="setrow" style={{ alignItems: "center" }}>
                        <span className="nav__avatar" aria-hidden="true" style={{ width: 30, height: 30, fontSize: 13 }}>
                            {(u.name?.[0] || "?").toUpperCase()}
                        </span>
                        <span className="setrow__meta"><span className="setrow__t">{u.name}</span></span>
                        <button className="btn btn--sm btn--accent" disabled={sendingId === u.id || sentId === u.id}
                            onClick={() => send(u)}>
                            {sendingId === u.id ? <BtnSpinner />
                                : sentId === u.id ? <><Icon n="check" sm /> {t.sent}</>
                                    : <><Icon n="share" sm /> {t.send}</>}
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
