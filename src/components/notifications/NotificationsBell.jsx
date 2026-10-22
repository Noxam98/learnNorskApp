// Центр уведомлений + друзья. Панель о двух вкладках: «Лента» рисует ЛЮБОЙ тип уведомления
// (конкретный тип знает только свою карточку в NotifyRow), «Друзья» — список друзей и поиск
// (components/social/FriendsTab).
//
// Точек входа ДВЕ, потому что на телефоне верхняя шапка скрыта целиком (навигация внизу):
//   • NotificationsBell   — кнопка в шапке (десктоп);
//   • NotificationsTabItem — пятый пункт нижней панели (мобилка).
// Обе только открывают панель; её состояние живёт в сторе, а сама панель рендерится один раз
// (NavigationBar) — иначе на мобилке она смонтировалась бы дважды.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import { pl } from "../ui/plural.js";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import FriendsTab from "../social/FriendsTab.jsx";
import { N } from "./Notifications.i18n.js";

const fmt = (s, vars) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
const useT = () => N[useSystemStore((s) => s.currentLanguage)] || N.ru;

/** Загрузка ленты: на входе и при возврате фокуса. Поллинга нет — это почтовый ящик, не чат. */
export function useNotificationsSync() {
    const { user } = useAuth();
    const load = useNotifyStore((s) => s.load);
    useEffect(() => {
        if (!user) return;
        load();
        const onWake = () => { if (document.visibilityState !== "hidden") load(); };
        window.addEventListener("focus", onWake);
        document.addEventListener("visibilitychange", onWake);
        return () => {
            window.removeEventListener("focus", onWake);
            document.removeEventListener("visibilitychange", onWake);
        };
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Кнопка в шапке (десктоп). */
export default function NotificationsBell() {
    const t = useT();
    const { user } = useAuth();
    const unread = useNotifyStore((s) => s.unread);
    const openPanel = useNotifyStore((s) => s.openPanel);
    if (!user) return null;
    return (
        <button className="nav__theme nav__bell" aria-label={t.bell} title={t.bell} onClick={() => openPanel()}>
            <Icon n="bell" sm />
            {unread > 0 && <span className="nav__bell-dot">{unread > 9 ? "9+" : unread}</span>}
        </button>
    );
}

/** Пункт нижней панели (мобилка): выглядит как вкладка, но открывает панель, а не маршрут. */
export function NotificationsTabItem({ onTap }) {
    const t = useT();
    const unread = useNotifyStore((s) => s.unread);
    const openPanel = useNotifyStore((s) => s.openPanel);
    return (
        <button type="button" className="tabbar__item tabbar__item--btn" aria-label={t.bell}
            onClick={() => { onTap?.(); openPanel(); }}>
            <span className="tabbar__ic">
                <Icon n="bell" sm />
                {unread > 0 && <span className="tabbar__dot">{unread > 9 ? "9+" : unread}</span>}
            </span>
            <span>{t.bellTab || t.bell}</span>
        </button>
    );
}

/** Сама панель. Рендерится один раз (NavigationBar), открытие — через стор. */
export function NotificationsPanel() {
    const t = useT();
    const lang = useSystemStore((s) => s.currentLanguage);
    const navigate = useNavigate();
    const { items, loading, panelOpen, panelTab, setPanelTab, closePanel, accept, decline, busyId } = useNotifyStore();
    useHistoryClose(panelOpen, closePanel);   // системная «Назад»/свайп закрывает панель, а не приложение
    if (!panelOpen) return null;
    // Приглашение в игру: бэк лишь помечает решение — в комнату ведём сами (/online?join=…).
    const onAccept = async (n) => {
        const r = await accept(n.id).catch(() => null);
        if (n.type === "room_invite" && r?.room_id) {
            closePanel();
            navigate(`/online?join=${encodeURIComponent(r.room_id)}`);
        }
    };
    return (
        <div className="wn-backdrop" onClick={closePanel}>
            <section className="wn" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
                <span className="wn__halo" aria-hidden="true" />
                <header className="wn__head">
                    <span className="wn__spark"><Icon n={panelTab === "friends" ? "user" : "bell"} /></span>
                    <div className="wn__titles"><h2 className="wn__title">{panelTab === "friends" ? t.tabFriends : t.title}</h2></div>
                    <button className="wn__x" onClick={closePanel} aria-label={t.close}><Icon n="x" sm /></button>
                </header>
                <div className="lb-seg soc-seg" role="tablist">
                    <button role="tab" aria-selected={panelTab === "feed"} className={"lb-seg__b" + (panelTab === "feed" ? " is-on" : "")}
                        onClick={() => setPanelTab("feed")}>{t.tabFeed}</button>
                    <button role="tab" aria-selected={panelTab === "friends"} className={"lb-seg__b" + (panelTab === "friends" ? " is-on" : "")}
                        onClick={() => setPanelTab("friends")}>{t.tabFriends}</button>
                </div>
                <div className="wn__scroll">
                    {panelTab === "friends" ? (
                        <FriendsTab lang={lang} />
                    ) : loading && !items.length ? (
                        <div style={{ display: "grid", placeItems: "center", padding: "var(--sp-6)" }}><BtnSpinner /></div>
                    ) : !items.length ? (
                        <div className="empty empty--mini">
                            <div className="empty__ic"><Icon n="bell" lg /></div>
                            <div className="empty__t">{t.empty}</div>
                            <div className="empty__d">{t.emptyHint}</div>
                        </div>
                    ) : items.map((n) => (
                        <NotifyRow key={n.id} n={n} t={t} lang={lang} busy={busyId === n.id}
                            onAccept={() => onAccept(n)} onDecline={() => decline(n.id).catch(() => {})} />
                    ))}
                </div>
                <button className="wn__ok" onClick={closePanel}>{t.close}</button>
            </section>
        </div>
    );
}

// Иконка и заголовок/подпись карточки по типу. Новый тип уведомления = ещё одна ветка здесь.
const KIND = {
    set_share: { icon: "bookmark", title: (n, t) => fmt(t.shareTitle, { who: n.from_name || "—" }),
        sub: (n, t, lang) => fmt(t.shareSub, { set: n.set_name, n: `${n.count} ${pl(lang, n.count, "word")}` }) },
    friend_request: { icon: "user", title: (n, t) => fmt(t.friendReq, { who: n.from_name || "—" }) },
    friend_accepted: { icon: "check-circle", title: (n, t) => fmt(t.friendAcc, { who: n.from_name || "—" }) },
    room_invite: { icon: "play", title: (n, t) => fmt(t.roomTitle, { who: n.from_name || "—" }),
        sub: (n, t) => fmt(t.roomSub, { room: n.room_name || "" }) },
    set_cloned: { icon: "download", title: (n, t) => fmt(t.cloned, { who: n.from_name || t.someone, set: n.set_name || "" }) },
};
const STATE_LABEL = { accepted: "accepted", declined: "declined", cancelled: "cancelled" };

// Одна карточка ленты: тип решает текст и кнопки, остальное общее.
function NotifyRow({ n, t, lang, busy, onAccept, onDecline }) {
    const openProfile = useSocialStore((s) => s.openProfile);
    const kind = KIND[n.type];
    if (!kind) return null;
    const decided = n.state !== "new" && n.state !== "seen";
    const actionable = n.state === "new";
    const gone = n.type === "room_invite" && actionable && !n.live;   // комната закрылась/заполнилась
    // От человека — тап по заголовку открывает его профиль (кроме анонимного «кто-то взял набор»).
    const canProfile = !!n.from_id && !(n.type === "set_cloned" && !n.from_name);
    return (
        <div className="intro-set__row soc-notif">
            <div className="intro-set__head">
                <span className="intro-set__ic"><Icon n={kind.icon} sm /></span>
                {canProfile ? (
                    <button className="intro-set__t soc-notif__who" onClick={() => openProfile(n.from_id)}>{kind.title(n, t)}</button>
                ) : (
                    <span className="intro-set__t">{kind.title(n, t)}</span>
                )}
            </div>
            {kind.sub && <div className="intro-set__d">{kind.sub(n, t, lang)}</div>}
            {decided ? (
                <div className="intro-set__d" style={{ fontWeight: 700, opacity: .75 }}>
                    <Icon n={n.state === "accepted" ? "check-circle" : "x-circle"} sm />{" "}
                    {t[STATE_LABEL[n.state]] || t.declined}
                </div>
            ) : gone ? (
                <div className="intro-set__d" style={{ fontWeight: 700, opacity: .75 }}>
                    <Icon n="clock" sm /> {t.roomGone}
                </div>
            ) : actionable ? (
                <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                    <button className="btn btn--sm btn--accent" disabled={busy} onClick={onAccept}>
                        {busy ? <BtnSpinner /> : <Icon n={n.type === "room_invite" ? "play" : "check"} sm />}{" "}
                        {n.type === "room_invite" ? t.join : t.accept}
                    </button>
                    <button className="btn btn--sm" disabled={busy} onClick={onDecline}>
                        <Icon n="x" sm /> {t.decline}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
