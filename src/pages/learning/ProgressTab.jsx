// Вкладка «Прогресс» раздела «Учёба».
// Рисуем только те части дизайна, что обеспечены реальными данными бэкенда:
//   - плитки: «Выучено всего», «Всего слов», «К повторению», «Текущий уровень»;
//   - донат «Слова по статусам» (conic-gradient из byStatus) + легенда;
//   - бары «Прогресс по уровням CEFR» (byLevel: mastered/target);
//   - полки фокуса «Твои слабые слова» и «Почти выучено».
// НЕ показываем: удержание (retention), серию (streak), среднюю точность, heatmap —
// бэкенд их не отдаёт, фейковые цифры рисовать нельзя.
import { useEffect, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { StatusDot, StrengthBar, statusLabel } from "../../components/learning/StatusBits.jsx";
import { BrandLoader } from "../../components/ui/Spinner.jsx";

// Локальная i18n (5 языков) — interfaceTranslation.jsx не трогаем.
const T = {
    ru: {
        sub: "Как растёт твой активный словарь",
        masteredTotal: "Выучено всего", wordsTotal: "Всего слов", due: "К повторению", level: "Текущий уровень", retention: "Удержание", accuracy: "Точность", streak: "Серия", streakDays: "дней", perWeek: "+{n} за неделю", activity: "Активность",
        byStatus: "Слова по статусам", words: "слова", totalOf: "всего",
        levels: "Прогресс по уровням CEFR",
        weak: "Твои слабые слова", almost: "Почти выучено",
        toPractice: "В практику", reinforce: "Закрепить",
        empty: "Пока пусто", noData: "нет данных", toNext: "до уровня",
    },
    en: {
        sub: "How your active vocabulary grows",
        masteredTotal: "Mastered total", wordsTotal: "Total words", due: "To review", level: "Current level", retention: "Retention", accuracy: "Accuracy", streak: "Streak", streakDays: "days", perWeek: "+{n} this week", activity: "Activity",
        byStatus: "Words by status", words: "words", totalOf: "total",
        levels: "CEFR level progress",
        weak: "Your weak words", almost: "Almost mastered",
        toPractice: "Practice", reinforce: "Reinforce",
        empty: "Nothing here yet", noData: "no data", toNext: "to level",
    },
    ukr: {
        sub: "Як росте твій активний словник",
        masteredTotal: "Вивчено всього", wordsTotal: "Усього слів", due: "До повторення", level: "Поточний рівень", retention: "Утримання", accuracy: "Точність", streak: "Серія", streakDays: "днів", perWeek: "+{n} за тиждень", activity: "Активність",
        byStatus: "Слова за статусами", words: "слова", totalOf: "усього",
        levels: "Прогрес за рівнями CEFR",
        weak: "Твої слабкі слова", almost: "Майже вивчено",
        toPractice: "У практику", reinforce: "Закріпити",
        empty: "Поки порожньо", noData: "немає даних", toNext: "до рівня",
    },
    pl: {
        sub: "Jak rośnie Twój aktywny słownik",
        masteredTotal: "Opanowane łącznie", wordsTotal: "Wszystkich słów", due: "Do powtórki", level: "Aktualny poziom", retention: "Utrzymanie", accuracy: "Celność", streak: "Seria", streakDays: "dni", perWeek: "+{n} w tym tyg.", activity: "Aktywność",
        byStatus: "Słowa wg statusu", words: "słowa", totalOf: "łącznie",
        levels: "Postęp wg poziomów CEFR",
        weak: "Twoje słabe słowa", almost: "Prawie opanowane",
        toPractice: "Do ćwiczeń", reinforce: "Utrwal",
        empty: "Na razie pusto", noData: "brak danych", toNext: "do poziomu",
    },
    lt: {
        sub: "Kaip auga tavo aktyvusis žodynas",
        masteredTotal: "Iš viso išmokta", wordsTotal: "Iš viso žodžių", due: "Kartoti", level: "Dabartinis lygis", retention: "Išlaikymas", accuracy: "Tikslumas", streak: "Serija", streakDays: "d.", perWeek: "+{n} per savaitę", activity: "Aktyvumas",
        byStatus: "Žodžiai pagal būseną", words: "žodžiai", totalOf: "iš viso",
        levels: "CEFR lygių pažanga",
        weak: "Tavo silpni žodžiai", almost: "Beveik išmokta",
        toPractice: "Praktika", reinforce: "Įtvirtinti",
        empty: "Kol kas tuščia", noData: "nėra duomenų", toNext: "iki lygio",
    },
};

// Холодные состояния («нет данных ≠ 0»): баннер теста + что разблокируется.
const COLD = {
    ru:  { t: "Определим твой уровень", d: "Пройди вводный тест — подберём слова и сложность под тебя.", btn: "Пройти тест", unlock: "Метрики появятся после первых сессий", heat: "Начни сегодня — клетки активности заполнятся" },
    en:  { t: "Let's find your level", d: "Take the placement test — we'll tailor words and difficulty.", btn: "Take test", unlock: "Metrics appear after your first sessions", heat: "Start today — activity cells will fill in" },
    ukr: { t: "Визначимо твій рівень", d: "Пройди вступний тест — підберемо слова й складність.", btn: "Пройти тест", unlock: "Метрики з'являться після перших сесій", heat: "Почни сьогодні — клітинки активності заповняться" },
    pl:  { t: "Określmy twój poziom", d: "Zrób test poziomujący — dobierzemy słowa i trudność.", btn: "Zrób test", unlock: "Metryki pojawią się po pierwszych sesjach", heat: "Zacznij dziś — komórki aktywności się wypełnią" },
    lt:  { t: "Nustatykime tavo lygį", d: "Atlik lygio testą — pritaikysime žodžius ir sudėtingumą.", btn: "Atlikti testą", unlock: "Metrikos atsiras po pirmų sesijų", heat: "Pradėk šiandien — aktyvumo langeliai užsipildys" },
};

const STATUS_VAR = {
    new: "var(--st-new)", learning: "var(--st-learn)", review: "var(--st-review)",
    mastered: "var(--st-master)", weak: "var(--st-weak)", archived: "var(--st-master)",
};
// Порядок секторов доната (archived объединяем визуально с mastered цветом, но как отдельный сектор).
const DONUT_ORDER = ["mastered", "review", "learning", "new", "weak", "archived"];
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

function tr(word, lang) {
    const arr = word?.translate?.[lang] || word?.translate?.ru || [];
    return Array.isArray(arr) ? arr[0] || "" : arr;
}

export default function ProgressTab({ lang, go, openSession, openWord, openPlacement, placed, reloadKey }) {
    const t = T[lang] || T.ru;
    const cold = COLD[lang] || COLD.ru;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [weak, setWeak] = useState([]);
    const [almost, setAlmost] = useState([]);
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        let on = true;
        setLoading(true);
        Promise.all([
            api.learningStats().catch(() => null),
            api.learningList({ status: "weak", limit: 20 }).catch(() => ({ words: [] })),
            api.learningList({ status: "review", sort: "strength", limit: 50 }).catch(() => ({ words: [] })),
            api.learningActivity(118).catch(() => ({ days: [] })),
        ]).then(([s, w, r, act]) => {
            if (!on) return;
            setStats(s);
            setActivity(act?.days || []);
            setWeak((w?.words || []).slice(0, 12));
            // «Почти выучено» — review с наибольшей силой; берём топ-8.
            const rev = (r?.words || []).slice().sort((a, b) => (b.strength || 0) - (a.strength || 0));
            setAlmost(rev.slice(0, 8));
            setLoading(false);
        });
        return () => { on = false; };
    }, [reloadKey]);

    if (loading) {
        return <div style={{ padding: "var(--sp-12) 0" }}><BrandLoader /></div>;
    }

    const byStatus = stats?.byStatus || {};
    const byLevel = stats?.byLevel || {};
    const total = stats?.total || 0;
    const due = stats?.due || 0;
    const currentLevel = stats?.currentLevel || "—";
    const toNextLevel = stats?.toNextLevel;
    const masteredTotal = (byStatus.mastered || 0) + (byStatus.archived || 0);
    const retention = stats?.retention;       // % или null
    const accuracy = stats?.accuracy;         // % или null
    const streak = stats?.streak || 0;
    const masteredWeek = stats?.masteredWeek || 0;

    // --- Донат: conic-gradient из долей byStatus ---
    const segs = DONUT_ORDER
        .map((k) => ({ k, n: byStatus[k] || 0 }))
        .filter((s) => s.n > 0);
    const segTotal = segs.reduce((a, s) => a + s.n, 0);
    let acc = 0;
    const stops = segs.map((s) => {
        const start = (acc / segTotal) * 100;
        acc += s.n;
        const end = (acc / segTotal) * 100;
        return `${STATUS_VAR[s.k]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    const donutStyle = segTotal > 0
        ? { background: `conic-gradient(${stops.join(", ")})` }
        : { background: "var(--surface-3)" };

    // --- Хитмап активности (последние 17 недель) ---
    const actMap = {};
    activity.forEach((d) => { actMap[d.day] = d.answers || 0; });
    const HEAT_DAYS = 119;
    const heatCells = [];
    const _today = new Date();
    for (let i = HEAT_DAYS - 1; i >= 0; i--) {
        const dt = new Date(_today); dt.setDate(_today.getDate() - i);
        const key = dt.toISOString().slice(0, 10);
        heatCells.push({ key, n: actMap[key] || 0 });
    }
    const heatMax = Math.max(1, ...heatCells.map((c) => c.n));
    const heatLvl = (n) => (n <= 0 ? 0 : n >= heatMax * 0.75 ? 4 : n >= heatMax * 0.5 ? 3 : n >= heatMax * 0.25 ? 2 : 1);
    const heatColor = (l) => (l === 0 ? "var(--surface-3)" : `color-mix(in srgb, var(--fjord-600) ${l * 25}%, var(--surface-3))`);

    // Легенда: статусы с цветами в осмысленном порядке (без archived, если 0).
    const legendOrder = ["new", "learning", "review", "mastered", "weak", "archived"];
    const legend = legendOrder
        .filter((k) => (byStatus[k] || 0) > 0)
        .map((k) => ({ k, n: byStatus[k] || 0 }));

    const Shelf = ({ title, dotStatus, words, action, mode }) => {
        if (!words.length) return null;
        return (
            <div className="spanel">
                <div className="spanel__head">
                    <span className="spanel__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={dotStatus} /> {title}
                    </span>
                    <button type="button" className="row"
                        onClick={() => openSession(words, mode)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--fjord-600)", background: "transparent", border: "none", cursor: "pointer" }}>
                        {action} <Icon n="arrow-right" sm />
                    </button>
                </div>
                <div className="spanel__body" style={{ paddingTop: "var(--sp-3)" }}>
                    <div className="shelf">
                        {words.map((w) => (
                            <a key={w.pool_id ?? w.no} className="shelf-row"
                                onClick={(e) => { e.preventDefault(); openWord(w.no, null); }} href="#">
                                <StrengthBar value={w.strength || 0} status={w.status} sm />
                                <span className="shelf-row__w">{w.no}</span>
                                <span className="shelf-row__tr">{tr(w, lang)}</span>
                                <span style={{ marginLeft: "auto" }}>
                                    <button type="button" className="row"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSession([w], mode); }}
                                        title={t.toPractice}
                                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "grid", placeItems: "center" }}>
                                        <Icon n="play" sm />
                                    </button>
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <p className="study-sub" style={{ marginTop: 0, marginBottom: "var(--sp-5)" }}>{t.sub}</p>

            {placed === false && (
                <div className="spanel" style={{ background: "var(--fjord-50)", borderColor: "color-mix(in srgb,var(--fjord-600) 30%,var(--surface))", marginBottom: "var(--sp-5)" }}>
                    <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                        <span className="scard__ic" style={{ background: "var(--fjord-600)", color: "#fff", width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", flex: "none" }}>
                            <Icon n="target" />
                        </span>
                        <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{cold.t}</div>
                            <div className="st-cold-note">{cold.d}</div>
                            <div className="st-cold-note" style={{ marginTop: 4 }}>{cold.unlock}</div>
                        </div>
                        {openPlacement && (
                            <button className="btn btn--primary" onClick={openPlacement}>
                                <Icon n="play" sm /> {cold.btn}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Верхние плитки — только реальные данные.
                .statgrid нет в проектном study.css — задаём сетку инлайном (адаптив 4→2→1). */}
            <div className="statgrid"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--sp-4)", marginBottom: "var(--sp-5)" }}>
                <Tile icon="check-circle" bg="var(--success-bg)" color="var(--success)"
                    n={masteredTotal} label={t.masteredTotal}
                    note={masteredWeek > 0 ? t.perWeek.replace("{n}", masteredWeek) : null} />
                <Tile icon="award" bg="var(--fjord-50)" color="var(--fjord-600)"
                    n={retention == null ? "—" : retention + "%"} label={t.retention} />
                <Tile icon="flame" bg="var(--ember-50)" color="var(--ember-600)"
                    n={streak} label={`${t.streak} · ${t.streakDays}`} />
                <Tile icon="target" bg="var(--pos-adj-bg)" color="var(--pos-adj)"
                    n={accuracy == null ? "—" : accuracy + "%"} label={t.accuracy} />
            </div>

            <div className="prog-grid">
                {/* LEFT */}
                <div className="col" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                    <div className="spanel">
                        <div className="spanel__head">
                            <span className="spanel__title">{t.byStatus}</span>
                            <span className="muted-3" style={{ fontSize: "var(--fs-13)" }}>{t.totalOf} {total}</span>
                        </div>
                        <div className="spanel__body">
                            <div className="donut-wrap">
                                <div className="donut-c" style={{ ...donutStyle, width: 176, height: 176, borderRadius: "50%", flex: "none", position: "relative" }}>
                                    <div className="donut-c__hole" style={{ position: "absolute", inset: 26, borderRadius: "50%", background: "var(--surface)", display: "grid", placeItems: "center", textAlign: "center", boxShadow: "inset 0 0 0 1px var(--border)" }}>
                                        <div>
                                            <div className="donut__total">{total}</div>
                                            <div className="donut__lbl">{t.words}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="legend">
                                    {legend.length === 0 && <div className="muted-3">{t.noData}</div>}
                                    {legend.map(({ k, n }) => (
                                        <div className="legend__row" key={k}>
                                            <StatusDot status={k} />
                                            <span className="legend__name">{statusLabel(k, lang)}</span>
                                            <span className="legend__val">{n}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Слабые слова — полка фокуса */}
                    <Shelf title={t.weak} dotStatus="weak" words={weak} action={t.toPractice} mode="choice" />
                </div>

                {/* RIGHT */}
                <div className="col" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                    <div className="spanel">
                        <div className="spanel__head"><span className="spanel__title">{t.levels}</span></div>
                        <div className="spanel__body">
                            <div className="levelbar">
                                {CEFR.map((lvl) => {
                                    const d = byLevel[lvl];
                                    if (!d) return null;
                                    const mastered = d.mastered || 0;
                                    const target = d.target || 0;
                                    const pct = target > 0 ? Math.round((100 * mastered) / target) : 0;
                                    const isCur = lvl === currentLevel;
                                    const fill = pct >= 80 ? "var(--st-master)"
                                        : pct >= 45 ? "var(--st-review)"
                                            : pct > 0 ? "var(--st-learn)" : "var(--ink-3)";
                                    return (
                                        <div className="lvlrow" key={lvl}>
                                            <span className="lvlrow__tag" style={isCur ? undefined : { color: "var(--ink-3)" }}>{lvl}</span>
                                            <div className="lvl-track">
                                                <span style={{ width: `${Math.min(100, pct)}%`, background: fill }} />
                                            </div>
                                            <span className="lvlrow__val">{mastered}/{target}</span>
                                        </div>
                                    );
                                })}
                                {CEFR.every((lvl) => !byLevel[lvl]) && <div className="muted-3">{t.noData}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Активность — хитмап последних недель */}
                    <div className="spanel">
                        <div className="spanel__head">
                            <span className="spanel__title">{t.activity}</span>
                            <span className="streak-pill"><Icon n="flame" sm /> {streak} {t.streakDays}</span>
                        </div>
                        <div className="spanel__body">
                            <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)", gap: 3, overflowX: "auto" }}>
                                {heatCells.map((c) => (
                                    <span key={c.key} title={`${c.key}: ${c.n}`}
                                        style={{ width: 12, height: 12, borderRadius: 3, background: heatColor(heatLvl(c.n)) }} />
                                ))}
                            </div>
                            {activity.length === 0 && <div className="st-cold-note" style={{ marginTop: "var(--sp-3)" }}>{cold.heat}</div>}
                        </div>
                    </div>

                    {/* Почти выучено — полка фокуса */}
                    <Shelf title={t.almost} dotStatus="review" words={almost} action={t.reinforce} mode="choice" />
                </div>
            </div>
        </div>
    );
}

function Tile({ icon, bg, color, n, label, note, go }) {
    const clickable = typeof go === "function";
    return (
        <div className="spanel" onClick={clickable ? go : undefined}
            style={clickable ? { cursor: "pointer" } : undefined}>
            <div className="spanel__body">
                <div className="scard__ic"
                    style={{ background: bg, color, width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", marginBottom: "var(--sp-3)" }}>
                    <Icon n={icon} />
                </div>
                <div className="tile__n">{n}</div>
                <div className="tile__l">{label}</div>
                {note && <div className="tile__trend" style={{ marginTop: 6, color: "var(--ink-3)" }}>{note}</div>}
            </div>
        </div>
    );
}
