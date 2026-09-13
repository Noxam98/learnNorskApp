// Центр уведомлений. Место «на вырост»: панель рисует ЛЮБОЙ тип из ленты, а конкретный тип
// знает только про свою карточку (сейчас единственный — set_share, предложение забрать чужой
// набор: «Принять» создаёт свою копию, «Отклонить» закрывает).
//
// Точек входа ДВЕ, потому что на телефоне верхняя шапка скрыта целиком (навигация внизу):
//   • NotificationsBell   — кнопка в шапке (десктоп);
//   • NotificationsTabItem — пятый пункт нижней панели (мобилка).
// Обе только открывают панель; её состояние живёт в сторе, а сама панель рендерится один раз
// (NavigationBar) — иначе на мобилке она смонтировалась бы дважды.
import { useEffect } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import { pl } from "../ui/plural.js";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
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
        <button className="nav__theme nav__bell" aria-label={t.bell} title={t.bell} onClick={openPanel}>
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
    const { items, loading, panelOpen, closePanel, accept, decline, busyId } = useNotifyStore();
    useHistoryClose(panelOpen, closePanel);   // системная «Назад»/свайп закрывает панель, а не приложение
    if (!panelOpen) return null;
    return (
        <div className="wn-backdrop" onClick={closePanel}>
            <section className="wn" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
                <span className="wn__halo" aria-hidden="true" />
                <header className="wn__head">
                    <span className="wn__spark"><Icon n="bell" /></span>
                    <div className="wn__titles"><h2 className="wn__title">{t.title}</h2></div>
                    <button className="wn__x" onClick={closePanel} aria-label={t.close}><Icon n="x" sm /></button>
                </header>
                <div className="wn__scroll">
                    {loading && !items.length ? (
                        <div style={{ display: "grid", placeItems: "center", padding: "var(--sp-6)" }}><BtnSpinner /></div>
                    ) : !items.length ? (
                        <div className="empty empty--mini">
                            <div className="empty__ic"><Icon n="bell" lg /></div>
                            <div className="empty__t">{t.empty}</div>
                            <div className="empty__d">{t.emptyHint}</div>
                        </div>
                    ) : items.map((n) => (
                        <NotifyRow key={n.id} n={n} t={t} lang={lang} busy={busyId === n.id}
                            onAccept={() => accept(n.id)} onDecline={() => decline(n.id)} />
                    ))}
                </div>
                <button className="wn__ok" onClick={closePanel}>{t.close}</button>
            </section>
        </div>
    );
}

// Одна карточка ленты. Новый тип уведомления = ещё одна ветка здесь (остальное уже общее).
function NotifyRow({ n, t, lang, busy, onAccept, onDecline }) {
    if (n.type !== "set_share") return null;
    const decided = n.state !== "new";
    return (
        <div className="intro-set__row">
            <div className="intro-set__head">
                <span className="intro-set__ic"><Icon n="bookmark" sm /></span>
                <span className="intro-set__t">{fmt(t.shareTitle, { who: n.from_name || "—" })}</span>
            </div>
            <div className="intro-set__d">
                {fmt(t.shareSub, { set: n.set_name, n: `${n.count} ${pl(lang, n.count, "word")}` })}
            </div>
            {decided ? (
                <div className="intro-set__d" style={{ fontWeight: 700, opacity: .75 }}>
                    <Icon n={n.state === "accepted" ? "check-circle" : "x-circle"} sm />{" "}
                    {n.state === "accepted" ? t.accepted : t.declined}
                </div>
            ) : (
                <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                    <button className="btn btn--sm btn--accent" disabled={busy} onClick={onAccept}>
                        {busy ? <BtnSpinner /> : <Icon n="check" sm />} {t.accept}
                    </button>
                    <button className="btn btn--sm" disabled={busy} onClick={onDecline}>
                        <Icon n="x" sm /> {t.decline}
                    </button>
                </div>
            )}
        </div>
    );
}
