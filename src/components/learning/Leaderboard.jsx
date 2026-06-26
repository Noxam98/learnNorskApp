// @ts-check
// Рейтинг учеников. Метрика недели — очки = верные ответы за текущую неделю (Пн, UTC);
// «за всё время» — число выученных слов. Компактная карточка (главная «Сегодня») + модалка
// с полным списком и тумблером периода. Логин/email не показываем; имя = display_name или «Аноним».
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import api from "../tools/api.js";
import { langGuard } from "../../interface/i18nGuard.js";

const T = langGuard({
    ru:  { title: "Рейтинг", weekTitle: "Рейтинг недели", week: "Неделя", all: "За всё время",
           you: "ты", of: "из", pts: "очк.", words: "слов", anon: "Аноним", seeAll: "Все",
           empty: "Пока пусто. Позанимайся — и попадёшь в рейтинг.",
           notYet: "Занимайся, чтобы попасть в рейтинг недели",
           hidden: "Ты скрыт из рейтинга — включить можно в Профиле.", loading: "Загрузка…" },
    ukr: { title: "Рейтинг", weekTitle: "Рейтинг тижня", week: "Тиждень", all: "За весь час",
           you: "ти", of: "з", pts: "очок", words: "слів", anon: "Анонім", seeAll: "Усі",
           empty: "Поки порожньо. Позаймайся — і потрапиш у рейтинг.",
           notYet: "Займайся, щоб потрапити в рейтинг тижня",
           hidden: "Тебе приховано з рейтингу — увімкнути можна в Профілі.", loading: "Завантаження…" },
    en:  { title: "Leaderboard", weekTitle: "Weekly leaderboard", week: "Week", all: "All time",
           you: "you", of: "of", pts: "pts", words: "words", anon: "Anonymous", seeAll: "All",
           empty: "Empty for now. Practice to join the leaderboard.",
           notYet: "Practice to join this week's leaderboard",
           hidden: "You're hidden from the leaderboard — enable it in Profile.", loading: "Loading…" },
    pl:  { title: "Ranking", weekTitle: "Ranking tygodnia", week: "Tydzień", all: "Cały czas",
           you: "ty", of: "z", pts: "pkt", words: "słów", anon: "Anonim", seeAll: "Wszyscy",
           empty: "Na razie pusto. Poćwicz — i trafisz do rankingu.",
           notYet: "Ćwicz, aby trafić do rankingu tygodnia",
           hidden: "Jesteś ukryty w rankingu — włącz w Profilu.", loading: "Ładowanie…" },
    lt:  { title: "Reitingas", weekTitle: "Savaitės reitingas", week: "Savaitė", all: "Visą laiką",
           you: "tu", of: "iš", pts: "tšk.", words: "žodž.", anon: "Anonimas", seeAll: "Visi",
           empty: "Kol kas tuščia. Pasimokyk — ir pateksi į reitingą.",
           notYet: "Mokykis, kad patektum į savaitės reitingą",
           hidden: "Tu paslėptas reitinge — įjunk Profilyje.", loading: "Kraunama…" },
    lv:  { title: "Reitings", weekTitle: "Nedēļas reitings", week: "Nedēļa", all: "Visu laiku",
           you: "tu", of: "no", pts: "p.", words: "vārdi", anon: "Anonīms", seeAll: "Visi",
           empty: "Pagaidām tukšs. Patrenējies — un nokļūsi reitingā.",
           notYet: "Trenējies, lai nokļūtu šīs nedēļas reitingā",
           hidden: "Tu esi paslēpts no reitinga — ieslēdz to Profilā.", loading: "Ielāde…" },
    ar:  { title: "لوحة المتصدرين", weekTitle: "لوحة الأسبوع", week: "الأسبوع", all: "كل الأوقات",
           you: "أنت", of: "من", pts: "نقطة", words: "كلمات", anon: "مجهول", seeAll: "الكل",
           empty: "فارغة الآن. تدرّب لتنضمّ إلى لوحة المتصدرين.",
           notYet: "تدرّب لتنضمّ إلى لوحة هذا الأسبوع",
           hidden: "أنت مخفيّ من اللوحة — فعّلها من الملف الشخصي.", loading: "جارٍ التحميل…" },
}, "Leaderboard.T");

const MEDAL_CLS = { 1: "lb-medal--gold", 2: "lb-medal--silver", 3: "lb-medal--bronze" };
// Ранг: топ-3 — нарисованная медаль (золото/серебро/бронза), дальше — «#N».
/** @param {{ rank: number, lg?: boolean }} p */
const Rank = ({ rank, lg }) => (rank >= 1 && rank <= 3)
    ? <Icon n="medal" className={`lb-medal ${MEDAL_CLS[rank]}${lg ? " lb-medal--lg" : ""}`} />
    : <span className="lb-rankn">#{rank}</span>;

