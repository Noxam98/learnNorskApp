// Вкладка «Сегодня» раздела «Учёба».
// Рендерит ТОЛЬКО контент-область (под шапкой/сегмент-навигацией страницы).
// Данные — только через api.learning* / api.placement*. i18n — локальные константы.
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { BtnSpinner, BrandLoader } from "../../components/ui/Spinner.jsx";
import { StatusDot, statusLabel, STATUS_ORDER } from "../../components/learning/StatusBits.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { pl } from "../../components/ui/plural.js";

// ---------- i18n (ru/en/ukr/pl/lt) ----------
const T = {
    ru: {
        smartReview: "Smart Review · на сегодня",
        readyA: "слов", readyB: "на сегодня",
        reviewDesc: "Просроченные интервалы, слабые слова и немного новых — система собрала оптимальную сессию.",
        chReview: "повторить", chWeak: "слабых", chNew: "новое",
        startReview: "Заниматься",
        sets: "Наборы для практики", setsHint: "тап — запустить",
        setReview: "На повторении", setReviewD: "Интервал подошёл — закрепить, пока не забылось",
        setWeak: "Слабые слова", setWeakD: "Много ошибок — в приоритете",
        setNew: "Новые слова", setNewD: "Доступно под твой уровень — начни учить",
        gateOpenT: "Экзамен пачки готов",
        gateOpenD: "Ты накопил пачку выученных слов. Сдай экзамен, чтобы открыть новые слова.",
        gateOpenBtn: "К экзамену",
        gateLockedNew: "Откроется после экзамена пачки",
        gateLockedAdd: "Сначала сдай экзамен пачки",
        gateProgress: "До экзамена пачки осталось {n}",
        goal: "Дневная цель", streak: "дней", days: "дней",
        goalNum: "из {n}", progressTitle: "Прогресс", masteredTitle: "Выучено слов", masteredDesc: "Освоено по всей рампе. Остальные дозреют по мере занятий.", goalAlmost: "Почти у цели!", goalDone: "Цель выполнена!",
        goalDescAlmost: "Закрывай повторения — серия не прервётся.",
        goalDescDone: "Сегодня всё повторено. Возвращайся завтра — повторения подойдут по интервалам.",
        suggestT: "Докинуть слов",
        suggestD: "Система подберёт новые слова из «Базы» под твой уровень {lvl} и темы, которые ты учишь.",
        chAuto: "Авто-подбор", chPlus: "+10 слов", chTopic: "Выбрать тему",
        suggestBtn: "Докинуть 10 слов на изучение",
        added: "Добавлено {n} слов",
        addedNone: "Новых слов под уровень не нашлось",
        snapshot: "Мои слова сейчас", toProgress: "Прогресс",
        emptyT: "На сегодня всё повторено",
        emptyD: "Дневная цель выполнена — но это не лимит. Можешь продолжить и учить новые слова или проверить себя на экзамене.",
        emptyAdd: "Докинуть слов", emptyExam: "Пройти экзамен", emptyMore: "Учить ещё",
        placeT: "Пройди входной тест",
        placeD: "Несколько вопросов — и система подберёт стартовый уровень и слова под него.",
        placeBtn: "Пройти тест", placeModalT: "Входной тест",
        placeChoose: "Выбери перевод",
        placeSubmit: "Узнать уровень", placeResult: "Твой уровень",
        placeDone: "Готово! Стартовый уровень сохранён.",
        close: "Закрыть", err: "Не удалось загрузить",
    },
    en: {
        smartReview: "Smart Review · for today",
        readyA: "words", readyB: "for today",
        reviewDesc: "Overdue intervals, weak words and a few new ones — an optimal session.",
        chReview: "review", chWeak: "weak", chNew: "new",
        startReview: "Study",
        sets: "Practice sets", setsHint: "tap to start",
        setReview: "Due for review", setReviewD: "The interval is up — reinforce before you forget",
        setWeak: "Weak words", setWeakD: "Many mistakes — priority",
        setNew: "New words", setNewD: "Available for your level — start learning",
        gateOpenT: "Pack exam is ready",
        gateOpenD: "You've gathered a pack of learned words. Pass the exam to unlock new words.",
        gateOpenBtn: "To the exam",
        gateLockedNew: "Unlocks after the pack exam",
        gateLockedAdd: "Pass the pack exam first",
        gateProgress: "{n} left until the pack exam",
        goal: "Daily goal", streak: "days", days: "days",
        goalNum: "of {n}", progressTitle: "Progress", masteredTitle: "Words mastered", masteredDesc: "Fully learned through the ramp. The rest mature as you practice.", goalAlmost: "Almost there!", goalDone: "Goal complete!",
        goalDescAlmost: "Close your reviews — the streak won't break.",
        goalDescDone: "All reviewed for today. Come back tomorrow.",
        suggestT: "Add more words",
        suggestD: "The system will pick new words from the base for your level {lvl} and topics you learn.",
        chAuto: "Auto-pick", chPlus: "+10 words", chTopic: "Pick topic",
        suggestBtn: "Add 10 words to learn",
        added: "Added {n} words",
        addedNone: "No new words for your level",
        snapshot: "My words now", toProgress: "Progress",
        emptyT: "All reviewed for today",
        emptyD: "Daily goal done — but it's not a limit. Keep going with new words or take the exam.",
        emptyAdd: "Add words", emptyExam: "Take the exam", emptyMore: "Keep learning",
        placeT: "Take the placement test",
        placeD: "A few questions and the system will set your starting level and words.",
        placeBtn: "Take the test", placeModalT: "Placement test",
        placeChoose: "Choose the translation",
        placeSubmit: "Get my level", placeResult: "Your level",
        placeDone: "Done! Starting level saved.",
        close: "Close", err: "Failed to load",
    },
    ukr: {
        smartReview: "Smart Review · на сьогодні",
        readyA: "слів", readyB: "на сьогодні",
        reviewDesc: "Прострочені інтервали, слабкі слова й трохи нових — оптимальна сесія.",
        chReview: "повторити", chWeak: "слабких", chNew: "нове",
        startReview: "Займатися",
        sets: "Набори для практики", setsHint: "тап — запустити",
        setReview: "На повторенні", setReviewD: "Інтервал підійшов — закріпи, поки не забулось",
        setWeak: "Слабкі слова", setWeakD: "Багато помилок — у пріоритеті",
        setNew: "Нові слова", setNewD: "Доступно під твій рівень — починай вчити",
        gateOpenT: "Екзамен пачки готовий",
        gateOpenD: "Ти накопичив пачку вивчених слів. Склади екзамен, щоб відкрити нові слова.",
        gateOpenBtn: "До екзамену",
        gateLockedNew: "Відкриється після екзамену пачки",
        gateLockedAdd: "Спершу склади екзамен пачки",
        gateProgress: "До екзамену пачки залишилось {n}",
        goal: "Денна ціль", streak: "днів", days: "днів",
        goalNum: "з {n}", progressTitle: "Прогрес", masteredTitle: "Вивчено слів", masteredDesc: "Освоєно по всій рампі. Решта дозріє під час занять.", goalAlmost: "Майже у цілі!", goalDone: "Ціль виконано!",
        goalDescAlmost: "Закривай повторення — серія не перерветься.",
        goalDescDone: "Сьогодні все повторено. Повертайся завтра.",
        suggestT: "Докинути слів",
        suggestD: "Система підбере нові слова з «Бази» під твій рівень {lvl} і теми, які ти вчиш.",
        chAuto: "Авто-підбір", chPlus: "+10 слів", chTopic: "Обрати тему",
        suggestBtn: "Докинути 10 слів на вивчення",
        added: "Додано {n} слів",
        addedNone: "Нових слів під рівень не знайшлося",
        snapshot: "Мої слова зараз", toProgress: "Прогрес",
        emptyT: "На сьогодні все повторено",
        emptyD: "Денну ціль виконано — але це не ліміт. Можеш вчити нові слова далі або скласти екзамен.",
        emptyAdd: "Докинути слів", emptyExam: "Скласти екзамен", emptyMore: "Вчити ще",
        placeT: "Пройди вхідний тест",
        placeD: "Кілька питань — і система підбере стартовий рівень та слова під нього.",
        placeBtn: "Пройти тест", placeModalT: "Вхідний тест",
        placeChoose: "Обери переклад",
        placeSubmit: "Дізнатися рівень", placeResult: "Твій рівень",
        placeDone: "Готово! Стартовий рівень збережено.",
        close: "Закрити", err: "Не вдалося завантажити",
    },
    pl: {
        smartReview: "Smart Review · na dziś",
        readyA: "słów", readyB: "na dziś",
        reviewDesc: "Zaległe interwały, słabe słowa i kilka nowych — optymalna sesja.",
        chReview: "powtórka", chWeak: "słabych", chNew: "nowe",
        startReview: "Ucz się",
        sets: "Zestawy do ćwiczeń", setsHint: "dotknij — start",
        setReview: "Do powtórki", setReviewD: "Interwał minął — utrwal, zanim zapomnisz",
        setWeak: "Słabe słowa", setWeakD: "Dużo błędów — priorytet",
        setNew: "Nowe słowa", setNewD: "Dostępne dla twojego poziomu — zacznij się uczyć",
        gateOpenT: "Egzamin paczki gotowy",
        gateOpenD: "Nazbierałeś paczkę nauczonych słów. Zdaj egzamin, aby odblokować nowe słowa.",
        gateOpenBtn: "Do egzaminu",
        gateLockedNew: "Odblokuje się po egzaminie paczki",
        gateLockedAdd: "Najpierw zdaj egzamin paczki",
        gateProgress: "Do egzaminu paczki zostało {n}",
        goal: "Cel dzienny", streak: "dni", days: "dni",
        goalNum: "z {n}", progressTitle: "Postęp", masteredTitle: "Opanowane słowa", masteredDesc: "W pełni opanowane. Reszta dojrzeje w trakcie nauki.", goalAlmost: "Prawie cel!", goalDone: "Cel osiągnięty!",
        goalDescAlmost: "Domknij powtórki — seria się nie przerwie.",
        goalDescDone: "Wszystko powtórzone na dziś. Wróć jutro.",
        suggestT: "Dorzuć słów",
        suggestD: "System dobierze nowe słowa z bazy pod twój poziom {lvl} i tematy, których się uczysz.",
        chAuto: "Auto-dobór", chPlus: "+10 słów", chTopic: "Wybierz temat",
        suggestBtn: "Dorzuć 10 słów do nauki",
        added: "Dodano {n} słów",
        addedNone: "Brak nowych słów dla poziomu",
        snapshot: "Moje słowa teraz", toProgress: "Postęp",
        emptyT: "Wszystko powtórzone na dziś",
        emptyD: "Cel dzienny osiągnięty — to nie limit. Ucz się dalej nowych słów lub podejdź do egzaminu.",
        emptyAdd: "Dorzuć słów", emptyExam: "Podejdź do egzaminu", emptyMore: "Ucz się dalej",
        placeT: "Wykonaj test wstępny",
        placeD: "Kilka pytań — system dobierze poziom startowy i słowa.",
        placeBtn: "Wykonaj test", placeModalT: "Test wstępny",
        placeChoose: "Wybierz tłumaczenie",
        placeSubmit: "Poznaj poziom", placeResult: "Twój poziom",
        placeDone: "Gotowe! Poziom startowy zapisany.",
        close: "Zamknij", err: "Nie udało się załadować",
    },
    lt: {
        smartReview: "Smart Review · šiandienai",
        readyA: "žodžių", readyB: "šiandienai",
        reviewDesc: "Pradelsti intervalai, silpni žodžiai ir keli nauji — optimali sesija.",
        chReview: "kartoti", chWeak: "silpnų", chNew: "nauja",
        startReview: "Mokytis",
        sets: "Praktikos rinkiniai", setsHint: "bakstelėk — pradėk",
        setReview: "Kartojimui", setReviewD: "Intervalas atėjo — įtvirtink, kol nepamiršai",
        setWeak: "Silpni žodžiai", setWeakD: "Daug klaidų — prioritetas",
        setNew: "Nauji žodžiai", setNewD: "Prieinama tavo lygiui — pradėk mokytis",
        gateOpenT: "Pakuotės egzaminas paruoštas",
        gateOpenD: "Sukaupei išmoktų žodžių pakuotę. Išlaikyk egzaminą, kad atrakintum naujus žodžius.",
        gateOpenBtn: "Į egzaminą",
        gateLockedNew: "Atsirakins po pakuotės egzamino",
        gateLockedAdd: "Pirma išlaikyk pakuotės egzaminą",
        gateProgress: "Iki pakuotės egzamino liko {n}",
        goal: "Dienos tikslas", streak: "d.", days: "d.",
        goalNum: "iš {n}", progressTitle: "Pažanga", masteredTitle: "Išmokti žodžiai", masteredDesc: "Visiškai išmokti. Likę subręs besimokant.", goalAlmost: "Beveik tikslas!", goalDone: "Tikslas pasiektas!",
        goalDescAlmost: "Užbaik kartojimus — serija nenutruks.",
        goalDescDone: "Šiandien viskas pakartota. Grįžk rytoj.",
        suggestT: "Pridėti žodžių",
        suggestD: "Sistema parinks naujų žodžių iš bazės pagal tavo lygį {lvl} ir temas, kurias mokaisi.",
        chAuto: "Auto parinkimas", chPlus: "+10 žodžių", chTopic: "Pasirinkti temą",
        suggestBtn: "Pridėti 10 žodžių mokymuisi",
        added: "Pridėta {n} žodžių",
        addedNone: "Naujų žodžių lygiui nerasta",
        snapshot: "Mano žodžiai dabar", toProgress: "Pažanga",
        emptyT: "Šiandienai viskas pakartota",
        emptyD: "Dienos tikslas pasiektas — tai ne riba. Mokykis naujų žodžių toliau arba laikyk egzaminą.",
        emptyAdd: "Pridėti žodžių", emptyExam: "Laikyti egzaminą", emptyMore: "Mokytis toliau",
        placeT: "Atlik įvadinį testą",
        placeD: "Keli klausimai — ir sistema parinks pradinį lygį bei žodžius.",
        placeBtn: "Atlikti testą", placeModalT: "Įvadinis testas",
        placeChoose: "Pasirink vertimą",
        placeSubmit: "Sužinoti lygį", placeResult: "Tavo lygis",
        placeDone: "Atlikta! Pradinis lygis išsaugotas.",
        close: "Uždaryti", err: "Nepavyko įkrasti",
    },
};

