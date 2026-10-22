// Вкладка «Друзья» панели уведомлений: мои друзья (кто сегодня занимался — наверх), поиск
// новых, мои висящие заявки. Тап по человеку — мини-профиль (useSocialStore.openProfile).
// Перечитывается по friendsTick: заявку могли принять во вкладке «Лента» или в профиле.
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { pl } from "../ui/plural.js";
import api from "../tools/api.js";
import { useSocialStore } from "../../store/socialStore.jsx";
import { usePeopleSearch } from "./usePeopleSearch.js";
import FriendButton, { Avatar } from "./FriendButton.jsx";
import { F } from "./Social.i18n.js";

/** @param {{ lang: string }} p */
export default function FriendsTab({ lang }) {
    const f = F[lang] || F.ru;
    const tick = useSocialStore((s) => s.friendsTick);
    const openProfile = useSocialStore((s) => s.openProfile);
    const [data, setData] = useState(/** @type {any} */(null));
    const [q, setQ] = useState("");
    const { users, setUsers, loading, short, searched } = usePeopleSearch(q);

    const load = useCallback(() => {
        api.friendsList().then(setData).catch(() => setData({ friends: [], outgoing: [] }));
    }, []);
    useEffect(() => { load(); }, [load, tick]);

    const cancel = async (id) => {
        setData((d) => d && { ...d, outgoing: d.outgoing.filter((/** @type {any} */ o) => o.id !== id) });
        await api.friendRemove(id).catch(() => load());
    };

    const friends = data?.friends || [];
    const outgoing = data?.outgoing || [];
    return (
        <div className="soc-tab">
            <div className="soc-search">
                <Icon n="search" sm />
                <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${f.find}: ${f.ph}`}
                    autoComplete="off" spellCheck="false" aria-label={f.find} />
            </div>

            {searched || short ? (
                <div className="soc-list">
                    {short ? <div className="soc-note">{f.short}</div>
                        : loading ? <div className="soc-note"><BtnSpinner /></div>
                            : !users.length ? <div className="soc-note">{f.empty}</div>
                                : users.map((u) => (
                                    <div key={u.id} className="soc-row" role="button" tabIndex={0} onClick={() => openProfile(u.id)}>
                                        <Avatar name={u.name} />
                                        <span className="soc-row__meta"><span className="soc-row__t">{u.name}</span></span>
                                        <FriendButton userId={u.id} rel={u.rel || "none"} lang={lang}
                                            onChange={(rel) => setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, rel } : x)))} />
                                    </div>
                                ))}
                </div>
            ) : !data ? (
                <div className="soc-note"><BtnSpinner /></div>
            ) : (
                <>
                    {friends.length === 0 ? (
                        <div className="empty empty--mini">
                            <div className="empty__ic"><Icon n="user" lg /></div>
                            <div className="empty__t">{f.none}</div>
                            <div className="empty__d">{f.noneHint}</div>
                        </div>
                    ) : (
                        <div className="soc-list">
                            {friends.map((/** @type {any} */ fr) => (
                                <div key={fr.id} className="soc-row" role="button" tabIndex={0} onClick={() => openProfile(fr.id)}>
                                    <span className="soc-avatar-wrap">
                                        <Avatar name={fr.name} size={34} />
                                        {fr.today && <span className="soc-dot" title={f.today} />}
                                    </span>
                                    <span className="soc-row__meta">
                                        <span className="soc-row__t">{fr.name}</span>
                                        <span className="soc-row__d">
                                            {fr.level}
                                            {fr.streak > 0 && <> · <Icon n="flame" sm /> {fr.streak} {pl(lang, fr.streak, "day")}</>}
                                        </span>
                                    </span>
                                    <span className="soc-row__pts"><b>{fr.weekPts}</b><i>{f.week}</i></span>
                                </div>
                            ))}
                        </div>
                    )}
                    {outgoing.length > 0 && (
                        <>
                            <div className="soc-sub">{f.waiting}</div>
                            <div className="soc-list">
                                {outgoing.map((/** @type {any} */ o) => (
                                    <div key={o.id} className="soc-row">
                                        <Avatar name={o.name} />
                                        <span className="soc-row__meta"><span className="soc-row__t">{o.name}</span></span>
                                        <button className="btn btn--sm btn--ghost" onClick={() => cancel(o.id)}>
                                            <Icon n="x" sm /> {f.cancel}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
