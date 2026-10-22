// Кнопка отношения «я ↔ человек»: В друзья → Заявка отправлена; Принять (он звал меня);
// В друзьях. Одна на поиск друзей и мини-профиль, чтобы состояния выглядели одинаково.
// Встречную заявку бэк принимает тем же /friends/request, отдельный эндпоинт не нужен.
import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { F } from "./Social.i18n.js";

const ERR = { declined: "errDeclined", limit: "errLimit" };

/** Буква-аватар (как в шапке) — фото у нас нет, первая буква имени. */
export function Avatar({ name, size = 30 }) {
    return (
        <span className="nav__avatar soc-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.43) }}>
            {(name?.[0] || "?").toUpperCase()}
        </span>
    );
}

/**
 * @param {{ userId: number, rel: string, lang: string, onChange?: (rel: string) => void }} p
 *   rel: none | outgoing | incoming | friend | self
 */
export default function FriendButton({ userId, rel, lang, onChange }) {
    const f = F[lang] || F.ru;
    const [busy, setBusy] = useState(false);
    if (rel === "self") return null;
    if (rel === "friend") {
        return <span className="soc-rel"><Icon n="check" sm /> {f.isFriend}</span>;
    }
    if (rel === "outgoing") {
        return <span className="soc-rel soc-rel--muted"><Icon n="clock" sm /> {f.pending}</span>;
    }
    const send = async () => {
        setBusy(true);
        try {
            const r = await api.friendRequest(userId);
            const next = r?.state === "friends" ? "friend" : "outgoing";
            useSystemStore.getState().showToast(next === "friend" ? f.friendsToast : f.sentToast, "success");
            useSocialStore.getState().bumpFriends();
            onChange?.(next);
        } catch (e) {
            const detail = /** @type {any} */ (e)?.message || "";
            useSystemStore.getState().showToast(f[ERR[detail]] || f.errGeneric);
        } finally { setBusy(false); }
    };
    return (
        <button className="btn btn--sm btn--accent" disabled={busy} onClick={(e) => { e.stopPropagation(); send(); }}>
            {busy ? <BtnSpinner /> : <Icon n={rel === "incoming" ? "check" : "plus"} sm />} {rel === "incoming" ? f.accept : f.add}
        </button>
    );
}
