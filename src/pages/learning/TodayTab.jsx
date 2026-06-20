// Вкладка «Сегодня» раздела «Учёба».
// Рендерит ТОЛЬКО контент-область (под шапкой/сегмент-навигацией страницы).
// Данные — только через api.learning* / api.placement*. i18n — локальные константы.
import { useEffect, useMemo, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { BtnSpinner, BrandLoader } from "../../components/ui/Spinner.jsx";
import { StatusDot, statusLabel, STATUS_ORDER } from "../../components/learning/StatusBits.jsx";

// ---------- i18n (ru/en/ukr/pl/lt) ----------
const T = {
    ru: {
        smartReview: "Smart Review · на сегодня",
        readyA: "слов", readyB: "готовы\nна сегодня",
        reviewDesc: "Просроченные интервалы, слабые слова и немного новых — система собрала оптимальную сессию.",
        chReview: "повторить", chWeak: "слабых", chNew: "новое",
        startReview: "К повторению",
        sets: "Наборы для практики", setsHint: "тап — запустить",
        setReview: "На повторении", setReviewD: "Интервал подошёл — закрепить, пока не забылось",
        setWeak: "Слабые слова", setWeakD: "Много ошибок — в приоритете",
        setNew: "Новые слова", setNewD: "Доступно под твой уровень — начни учить",
        games: "Быстрый запуск игры",
        gChoice: "Множественный выбор", gChoiceD: "по набору повторения",
        gListen: "Аудирование", gListenD: "на слух",
        gInput: "Перевод", gInputD: "ввод вручную",
        gStudy: "Собери слово", gStudyD: "из букв",
        goal: "Дневная цель", streak: "дней", days: "дней",
        goalNum: "из {n} слов", goalAlmost: "Почти у цели!", goalDone: "Цель выполнена!",
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
        emptyD: "Ты закрыл все повторения и дневную цель. Можно докинуть новых слов под свой уровень или проверить себя на экзамене.",
        emptyAdd: "Докинуть слов", emptyExam: "Пройти экзамен",
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
        readyA: "words", readyB: "ready\nfor today",
        reviewDesc: "Overdue intervals, weak words and a few new ones — an optimal session.",
        chReview: "review", chWeak: "weak", chNew: "new",
        startReview: "Start review",
        sets: "Practice sets", setsHint: "tap to start",
        setReview: "Due for review", setReviewD: "The interval is up — reinforce before you forget",
        setWeak: "Weak words", setWeakD: "Many mistakes — priority",
        setNew: "New words", setNewD: "Available for your level — start learning",
        games: "Quick game launch",
        gChoice: "Multiple choice", gChoiceD: "from review set",
        gListen: "Listening", gListenD: "by ear",
        gInput: "Translation", gInputD: "type it in",
        gStudy: "Build the word", gStudyD: "from letters",
        goal: "Daily goal", streak: "days", days: "days",
        goalNum: "of {n} words", goalAlmost: "Almost there!", goalDone: "Goal complete!",
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
        emptyD: "You've closed all reviews and the daily goal. Add new words for your level or take the exam.",
        emptyAdd: "Add words", emptyExam: "Take the exam",
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
        readyA: "слів", readyB: "готові\nна сьогодні",
        reviewDesc: "Прострочені інтервали, слабкі слова й трохи нових — оптимальна сесія.",
        chReview: "повторити", chWeak: "слабких", chNew: "нове",
        startReview: "До повторення",
        sets: "Набори для практики", setsHint: "тап — запустити",
        setReview: "На повторенні", setReviewD: "Інтервал підійшов — закріпи, поки не забулось",
        setWeak: "Слабкі слова", setWeakD: "Багато помилок — у пріоритеті",
        setNew: "Нові слова", setNewD: "Доступно під твій рівень — починай вчити",
        games: "Швидкий запуск гри",
        gChoice: "Множинний вибір", gChoiceD: "за набором повторення",
        gListen: "Аудіювання", gListenD: "на слух",
        gInput: "Переклад", gInputD: "ввід вручну",
        gStudy: "Збери слово", gStudyD: "з літер",
        goal: "Денна ціль", streak: "днів", days: "днів",
        goalNum: "з {n} слів", goalAlmost: "Майже у цілі!", goalDone: "Ціль виконано!",
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
        emptyD: "Ти закрив усі повторення й денну ціль. Можна докинути нових слів або скласти екзамен.",
        emptyAdd: "Докинути слів", emptyExam: "Скласти екзамен",
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
        readyA: "słów", readyB: "gotowych\nna dziś",
        reviewDesc: "Zaległe interwały, słabe słowa i kilka nowych — optymalna sesja.",
        chReview: "powtórka", chWeak: "słabych", chNew: "nowe",
        startReview: "Do powtórki",
        sets: "Zestawy do ćwiczeń", setsHint: "dotknij — start",
        setReview: "Do powtórki", setReviewD: "Interwał minął — utrwal, zanim zapomnisz",
        setWeak: "Słabe słowa", setWeakD: "Dużo błędów — priorytet",
        setNew: "Nowe słowa", setNewD: "Dostępne dla twojego poziomu — zacznij się uczyć",
        games: "Szybki start gry",
        gChoice: "Wybór wielokrotny", gChoiceD: "z zestawu powtórki",
        gListen: "Słuchanie", gListenD: "ze słuchu",
        gInput: "Tłumaczenie", gInputD: "wpisz ręcznie",
        gStudy: "Ułóż słowo", gStudyD: "z liter",
        goal: "Cel dzienny", streak: "dni", days: "dni",
        goalNum: "z {n} słów", goalAlmost: "Prawie cel!", goalDone: "Cel osiągnięty!",
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
        emptyD: "Domknąłeś powtórki i cel dzienny. Dorzuć nowych słów lub podejdź do egzaminu.",
        emptyAdd: "Dorzuć słów", emptyExam: "Podejdź do egzaminu",
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
        readyA: "žodžių", readyB: "paruošta\nšiandienai",
        reviewDesc: "Pradelsti intervalai, silpni žodžiai ir keli nauji — optimali sesija.",
        chReview: "kartoti", chWeak: "silpnų", chNew: "nauja",
        startReview: "Kartoti",
        sets: "Praktikos rinkiniai", setsHint: "bakstelėk — pradėk",
        setReview: "Kartojimui", setReviewD: "Intervalas atėjo — įtvirtink, kol nepamiršai",
        setWeak: "Silpni žodžiai", setWeakD: "Daug klaidų — prioritetas",
        setNew: "Nauji žodžiai", setNewD: "Prieinama tavo lygiui — pradėk mokytis",
        games: "Greitas žaidimo startas",
        gChoice: "Pasirinkimas", gChoiceD: "iš kartojimo rinkinio",
        gListen: "Klausymas", gListenD: "iš klausos",
        gInput: "Vertimas", gInputD: "įvesk ranka",
        gStudy: "Sudėk žodį", gStudyD: "iš raidžių",
        goal: "Dienos tikslas", streak: "d.", days: "d.",
        goalNum: "iš {n} žodžių", goalAlmost: "Beveik tikslas!", goalDone: "Tikslas pasiektas!",
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
        emptyD: "Uždarei visus kartojimus ir dienos tikslą. Pridėk naujų žodžių arba laikyk egzaminą.",
        emptyAdd: "Pridėti žodžių", emptyExam: "Laikyti egzaminą",
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [busy, setBusy] = useState("");      // ключ запускаемого набора/игры → спиннер
    const [suggesting, setSuggesting] = useState(false);
    const [suggestMsg, setSuggestMsg] = useState("");

    useEffect(() => {
        let on = true;
        setLoading(true);
        setError(false);
        api.learningStats()
            .then((s) => { if (on) { setStats(s || null); setLoading(false); } })
            .catch(() => { if (on) { setError(true); setLoading(false); } });
        return () => { on = false; };
    }, [reloadKey]);

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

    const runReview = () => launch("hero", () => api.learningDue(20), "choice");
    const runSet = (status, key) => launch(key, () => api.learningList({ status, limit: 60 }), "choice");
    const runGame = (mode) => launch("g-" + mode, async () => {
        const due = await api.learningDue(20).catch(() => null);
        if (due?.words?.length) return due;
        return api.learningList({ limit: 30 });
    }, mode);

    async function doSuggest() {
        if (suggesting) return;
        setSuggesting(true);
        setSuggestMsg("");
        try {
            const r = await api.learningSuggest({ count: 10 });
            const added = r?.added ?? (r?.words?.length || 0);
            setSuggestMsg(added > 0 ? fmt(t.added, { n: added }) : t.addedNone);
            if (added > 0) refresh();
        } catch {
            setSuggestMsg(t.err);
        } finally {
            setSuggesting(false);
        }
    }

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

    // ---------- reusable blocks ----------
    const suggestCard = (descKey = "suggestD") => (
        <div className="spanel" style={{ background: "var(--ember-50)", borderColor: "color-mix(in srgb,var(--ember-600) 22%,var(--surface))" }}>
            <div className="spanel__body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <div className="row" style={{ gap: "var(--sp-3)", alignItems: "flex-start" }}>
                    <span className="setrow-link__ic" style={{ background: "var(--ember-600)", color: "#fff", flex: "none" }}>
                        <Icon n="sparkles" />
                    </span>
                    <div className="col" style={{ gap: 3 }}>
                        <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{t.suggestT}</div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}
                            dangerouslySetInnerHTML={{ __html: fmt(t[descKey], { lvl: `<b style="color:var(--ink)">${level}</b>` }) }} />
                    </div>
                </div>
                <div className="chiprow">
                    <span className="fchip is-active">{t.chAuto}</span>
                    <span className="fchip">{t.chPlus}</span>
                    <span className="fchip">{t.chTopic}</span>
                </div>
                <button className="btn btn--accent btn--block" onClick={doSuggest} disabled={suggesting}>
                    {suggesting ? <BtnSpinner /> : <Icon n="plus" sm />} {t.suggestBtn}
                </button>
                {suggestMsg && (
                    <div className="row" style={{ gap: 7, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--st-master)" }}>
                        <Icon n="check-circle" sm /> {suggestMsg}
                    </div>
                )}
            </div>
        </div>
    );

    const gc = (GCOLD[lang] || GCOLD.ru);
    const ringFrac = goalComplete ? 1 : (coldGoal ? 0 : goalDone / goalTarget);
    const goalPanel = (
        <div className="spanel">
            <div className="spanel__head">
                <span className="spanel__title">{t.goal}</span>
                <span className="streak-pill"><Icon n="flame" sm /> {streak} {t.days}</span>
            </div>
            <div className="spanel__body">
                <div className="goal-row">
                    <div className="ring" style={{ "--p": Math.round(ringFrac * 100) }}>
                        <svg className="ring__svg" viewBox="0 0 120 120">
                            <circle className="ring__bg" cx="60" cy="60" r="52" />
                            <circle className="ring__fg" cx="60" cy="60" r="52"
                                strokeDasharray="326.7"
                                strokeDashoffset={(326.7 * (1 - ringFrac)).toFixed(1)}
                                style={goalComplete ? { stroke: "var(--st-master)" } : undefined} />
                        </svg>
                        <span className="ring__label">
                            <span className="ring__num" style={goalComplete ? { color: "var(--st-master)" } : (coldGoal ? { color: "var(--ink-3)" } : undefined)}>
                                {coldGoal ? "—" : (goalComplete ? goalTarget : goalDone)}
                            </span>
                            <span className="ring__den">{coldGoal ? "" : fmt(t.goalNum, { n: goalTarget })}</span>
                        </span>
                    </div>
                    <div className="col" style={{ gap: 10 }}>
                        <div style={{ fontSize: "var(--fs-15)", fontWeight: 700 }}>
                            {coldGoal ? gc[0] : (goalComplete ? t.goalDone : t.goalAlmost)}
                        </div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>
                            {coldGoal ? gc[1] : (goalComplete ? t.goalDescDone : t.goalDescAlmost)}
                        </div>
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
                                        <button className="btn btn--accent btn--lg" onClick={doSuggest} disabled={suggesting}>
                                            {suggesting ? <BtnSpinner /> : <Icon n="plus" sm />} {t.emptyAdd}
                                        </button>
                                        <button className="btn btn--outline btn--lg" onClick={() => go("exam")}>
                                            <Icon n="award" sm /> {t.emptyExam}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {suggestCard()}
                        </>
                    ) : (
                        <>
                            {/* Hero */}
                            <div className="review-cta">
                                <span className="review-cta__halo" /><span className="review-cta__halo2" />
                                <span className="review-cta__eyebrow"><Icon n="repeat" sm /> {t.smartReview}</span>
                                <div className="review-cta__big"><b>{learnable} {t.readyA}</b> {t.readyB.split("\n").map((l, i) => <span key={i}>{i ? <br /> : null}{l}</span>)}</div>
                                <p className="review-cta__desc">{t.reviewDesc}</p>
                                <div className="review-cta__chips">
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-review)" }} />{composition.review} {t.chReview}</span>
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-weak)" }} />{composition.weak} {t.chWeak}</span>
                                    <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-new)" }} />{composition.fresh} {t.chNew}</span>
                                </div>
                                <button className="review-cta__btn" onClick={runReview} disabled={!!busy}>
                                    {busy === "hero" ? <BtnSpinner /> : <Icon n="play" />} {t.startReview}
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
                                        <SetRow icon="spark-dot" color="--st-new" title={t.setNew} desc={t.setNewD}
                                            n={by.new || 0} loading={busy === "s-new"} onClick={() => runSet("new", "s-new")} />
                                    </div>
                                </div>
                            </div>

                            {/* Quick games */}
                            <div className="spanel">
                                <div className="spanel__head"><span className="spanel__title">{t.games}</span></div>
                                <div className="spanel__body" style={{ paddingTop: "var(--sp-3)" }}>
                                    <div className="qgames">
                                        <QGame bg="var(--pos-noun)" icon="list" title={t.gChoice} desc={t.gChoiceD} loading={busy === "g-choice"} onClick={() => runGame("choice")} />
                                        <QGame bg="var(--fjord-600)" icon="type" title={t.gInput} desc={t.gInputD} loading={busy === "g-input"} onClick={() => runGame("input")} />
                                        <QGame bg="var(--ember-600)" icon="sparkles" title={t.gStudy} desc={t.gStudyD} loading={busy === "g-study"} onClick={() => runGame("study")} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT */}
                <div className="col" style={{ gap: "var(--sp-5)" }}>
                    {goalPanel}
                    {!isEmpty && suggestCard()}

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
function SetRow({ icon, color, title, desc, n, badge, loading, onClick }) {
    return (
        <button className="setrow-link" onClick={onClick} disabled={loading}
            style={{ background: "none", border: "none", borderTop: "1px solid var(--border)", textAlign: "left", width: "100%", cursor: "pointer" }}>
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
            <span className="setrow-link__go">{loading ? <BtnSpinner /> : <Icon n="arrow-right" />}</span>
        </button>
    );
}

function QGame({ bg, icon, title, desc, loading, onClick }) {
    return (
        <button className="qgame" onClick={onClick} disabled={loading}
            style={{ textAlign: "left", width: "100%", cursor: "pointer", font: "inherit" }}>
            <span className="qgame__ic" style={{ background: bg }}>{loading ? <BtnSpinner /> : <Icon n={icon} sm />}</span>
            <span><span className="qgame__t" style={{ display: "block" }}>{title}</span><span className="qgame__d">{desc}</span></span>
        </button>
    );
}

