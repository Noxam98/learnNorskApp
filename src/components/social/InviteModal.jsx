// «Позвать в комнату» из лобби онлайна: сверху друзья (позвать в одно касание), ниже — поиск
// любого человека по имени/логину. Человеку прилетает уведомление + пуш, «Войти» ведёт в
// /online?join=<id>. Повторное «Позвать» тому же человеку бэк не дублирует.
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { usePeopleSearch } from "./usePeopleSearch.js";
import { Avatar } from "./FriendButton.jsx";
import { F, I } from "./Social.i18n.js";

const ERR = { room_full: "errFull", room_in_game: "errInGame", already_in_room: "errAlready" };

/** @param {{ open: boolean, roomId: string, lang: string, inRoom?: string[], onClose: () => void }} p
 *  inRoom — имена тех, кто уже в комнате (их из списка друзей не предлагаем) */
export default function InviteModal({ open, roomId, lang, inRoom = [], onClose }) {
    const t = I[lang] || I.ru;
    const f = F[lang] || F.ru;
    const [friends, setFriends] = useState(/** @type {any[]|null} */(null));
    const [q, setQ] = useState("");
    const [sent, setSent] = useState(/** @type {Record<number, boolean>} */({}));
    const [busyId, setBusyId] = useState(/** @type {number|null} */(null));
    const { users, loading, short, searched } = usePeopleSearch(q, open);

    useEffect(() => {
        if (!open) { setQ(""); setSent({}); return; }
        api.friendsList().then((r) => setFriends(r?.friends || [])).catch(() => setFriends([]));
    }, [open]);

    const invite = async (/** @type {any} */ u) => {
        setBusyId(u.id);
        try {
            await api.onlineInvite(roomId, u.id);
            setSent((s) => ({ ...s, [u.id]: true }));
        } catch (e) {
            const detail = /** @type {any} */ (e)?.message || "";
            useSystemStore.getState().showToast(t[ERR[detail]] || t.errGeneric);
        } finally { setBusyId(null); }
    };

    const row = (/** @type {any} */ u) => (
        <div key={u.id} className="soc-row">
            <Avatar name={u.name} />
            <span className="soc-row__meta"><span className="soc-row__t">{u.name}</span></span>
            <button className="btn btn--sm btn--accent" disabled={busyId === u.id || sent[u.id]} onClick={() => invite(u)}>
                {busyId === u.id ? <BtnSpinner /> : <Icon n={sent[u.id] ? "check" : "play"} sm />} {sent[u.id] ? t.invited : t.invite}
            </button>
        </div>
    );

    if (!open) return null;
    const free = (friends || []).filter((fr) => !inRoom.includes(fr.name));
    return (
        <Modal open={open} onClose={onClose} title={t.title} maxWidth={440}>
            <div className="soc-search">
                <Icon n="search" sm />
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t.search}: ${f.ph}`}
                    autoComplete="off" spellCheck="false" aria-label={t.search} />
            </div>
            {searched || short ? (
                <div className="soc-list">
                    {short ? <div className="soc-note">{f.short}</div>
                        : loading ? <div className="soc-note"><BtnSpinner /></div>
                            : !users.length ? <div className="soc-note">{f.empty}</div>
                                : users.map(row)}
                </div>
            ) : (
                <>
                    <div className="soc-sub">{t.friends}</div>
                    <div className="soc-list">
                        {friends == null ? <div className="soc-note"><BtnSpinner /></div>
                            : !free.length ? <div className="soc-note">{t.noFriends}</div>
                                : free.map(row)}
                    </div>
                </>
            )}
        </Modal>
    );
}