const DAILY_GOAL = 20;

function fmt(s, vars) {
    return Object.keys(vars || {}).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k]), s);
}

// Холодная дневная цель — пока нет ни одной сессии («нет данных ≠ 0»).
const GCOLD = {
    ru:  ["Цель появится", "Подстроим дневную цель под тебя после первой сессии"],
    en:  ["Goal will appear", "We'll tune your daily goal after the first session"],
    ukr: ["Ціль з'явиться", "Підлаштуємо денну ціль після першої сесії"],
    pl:  ["Cel się pojawi", "Dopasujemy dzienny cel po pierwszej sesji"],
    lt:  ["Tikslas atsiras", "Pritaikysime dienos tikslą po pirmos sesijos"],
};

export default function TodayTab({ lang, go, openSession, openWord, openPlacement, reloadKey, refresh }) {
    const t = T[lang] || T.ru;

    const [stats, setStats] = useState(null);
    const [gate, setGate] = useState(null);   // {pack, threshold, open} — ворота экзамена пачки
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [busy, setBusy] = useState("");      // ключ запускаемого набора/игры → спиннер
    const autoFillTried = useRef(false);       // авто-добор пустой учёбы — один раз за монтирование
    const sessionLoading = useSessionStore((s) => s.loading); // следующая сессия ещё грузится фоном

    useEffect(() => {
        let on = true;
        setLoading(true);
        setError(false);
        api.learningGate().then((g) => { if (on) setGate(g || null); }).catch(() => { if (on) setGate(null); });
        api.learningStats()
            .then((s) => { if (on) { setStats(s || null); setLoading(false); } })
            .catch(() => { if (on) { setError(true); setLoading(false); } });
        return () => { on = false; };
    }, [reloadKey]);

    // Ворота экзамена пачки: open → можно/нужно сдавать экзамен (новые слова заблокированы).
    const gateOpen = !!gate?.open;
    const gatePack = gate?.pack || 0;
    const gateThreshold = gate?.threshold || 0;
    const gateLeft = Math.max(0, gateThreshold - gatePack);

    const by = stats?.byStatus || {};
    const due = stats?.due || 0;
    const total = stats?.total || 0;
    const level = stats?.currentLevel || "—";
    const placed = stats?.placed;

    // Состав сессии повторения (ориентировочно, из доступных данных).
    const composition = useMemo(() => {
        const weak = by.weak || 0;
        const fresh = by.new || 0;
        const review = Math.max(0, due - weak);   // просроченные не-слабые ≈ обычное повторение
        return { review, weak, fresh };
    }, [by.weak, by.new, due]);
    // Что реально можно учить сейчас: просроченные + слабые + новые (как собирает get_due).
    // ВАЖНО: новые слова из словаря имеют due=null, поэтому только по `due` их не видно.
    const learnable = due + (by.new || 0) + (by.weak || 0);

    // Авто-добор: у юзера ВООБЩЕ нет слов в учёбе (total=0) и ворота не закрыты — система сама
    // подсыпает новые из Базы (сборка сессии на бэке делает suggest_words). Один раз за монтирование,
    // чтобы не зациклиться, если кандидатов нет. «Закончил на сегодня» (learnable=0, total>0) не трогаем.
    useEffect(() => {
        if (loading || !stats || autoFillTried.current) return;
        if (total === 0 && !gateOpen) {
            autoFillTried.current = true;
            api.learningSession(20)
                .then((r) => { if ((r?.words || []).length) refresh(); })
                .catch(() => { });
        }
    }, [loading, stats, total, gateOpen, refresh]);

    // Дневная цель: derive — цель 20, «сделано» ≈ повторённые сегодня неизвестны,
    // показываем review-слова как прокси прогресса (тактично, без выдуманной точности).
    const goalTarget = stats?.today?.goal || DAILY_GOAL;
    const goalDone = Math.min(goalTarget, stats?.today?.done ?? 0);
    const streak = stats?.streak || 0;
    // «нет данных ≠ 0»: пока нет ни одной сессии (нет точности за 30 дней и нет стрика) — цель «—»
    const coldGoal = stats?.accuracy == null && !streak && goalDone === 0;
    const goalComplete = !coldGoal && (goalDone >= goalTarget || (learnable === 0 && total > 0));

    // ---- запуск набора/сессии ----
    async function launch(key, fetcher, mode = "choice") {
        if (busy) return;
        setBusy(key);
        try {
            const r = await fetcher();
            const words = r?.words || [];
            if (words.length) openSession(words, mode);
        } catch { /* тихо */ }
        finally { setBusy(""); }
    }

    // Главный CTA — системная сессия: режим/состав выбирает система (openSession без слов).
    const runReview = () => openSession();
    const runSet = (status, key) => launch(key, () => api.learningList({ status, limit: 60 }), "choice");

    if (loading) return <BrandLoader />;
    if (error || !stats) {
        return (
            <div className="spanel"><div className="empty">
                <span className="empty__ic" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                    <Icon n="alert" />
                </span>
                <div className="empty__t">{t.err}</div>
                <div className="empty__actions">
                    <button className="btn btn--outline btn--lg" onClick={refresh}><Icon n="repeat" sm /> {t.startReview}</button>
                </div>
            </div></div>
        );
    }

    const isEmpty = total === 0 || learnable === 0;

    // Баннер ворот: экзамен пачки готов → CTA на вкладку «Экзамен».
    const gateBanner = gateOpen ? (
        <div className="spanel" style={{ background: "var(--ember-50)", borderColor: "color-mix(in srgb,var(--ember-600) 30%,var(--surface))", marginBottom: "var(--sp-5)" }}>
            <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                <span className="setrow-link__ic" style={{ background: "var(--ember-600)", color: "#fff", flex: "none" }}>
                    <Icon n="award" />
                </span>
                <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{t.gateOpenT}</div>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{t.gateOpenD}</div>
                </div>
                <button className="btn btn--accent" onClick={() => go("exam")}>
                    <Icon n="play" sm /> {t.gateOpenBtn}
                </button>
            </div>
        </div>
    ) : (gatePack > 0 && gateThreshold > 0) ? (
        <div className="spanel" style={{ marginBottom: "var(--sp-5)" }}>
            <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                <span className="setrow-link__ic" style={{ background: "color-mix(in srgb,var(--ember-600) 15%,var(--surface))", color: "var(--ember-600)", flex: "none" }}>
                    <Icon n="award" />
                </span>
                <div className="col" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: "var(--sp-2)" }}>
                        <span style={{ fontSize: "var(--fs-14)", fontWeight: 700 }}>{fmt(t.gateProgress, { n: gateLeft })}</span>
                        <span className="muted-3" style={{ fontSize: "var(--fs-13)", fontWeight: 700, flex: "none" }}>{gatePack}/{gateThreshold}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, background: "var(--ember-600)", width: `${Math.min(100, Math.round((gatePack / gateThreshold) * 100))}%` }} />
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const gc = (GCOLD[lang] || GCOLD.ru);
    // Прогресс изучения: выучено (mastered) из всех слов учёбы — осмысленнее «дневной цели».
    const masteredCount = by.mastered || 0;
    const masteryFrac = total > 0 ? masteredCount / total : 0;
    const goalPanel = (
        <div className="spanel">
            <div className="spanel__head">
                <span className="spanel__title">{t.progressTitle}</span>
                <span className="streak-pill"><Icon n="flame" sm /> {streak} {t.days}</span>
            </div>
            <div className="spanel__body">
                <div className="goal-row">
                    <div className="ring" style={{ "--p": Math.round(masteryFrac * 100) }}>
                        <svg className="ring__svg" viewBox="0 0 120 120">
                            <circle className="ring__bg" cx="60" cy="60" r="52" />
                            <circle className="ring__fg" cx="60" cy="60" r="52"
                                strokeDasharray="326.7"
                                strokeDashoffset={(326.7 * (1 - masteryFrac)).toFixed(1)}
                                style={{ stroke: "var(--st-master)" }} />
                        </svg>
                        <span className="ring__label">
                            <span className="ring__num" style={{ color: total ? "var(--st-master)" : "var(--ink-3)" }}>
                                {total ? masteredCount : "—"}
                            </span>
                            <span className="ring__den">{total ? fmt(t.goalNum, { n: total }) + " " + pl(lang, total, "word") : ""}</span>
                        </span>
                    </div>
                    <div className="col" style={{ gap: 10 }}>
                        <div style={{ fontSize: "var(--fs-15)", fontWeight: 700 }}>{t.masteredTitle}</div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{t.masteredDesc}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {placed === false && (
                <div className="spanel" style={{ background: "var(--fjord-50)", borderColor: "color-mix(in srgb,var(--fjord-600) 30%,var(--surface))", marginBottom: "var(--sp-5)" }}>
                    <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                        <span className="setrow-link__ic" style={{ background: "var(--fjord-600)", color: "#fff", flex: "none" }}>
                            <Icon n="target" />
                        </span>
                        <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{t.placeT}</div>
                            <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{t.placeD}</div>
                        </div>
                        <button className="btn btn--primary" onClick={openPlacement}>
                            <Icon n="play" sm /> {t.placeBtn}
                        </button>
                    </div>
                </div>
            )}

            {gateBanner}

            <div className="today-grid">
                {/* LEFT */}
                <div className="col" style={{ gap: "var(--sp-5)" }}>
                    {isEmpty ? (
                        <>
                            <div className="spanel">
                                <div className="empty">
                                    <span className="empty__ic"><Icon n="check-circle" /></span>
                                    <div className="empty__t">{t.emptyT}</div>
                                    <div className="empty__d">{t.emptyD}</div>
                                    <div className="empty__actions">
                                        {!gateOpen && (
                                            <button className="btn btn--accent btn--lg" onClick={runReview} disabled={sessionLoading}>
                                                {sessionLoading ? <BtnSpinner /> : <Icon n="play" sm />} {t.emptyMore}
                                            </button>
                                        )}
                                        {/* экзамен — только когда ворота открыты (пачка готова к переходу); иначе сдавать нечего */}
                                        {gateOpen && (
                                            <button className="btn btn--accent btn--lg" onClick={() => go("exam")}>
                                                <Icon n="award" sm /> {t.emptyExam}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Hero */}
                            <div className="review-cta">
                                <span className="review-cta__halo" /><span className="review-cta__halo2" />
                                <span className="review-cta__eyebrow"><Icon n="repeat" sm /> {t.smartReview}</span>
                                <div className="review-cta__big"><b>{learnable} {pl(lang, learnable, "word")}</b> {t.readyB.split("\n").map((l, i) => <span key={i}>{i ? <br /> : null}{l}</span>)}</div>
                                <p className="review-cta__desc">{t.reviewDesc}</p>
                                <div className="review-cta__chips">
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-review)" }} />{composition.review} {t.chReview}</span>
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-weak)" }} />{composition.weak} {pl(lang, composition.weak, "weak")}</span>
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-new)" }} />{composition.fresh} {pl(lang, composition.fresh, "fresh")}</span>
                                </div>
                                <button className="review-cta__btn" onClick={runReview} disabled={sessionLoading}>
                                    {sessionLoading ? <BtnSpinner /> : <Icon n="play" />} {t.startReview}
                                </button>
                            </div>

                            {/* Sets */}
                            <div className="spanel">
                                <div className="spanel__head">
                                    <span className="spanel__title">{t.sets}</span>
                                    <span className="muted-3" style={{ fontSize: "var(--fs-13)" }}>{t.setsHint}</span>
                                </div>
                                <div className="spanel__body" style={{ paddingTop: "var(--sp-2)" }}>
                                    <div className="setlist">
                                        <SetRow icon="repeat" color="--st-review" title={t.setReview} desc={t.setReviewD}
                                            n={by.review || 0} loading={busy === "s-review"} onClick={() => runSet("review", "s-review")} badge="review" />
                                        <SetRow icon="alert" color="--st-weak" title={t.setWeak} desc={t.setWeakD}
                                            n={by.weak || 0} loading={busy === "s-weak"} onClick={() => runSet("weak", "s-weak")} />
                                        <SetRow icon="spark-dot" color="--st-new" title={t.setNew}
                                            desc={gateOpen ? t.gateLockedNew : t.setNewD}
                                            n={by.new || 0} loading={busy === "s-new"} locked={gateOpen}
                                            onClick={() => runSet("new", "s-new")} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT */}
                <div className="col" style={{ gap: "var(--sp-5)" }}>
                    {goalPanel}

                    {/* Status snapshot */}
                    <div className="spanel">
                        <div className="spanel__head">
                            <span className="spanel__title">{t.snapshot}</span>
                            <button className="row" onClick={() => go("progress")}
                                style={{ gap: 5, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--fjord-600)", background: "none", border: "none", cursor: "pointer" }}>
                                {t.toProgress} <Icon n="arrow-right" sm />
                            </button>
                        </div>
                        <div className="spanel__body" style={{ paddingTop: "var(--sp-2)", display: "flex", flexDirection: "column", gap: 2 }}>
                            {STATUS_ORDER.filter((s) => s !== "archived").map((s) => (
                                <button key={s} className="setrow-link" onClick={() => go("words")}
                                    style={{ padding: "11px var(--sp-1)", background: "none", border: "none", textAlign: "left", width: "100%", cursor: "pointer" }}>
                                    <StatusDot status={s} />
                                    <span className="setrow-link__meta">
                                        <span style={{ fontWeight: 600, fontSize: "var(--fs-14)" }}>{statusLabel(s, lang)}</span>
                                    </span>
                                    <span className="setrow-link__n" style={{ fontSize: "var(--fs-16)" }}>{by[s] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}

// ---------- sub-components ----------
function SetRow({ icon, color, title, desc, n, badge, loading, locked, onClick }) {
    return (
        <button className="setrow-link" onClick={onClick} disabled={loading || locked}
            style={{ background: "none", border: "none", borderTop: "1px solid var(--border)", textAlign: "left", width: "100%", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.6 : 1 }}>
            <span className="setrow-link__ic" style={{ background: `color-mix(in srgb,var(${color}) 15%,var(--surface))`, color: `var(${color})` }}>
                <Icon n={icon} />
            </span>
            <span className="setrow-link__meta">
                <span className="setrow-link__t">
                    {title}
                    {badge && <span className="sbadge sbadge--review"><Icon n="repeat" /> SRS</span>}
                </span>
                <span className="setrow-link__d">{desc}</span>
            </span>
            <span className="setrow-link__n">{n}</span>
            <span className="setrow-link__go">{loading ? <BtnSpinner /> : <Icon n={locked ? "lock" : "arrow-right"} />}</span>
        </button>
    );
}

