// Мини-профиль человека: уровень, выучено, серия, очки недели, хитмап за 12 недель и его
// опубликованные наборы (взять копию прямо отсюда). Открывается откуда угодно через
// useSocialStore.openProfile(id), рендерится один раз (NavigationBar).
//
// Свой оверлей, а не общий Modal: профиль открывают ПОВЕРХ панели уведомлений и рейтинга
// (у них z-index выше модалок), и он обязан быть над ними.
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { pl } from "../ui/plural.js";
import api from "../tools/api.js";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import FriendButton, { Avatar } from "./FriendButton.jsx";
import { P, C } from "./Social.i18n.js";

const HEAT_DAYS = 84;

/** Хитмап активности: тот же вид, что в «Прогрессе», но короче (12 недель). */
function Heat({ activity }) {
    const map = {};
    (activity || []).forEach((/** @type {any} */ d) => { map[d.day] = d.answers || 0; });
    const cells = [];
    const today = new Date();
    for (let i = HEAT_DAYS - 1; i >= 0; i--) {
        const dt = new Date(today); dt.setDate(today.getDate() - i);
        const key = dt.toISOString().slice(0, 10);
        cells.push({ key, n: map[key] || 0 });
    }
    const max = Math.max(1, ...cells.map((c) => c.n));
    const lvl = (n) => (n <= 0 ? 0 : n >= max * 0.75 ? 4 : n >= max * 0.5 ? 3 : n >= max * 0.25 ? 2 : 1);
    const color = (l) => (l === 0 ? "var(--surface-3)" : `color-mix(in srgb, var(--fjord-600) ${l * 25}%, var(--surface-3))`);
    return (
        <div className="soc-heat">
            {cells.map((c) => <span key={c.key} title={`${c.key}: ${c.n}`} style={{ background: color(lvl(c.n)) }} />)}
        </div>
    );
}

export default function ProfileModal() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const p = P[lang] || P.ru;
    const c = C[lang] || C.ru;
    const nav = interfaceTranslate[lang] || interfaceTranslate.en;
    const id = useSocialStore((s) => s.profileId);
    const close = useSocialStore((s) => s.closeProfile);
    const [data, setData] = useState(/** @type {any} */(null));
    const [err, setErr] = useState(false);
    const [busySet, setBusySet] = useState(/** @type {number|null} */(null));
    useHistoryClose(id != null, close);

    useEffect(() => {
        if (id == null) return;
        let on = true;
        setData(null); setErr(false);
        api.userProfile(id).then((d) => { if (on) setData(d); }).catch(() => { if (on) setErr(true); });
        return () => { on = false; };
    }, [id]);

    if (id == null) return null;

    const take = async (/** @type {any} */ s) => {
        setBusySet(s.id);
        try {
            const r = await api.catalogClone(s.id);
            useSystemStore.getState().showToast(c.takenToast.replace("{set}", r?.name || s.name), "success");
            useSocialStore.getState().bumpSets();
            setData((d) => d && { ...d, sets: d.sets.map((x) => (x.id === s.id ? { ...x, taken: true, clones: x.clones + (x.taken ? 0 : 1) } : x)) });
        } catch { useSystemStore.getState().showToast(c.errGeneric); }
        finally { setBusySet(null); }
    };

    const unfriend = async () => {
        await api.friendRemove(id).catch(() => {});
        useSocialStore.getState().bumpFriends();
        setData((d) => d && { ...d, rel: "none" });
    };

    const name = data?.name || p.anon;
    return (
        <div className="lb-overlay soc-top" onClick={close}>
            <div className="lb-panel soc-profile" role="dialog" aria-modal="true" aria-label={name} onClick={(e) => e.stopPropagation()}>
                <div className="lb-panel__head">
                    {/* имя — в карточке ниже, в шапке только раздел (иначе оно повторялось дважды) */}
                    <span className="lb-panel__title"><Icon n="user" sm /> {nav.navBar?.profile || p.loading}</span>
                    <button className="lb-x" onClick={close} aria-label="close"><Icon n="x" sm /></button>
                </div>
                <div className="soc-profile__body">
                    {err ? <div className="lb-empty">{p.notFound}</div> : !data ? (
                        <div className="lb-empty"><BtnSpinner /></div>
                    ) : (
                        <>
                            <div className="soc-profile__hero">
                                <Avatar name={name} size={52} />
                                <div className="soc-profile__who">
                                    <b>{name}</b>
                                    {data.rel === "self" && <span className="muted">{p.you}</span>}
                                </div>
                                <FriendButton userId={data.id} rel={data.rel} lang={lang}
                                    onChange={(rel) => setData((d) => d && { ...d, rel })} />
                            </div>

                            {data.hidden ? (
                                <div className="soc-note"><Icon n="eye-off" sm /> {p.hidden}</div>
                            ) : (
                                <>
                                    <div className="soc-stats">
                                        <div><span>{p.level}</span><b>{data.level}</b></div>
                                        <div><span>{p.mastered}</span><b>{data.mastered}</b></div>
                                        <div><span>{p.streak}</span><b><Icon n="flame" sm /> {data.streak}</b><i>{pl(lang, data.streak, "day")}</i></div>
                                        <div><span>{p.week}</span><b>{data.weekPts}</b></div>
                                    </div>
                                    <div className="soc-sub">{p.activity}</div>
                                    <Heat activity={data.activity} />
                                </>
                            )}

                            {data.sets?.length > 0 && (
                                <>
                                    <div className="soc-sub">{p.sets}</div>
                                    <div className="soc-list">
                                        {data.sets.map((/** @type {any} */ s) => (
                                            <div key={s.id} className="soc-row">
                                                <span className="setrow__ic"><Icon n="layers" sm /></span>
                                                <span className="soc-row__meta">
                                                    <span className="soc-row__t">{s.name}</span>
                                                    <span className="soc-row__d">
                                                        {s.level ? `${s.level} · ` : ""}{s.count} {pl(lang, s.count, "word")} · {c.took.replace("{n}", String(s.clones))}
                                                    </span>
                                                </span>
                                                {!s.mine && (
                                                    <button className="btn btn--sm" disabled={s.taken || busySet === s.id} onClick={() => take(s)}>
                                                        {busySet === s.id ? <BtnSpinner /> : <Icon n={s.taken ? "check" : "download"} sm />} {s.taken ? c.taken : c.take}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {data.rel === "friend" && (
                                <button className="soc-link" onClick={unfriend}>{p.remove}</button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
