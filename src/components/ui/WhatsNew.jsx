// «Что нового» — таймлайн обновлений приложения (записи генерирует страж пуша на бэке).
// Живёт в App: сам тянет /changelog, авто-открывается ОДИН раз при свежих записях
// (последний увиденный id — в localStorage), плюс открывается вручную из Профиля
// через openWhatsNew(). Дизайн — вертикальный таймлайн с цветом типа записи
// (✨ фича / ✓ фикс / ⚡ скорость / ✎ интерфейс), сгруппированный по дням.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "./Icon.jsx";
import api from "../tools/api.js";
import { langGuard } from "../../interface/i18nGuard.js";

export const WN = langGuard({
    ru:  { title: "Что нового", sub: "Приложение растёт — вот свежие изменения", close: "Понятно", empty: "Пока пусто — всё новое появится здесь." },
    en:  { title: "What's new", sub: "The app keeps growing — here's what changed", close: "Got it", empty: "Nothing yet — updates will show up here." },
    ukr: { title: "Що нового", sub: "Застосунок росте — ось свіжі зміни", close: "Зрозуміло", empty: "Поки порожньо — нове з'явиться тут." },
    pl:  { title: "Co nowego", sub: "Aplikacja rośnie — oto świeże zmiany", close: "Jasne", empty: "Na razie pusto — nowości pojawią się tutaj." },
    lt:  { title: "Kas naujo", sub: "Programėlė auga — štai naujausi pakeitimai", close: "Supratau", empty: "Kol kas tuščia — naujienos bus čia." },
    lv:  { title: "Kas jauns", sub: "Lietotne aug — te jaunākās izmaiņas", close: "Skaidrs", empty: "Pagaidām tukšs — jaunumi parādīsies šeit." },
    ar:  { title: "ما الجديد", sub: "التطبيق ينمو — إليك أحدث التغييرات", close: "حسنًا", empty: "لا شيء بعد — ستظهر التحديثات هنا." },
}, "WhatsNew.WN");

// Тип записи → иконка спрайта + css-модификатор точки таймлайна.
const KIND = {
    feature: { ic: "sparkles", cls: "feature" },
    fix:     { ic: "check-circle", cls: "fix" },
    perf:    { ic: "zap", cls: "perf" },
    ui:      { ic: "edit", cls: "ui" },
};

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
    const [open, setOpen] = useState(false);

    useEffect(() => {
        _open = () => setOpen(true);
        let alive = true;
        api.getChangelog(30).then((r) => {
            if (!alive) return;
            const list = r?.entries || [];
            setEntries(list);
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

    // группировка по дням, свежие первыми (порядок с бэка уже свежие→старые)
    const days = [];
    for (const e of entries) {
        const last = days[days.length - 1];
        if (last && last.day === e.day) last.items.push(e);
        else days.push({ day: e.day, items: [e] });
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="wn-backdrop" onClick={close}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <motion.section className="wn" role="dialog" aria-modal="true" aria-label={t.title}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 28, scale: 0.98 }} transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}>
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
                            {days.map((d, di) => (
                                <div className="wn__day" key={d.day + di}>
                                    <div className="wn__date">{fmtDay(d.day, lang)}</div>
                                    {d.items.map((e, i) => {
                                        const k = KIND[e.kind] || KIND.feature;
                                        const txt = wnText(e, lang);
                                        return (
                                            <motion.div className="wn__item" key={e.id}
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.05 * i + 0.03 * di, duration: 0.2 }}>
                                                <span className={`wn__dot wn__dot--${k.cls}`}><Icon n={k.ic} sm /></span>
                                                <div className="wn__body">
                                                    <div className="wn__t">{txt.t}</div>
                                                    {txt.d && <div className="wn__d">{txt.d}</div>}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <button className="wn__ok" onClick={close}>{t.close}</button>
                    </motion.section>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