/** @param {{ e: any, t: any, period: string }} p */
const Row = ({ e, t, period }) => (
    <div className={"lb-row" + (e.me ? " lb-row--me" : "")}>
        <span className="lb-row__rank"><Rank rank={e.rank} /></span>
        <span className="lb-row__name">{e.name || t.anon}{e.me ? <span className="lb-row__you"> · {t.you}</span> : null}</span>
        {e.level ? <span className="lb-row__lvl">{e.level}</span> : null}
        <span className="lb-row__pts">{e.points} <i>{period === "all" ? t.words : t.pts}</i></span>
    </div>
);

/** Полная модалка рейтинга (тумблер неделя/всё время). @param {{ lang?: string, onClose: () => void }} p */
export function LeaderboardModal({ lang = "ru", onClose }) {
    const t = T[lang] || T.en;
    const [period, setPeriod] = useState("week");
    const [data, setData] = useState(/** @type {any} */(null));
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let on = true; setLoading(true);
        api.leaderboard(period, 100).then((d) => { if (on) { setData(d); setLoading(false); } }).catch(() => { if (on) setLoading(false); });
        return () => { on = false; };
    }, [period]);
    const top = data?.top || [];
    const me = data?.me;
    const meInTop = !!(me && top.some((/** @type {any} */ e) => e.me));
    return (
        <div className="lb-overlay" onClick={onClose}>
            <div className="lb-panel" onClick={(e) => e.stopPropagation()}>
                <div className="lb-panel__head">
                    <span className="lb-panel__title"><Icon n="award" sm /> {t.title}</span>
                    <button className="lb-x" onClick={onClose} aria-label="close"><Icon n="x" sm /></button>
                </div>
                <div className="lb-seg">
                    <button className={"lb-seg__b" + (period === "week" ? " is-on" : "")} onClick={() => setPeriod("week")}>{t.week}</button>
                    <button className={"lb-seg__b" + (period === "all" ? " is-on" : "")} onClick={() => setPeriod("all")}>{t.all}</button>
                </div>
                <div className="lb-list">
                    {loading ? <div className="lb-empty">{t.loading}</div>
                        : top.length === 0 ? <div className="lb-empty">{t.empty}</div>
                            : top.map((/** @type {any} */ e) => <Row key={e.rank} e={e} t={t} period={period} />)}
                </div>
                {data?.optedOut
                    ? <div className="lb-foot lb-foot--note">{t.hidden}</div>
                    : (me && !meInTop) ? <div className="lb-foot"><Row e={me} t={t} period={period} /></div> : null}
            </div>
        </div>
    );
}

/** Компактная карточка на «Сегодня». @param {{ lang?: string, onOpen: () => void }} p */
export function LeaderboardCard({ lang = "ru", onOpen }) {
    const t = T[lang] || T.en;
    const [data, setData] = useState(/** @type {any} */(null));
    useEffect(() => {
        let on = true;
        api.leaderboard("week", 3).then((d) => { if (on) setData(d); }).catch(() => {});
        return () => { on = false; };
    }, []);
    if (!data) return null;
    const me = data.me;
    return (
        <div className="spanel lb-card" role="button" tabIndex={0} onClick={onOpen}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}>
            <div className="spanel__head">
                <span className="spanel__title"><Icon n="award" sm /> {t.weekTitle}</span>
                <span className="lb-card__all">{t.seeAll} <Icon n="arrow-right" sm /></span>
            </div>
            <div className="spanel__body">
                {me ? (
                    <div className="lb-card__me">
                        <span className="lb-card__rank"><Rank rank={me.rank} lg /></span>
                        <span className="lb-card__metab"><b>{t.you}</b> · {me.points} {t.pts}</span>
                        <span className="lb-card__of">{t.of} {data.count}</span>
                    </div>
                ) : (
                    <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{data.optedOut ? t.hidden : t.notYet}</div>
                )}
                {data.top?.length > 0 && (
                    <div className="lb-card__top">
                        {data.top.slice(0, 3).map((/** @type {any} */ e) => (
                            <div key={e.rank} className={"lb-mini" + (e.me ? " lb-mini--me" : "")}>
                                <span className="lb-mini__r"><Rank rank={e.rank} /></span>
                                <span className="lb-mini__n">{e.name || t.anon}</span>
                                <span className="lb-mini__p">{e.points}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
