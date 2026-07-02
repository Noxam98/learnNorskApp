// «Что нового» — история обновлений приложения (записи генерирует страж пуша на бэке).
// Живёт в App: сам тянет /changelog, авто-открывается ОДИН раз при свежих записях
// (последний увиденный id — в localStorage), плюс открывается вручную из Профиля
// через openWhatsNew(). Дизайн — аккордеон по дням: свежий день раскрыт, старые
// свёрнуты в краткую сводку (мини-точки типов + первые заголовки), тап — подробности;
// внизу «Показать ещё» листает ВСЮ историю (offset-страницы).
import { useEffect, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "./Icon.jsx";
import api from "../tools/api.js";
import { langGuard } from "../../interface/i18nGuard.js";

export const WN = langGuard({
    ru:  { title: "Что нового", sub: "Приложение растёт — вот история изменений", close: "Понятно", empty: "Пока пусто — всё новое появится здесь.", more: "Показать ещё" },
    en:  { title: "What's new", sub: "The app keeps growing — here's the change history", close: "Got it", empty: "Nothing yet — updates will show up here.", more: "Show more" },
    ukr: { title: "Що нового", sub: "Застосунок росте — ось історія змін", close: "Зрозуміло", empty: "Поки порожньо — нове з'явиться тут.", more: "Показати ще" },
    pl:  { title: "Co nowego", sub: "Aplikacja rośnie — oto historia zmian", close: "Jasne", empty: "Na razie pusto — nowości pojawią się tutaj.", more: "Pokaż więcej" },
    lt:  { title: "Kas naujo", sub: "Programėlė auga — štai pakeitimų istorija", close: "Supratau", empty: "Kol kas tuščia — naujienos bus čia.", more: "Rodyti daugiau" },
    lv:  { title: "Kas jauns", sub: "Lietotne aug — te izmaiņu vēsture", close: "Skaidrs", empty: "Pagaidām tukšs — jaunumi parādīsies šeit.", more: "Rādīt vairāk" },
    ar:  { title: "ما الجديد", sub: "التطبيق ينمو — إليك سجلّ التغييرات", close: "حسنًا", empty: "لا شيء بعد — ستظهر التحديثات هنا.", more: "عرض المزيد" },
}, "WhatsNew.WN");

// Тип записи → иконка спрайта + css-модификатор точки таймлайна.
const KIND = {
    feature: { ic: "sparkles", cls: "feature" },
    fix:     { ic: "check-circle", cls: "fix" },
    perf:    { ic: "zap", cls: "perf" },
    ui:      { ic: "edit", cls: "ui" },
};

const PAGE = 20;   // размер offset-страницы «Показать ещё»
const SEEN_KEY = "ln_changelog_seen";
const seenId = () => { try { return Number(localStorage.getItem(SEEN_KEY) || 0); } catch { return 0; } };
const markSeen = (id) => { try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* private mode */ } };

// Заголовок/описание записи на языке UI (фолбэк en → ru → первый доступный).
export const wnText = (e, lang) => {
    const i = e?.i18n || {};
    return i[lang] || i.en || i.ru || Object.values(i)[0] || {};
};

// Модуль-опенер: Профиль (и кто угодно) открывает панель без пробрасывания пропсов.
let _open = null;
export const openWhatsNew = () => { _open?.(); };

// День → локализованная короткая дата («2 июля»).
const fmtDay = (day, lang) => {
    try {
        return new Date(day + "T00:00:00").toLocaleDateString(
            lang === "ukr" ? "uk" : lang, { day: "numeric", month: "long" });
    } catch { return day; }
};

