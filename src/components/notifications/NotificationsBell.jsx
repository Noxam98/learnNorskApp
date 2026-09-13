// Колокольчик в шапке + панель уведомлений. Место «на вырост»: панель рисует ЛЮБОЙ тип из
// ленты, а конкретный тип знает только про свою карточку (сейчас единственный — set_share,
// предложение забрать чужой набор: «Принять» создаёт свою копию, «Отклонить» закрывает).
import { useEffect, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import { pl } from "../ui/plural.js";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { N } from "./Notifications.i18n.js";

const fmt = (s, vars) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));

export default function NotificationsBell() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = N[lang] || N.ru;
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const { items, unread, loading, load, markRead, accept, decline } = useNotifyStore();

    // Подтягиваем при входе и при возврате фокуса — поллинга нет, это почтовый ящик, не чат.
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

    const openPanel = () => { setOpen(true); load(true); markRead(); };
    if (!user) return null;

    return (
        <>
            <button className="nav__theme nav__bell" aria-label={t.bell} title={t.bell} onClick={openPanel}>
                <Icon n="bell" sm />
                {unread > 0 && <span className="nav__bell-dot">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {open && (
                <Panel t={t} lang={lang} items={items} loading={loading} busyId={busyId}
                    onClose={() => setOpen(false)}
                    onAccept={async (n) => {
                        setBusyId(n.id);
                        try {
                            const r = await accept(n.id);
                            if (r?.name) useSystemStore.getState().showToast(fmt(t.acceptedToast, { set: r.name }), "success");
                        } catch { /* панель покажет актуальное состояние после load */ }
                        finally { setBusyId(null); }
                    }}
                    onDecline={async (n) => {
                        setBusyId(n.id);
                        try { await decline(n.id); } catch { /* */ }
                        finally { setBusyId(null); }
                    }} />
            )}
        </>
    );
}

function Panel({ t, lang, items, loading, busyId, onClose, onAccept, onDecline }) {
    useHistoryClose(true, onClose);   // системная «Назад»/свайп закрывает панель, а не приложение
    return (
        <div className="wn-backdrop" onClick={onClose}>
            <section className="wn" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
                <span className="wn__halo" aria-hidden="true" />
                <header className="wn__head">
                    <span className="wn__spark"><Icon n="bell" /></span>
                    <div className="wn__titles"><h2 className="wn__title">{t.title}</h2></div>
                    <button className="wn__x" onClick={onClose} aria-label={t.close}><Icon n="x" sm /></button>
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
                            onAccept={() => onAccept(n)} onDecline={() => onDecline(n)} />
                    ))}
                </div>
                <button className="wn__ok" onClick={onClose}>{t.close}</button>
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
