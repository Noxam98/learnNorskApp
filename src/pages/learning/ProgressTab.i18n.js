// Локальная i18n компонента ProgressTab — только данные переводов (langGuard-страж и паритет сохранены).
import { langGuard } from "../../interface/i18nGuard.js";

// Локальная i18n (5 языков) — interfaceTranslation.jsx не трогаем.
export const T = langGuard({
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
    lv: {
        sub: "Kā aug tava aktīvā vārdu krātuve",
        masteredTotal: "Apgūts kopā", wordsTotal: "Vārdu kopā", due: "Jāatkārto", level: "Pašreizējais līmenis", retention: "Noturība", accuracy: "Precizitāte", streak: "Sērija", streakDays: "dienas", perWeek: "+{n} šonedēļ", activity: "Aktivitāte",
        byStatus: "Vārdi pēc statusa", words: "vārdi", totalOf: "kopā",
        levels: "CEFR līmeņu progress",
        weak: "Tavi vājie vārdi", almost: "Gandrīz apgūts",
        toPractice: "Uz praksi", reinforce: "Nostiprināt",
        empty: "Pagaidām tukšs", noData: "nav datu", toNext: "līdz līmenim",
    },
    ar: {
        sub: "كيف تنمو حصيلتك اللغوية النشطة",
        masteredTotal: "إجمالي المتقَن", wordsTotal: "إجمالي الكلمات", due: "للمراجعة", level: "المستوى الحالي", retention: "الاحتفاظ", accuracy: "الدقة", streak: "السلسلة", streakDays: "أيام", perWeek: "+{n} هذا الأسبوع", activity: "النشاط",
        byStatus: "الكلمات حسب الحالة", words: "كلمات", totalOf: "الإجمالي",
        levels: "تقدّم مستويات CEFR",
        weak: "كلماتك الضعيفة", almost: "أوشكت على الإتقان",
        toPractice: "تدرّب", reinforce: "رسّخ",
        empty: "لا شيء هنا بعد", noData: "لا توجد بيانات", toNext: "حتى المستوى",
    },
}, "ProgressTab.T");

// Холодные состояния («нет данных ≠ 0»): баннер теста + что разблокируется.
export const COLD = langGuard({
    ru:  { t: "Определим твой уровень", d: "Пройди вводный тест — подберём слова и сложность под тебя.", btn: "Пройти тест", unlock: "Метрики появятся после первых сессий", heat: "Начни сегодня — клетки активности заполнятся" },
    en:  { t: "Let's find your level", d: "Take the placement test — we'll tailor words and difficulty.", btn: "Take test", unlock: "Metrics appear after your first sessions", heat: "Start today — activity cells will fill in" },
    ukr: { t: "Визначимо твій рівень", d: "Пройди вступний тест — підберемо слова й складність.", btn: "Пройти тест", unlock: "Метрики з'являться після перших сесій", heat: "Почни сьогодні — клітинки активності заповняться" },
    pl:  { t: "Określmy twój poziom", d: "Zrób test poziomujący — dobierzemy słowa i trudność.", btn: "Zrób test", unlock: "Metryki pojawią się po pierwszych sesjach", heat: "Zacznij dziś — komórki aktywności się wypełnią" },
    lt:  { t: "Nustatykime tavo lygį", d: "Atlik lygio testą — pritaikysime žodžius ir sudėtingumą.", btn: "Atlikti testą", unlock: "Metrikos atsiras po pirmų sesijų", heat: "Pradėk šiandien — aktyvumo langeliai užsipildys" },
    lv:  { t: "Noteiksim tavu līmeni", d: "Izej līmeņa testu — pielāgosim vārdus un grūtību.", btn: "Iziet testu", unlock: "Rādītāji parādīsies pēc pirmajām sesijām", heat: "Sāc šodien — aktivitātes lauciņi aizpildīsies" },
    ar:  { t: "لنحدّد مستواك", d: "أجرِ اختبار تحديد المستوى — سنخصّص الكلمات والصعوبة لك.", btn: "أجرِ الاختبار", unlock: "تظهر المقاييس بعد جلساتك الأولى", heat: "ابدأ اليوم — ستمتلئ خلايا النشاط" },
}, "ProgressTab.COLD");