export default function WhatsNew() {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = WN[lang] || WN.en;
    const [entries, setEntries] = useState(/** @type {any[]} */([]));
    const [total, setTotal] = useState(0);
    const [open, setOpen] = useState(false);
    const [openDays, setOpenDays] = useState(/** @type {Record<string, boolean>} */({}));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        _open = () => setOpen(true);
        let alive = true;
        api.getChangelog(PAGE).then((r) => {
            if (!alive) return;
            const list = r?.entries || [];
            setEntries(list);
            setTotal(r?.total ?? list.length);
            // авто-показ ОДИН раз на свежие записи (и не в первый визит после регистрации:
            // пустой seen + записи = скорее всего новый юзер, ему история не нужна)
            if (list.length && seenId() > 0 && list[0].id > seenId()) setOpen(true);
            if (list.length && seenId() === 0) markSeen(list[0].id);
        }).catch(() => { /* офлайн — просто без ченжлога */ });
        return () => { alive = false; _open = null; };
    }, []);

    const close = () => {
        if (entries.length) markSeen(entries[0].id);
        setOpen(false);
    };

    const loadMore = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const r = await api.getChangelog(PAGE, entries.length);
            setEntries((cur) => [...cur, ...(r?.entries || [])]);
            setTotal(r?.total ?? total);
        } catch { /* офлайн */ }
        setLoading(false);
    };

    // группировка по дням, свежие первыми (порядок с бэка уже свежие→старые)
    const days = [];
    for (const e of entries) {
        const last = days[days.length - 1];
        if (last && last.day === e.day) last.items.push(e);
        else days.push({ day: e.day, items: [e] });
    }
    // свежий день раскрыт по умолчанию; остальные — по клику (аккордеон)
    const isDayOpen = (d, di) => openDays[d.day] ?? (di === 0);
    const toggleDay = (d) => setOpenDays((cur) => ({ ...cur, [d.day]: !isDayOpen(d, days.indexOf(d)) }));
    // краткая сводка свёрнутого дня: до двух заголовков + «+N»
    const daySummary = (d) => {
        const titles = d.items.map((e) => wnText(e, lang).t).filter(Boolean);
        const head = titles.slice(0, 2).join(" · ");
        return titles.length > 2 ? `${head} · +${titles.length - 2}` : head;
    };

    if (!open) return null;
    return (
        <div className="wn-backdrop" onClick={close}>
            <section className="wn" role="dialog" aria-modal="true" aria-label={t.title}
                onClick={(e) => e.stopPropagation()}>
                <span className="wn__halo" aria-hidden="true" />
                <header className="wn__head">
                    <span className="wn__spark"><Icon n="sparkles" /></span>
                    <div className="wn__titles">
                        <h2 className="wn__title">{t.title}</h2>
                        <p className="wn__sub">{t.sub}</p>
                    </div>
                    <button className="wn__x" onClick={close} aria-label="×"><Icon n="x" sm /></button>
                </header>
                <div className="wn__scroll">
                    {!days.length && <p className="wn__empty">{t.empty}</p>}
                    {days.map((d, di) => {
                        const expanded = isDayOpen(d, di);
                        return (
                            <div className="wn__day" key={d.day}>
                                {/* шапка дня: дата + мини-точки типов; свёрнут → краткая сводка заголовков */}
                                <button type="button" className={`wn__daybtn${expanded ? " is-open" : ""}`}
                                    onClick={() => toggleDay(d)} aria-expanded={expanded}>
                                    <span className="wn__date">{fmtDay(d.day, lang)}</span>
                                    <span className="wn__minidots" aria-hidden="true">
                                        {d.items.slice(0, 5).map((e) => (
                                            <i key={e.id} className={`wn__minidot wn__minidot--${(KIND[e.kind] || KIND.feature).cls}`} />
                                        ))}
                                    </span>
                                    <span className="wn__chev"><Icon n="chevron-down" sm /></span>
                                    {!expanded && <span className="wn__gist">{daySummary(d)}</span>}
                                </button>
                                {expanded && d.items.map((e, i) => {
                                    const k = KIND[e.kind] || KIND.feature;
                                    const txt = wnText(e, lang);
                                    return (
                                        <div className="wn__item" key={e.id}
                                            style={{ animationDelay: `${(0.04 * i).toFixed(2)}s` }}>
                                            <span className={`wn__dot wn__dot--${k.cls}`}><Icon n={k.ic} sm /></span>
                                            <div className="wn__body">
                                                <div className="wn__t">{txt.t}</div>
                                                {txt.d && <div className="wn__d">{txt.d}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {entries.length < total && (
                        <button type="button" className="wn__more" onClick={loadMore} disabled={loading}>
                            {loading ? <span className="ln-spin" aria-hidden="true" /> : <Icon n="chevron-down" sm />} {t.more}
                        </button>
                    )}
                </div>
                <button className="wn__ok" onClick={close}>{t.close}</button>
            </section>
        </div>
    );
}
