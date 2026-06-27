// Локальная i18n компонента WordsTab — только данные переводов (langGuard-страж и паритет сохранены).
import { langGuard } from "../../interface/i18nGuard.js";

// Множественные формы «день» (для относительного срока) — используются в строках-функциях ниже.
function plRu(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "день"; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дня"; return "дней"; }
function plUk(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "день"; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дні"; return "днів"; }
function plPl(n) { const m10 = n % 10, m100 = n % 100; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "dni"; return "dni"; }
function plLt(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 0 || (m100 >= 11 && m100 <= 19)) return "dienų"; if (m10 === 1) return "dieną"; return "dienų"; }
function plLv(n) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return "diena"; return "dienas"; }
function plAr(n) { if (n === 1) return "يوم"; if (n === 2) return "يومان"; if (n >= 3 && n <= 10) return "أيام"; return "يومًا"; }

// --- Локальные 5-язычные строки (i18n этого файла; interfaceTranslation не трогаем) ---
export const L = langGuard({
    ru: {
        chips: { all: "Все", new: "Новые", in_progress: "В процессе", repeat: "Повторение", mastered: "Выучено", weak: "Слабые", archived: "Архив" },
        searchPh: "Поиск по всем языкам — norsk, рус, eng…",
        topicAll: "Тема: все", topic: "Тема", levelAll: "Уровень: все", level: "Уровень",
        sortStrength: "По силе", sortDue: "Скоро повторять", sortAlpha: "Алфавит",
        know: "Знаю", knowMenu: "Я это знаю", openCard: "Открыть карточку", speak: "Озвучить",
        reset: "Сбросить прогресс", toArchive: "В архив",
        selected: "Выбрано:", markMastered: "Отметить выученными", practice: "Практика по выбранным", clear: "Снять",
        empty: "Слов не найдено", emptyHint: "Измените фильтры или поисковый запрос.",
        today: "сегодня", tomorrow: "завтра", overdue: "пора",
        inMin: (n) => `через ${n} мин`, inHours: (n) => `через ${n} ч`,
        inDays: (n) => `через ${n} ${plRu(n)}`,
    },
    en: {
        chips: { all: "All", new: "New", in_progress: "In progress", repeat: "Review", mastered: "Mastered", weak: "Weak", archived: "Archive" },
        searchPh: "Search across all languages — norsk, rus, eng…",
        topicAll: "Topic: all", topic: "Topic", levelAll: "Level: all", level: "Level",
        sortStrength: "By strength", sortDue: "Due soon", sortAlpha: "Alphabetical",
        know: "Know", knowMenu: "I know this", openCard: "Open card", speak: "Speak",
        reset: "Reset progress", toArchive: "Archive",
        selected: "Selected:", markMastered: "Mark as mastered", practice: "Practice selected", clear: "Clear",
        empty: "No words found", emptyHint: "Change filters or search query.",
        today: "today", tomorrow: "tomorrow", overdue: "due",
        inMin: (n) => `in ${n} min`, inHours: (n) => `in ${n} h`,
        inDays: (n) => `in ${n} day${n === 1 ? "" : "s"}`,
    },
    ukr: {
        chips: { all: "Усі", new: "Нові", in_progress: "У процесі", repeat: "Повторення", mastered: "Вивчено", weak: "Слабкі", archived: "Архів" },
        searchPh: "Пошук усіма мовами — norsk, укр, eng…",
        topicAll: "Тема: усі", topic: "Тема", levelAll: "Рівень: усі", level: "Рівень",
        sortStrength: "За силою", sortDue: "Скоро повторювати", sortAlpha: "Алфавіт",
        know: "Знаю", knowMenu: "Я це знаю", openCard: "Відкрити картку", speak: "Озвучити",
        reset: "Скинути прогрес", toArchive: "В архів",
        selected: "Вибрано:", markMastered: "Позначити вивченими", practice: "Практика за вибраними", clear: "Зняти",
        empty: "Слів не знайдено", emptyHint: "Змініть фільтри або пошуковий запит.",
        today: "сьогодні", tomorrow: "завтра", overdue: "час",
        inMin: (n) => `через ${n} хв`, inHours: (n) => `через ${n} год`,
        inDays: (n) => `через ${n} ${plUk(n)}`,
    },
    pl: {
        chips: { all: "Wszystkie", new: "Nowe", in_progress: "W trakcie", repeat: "Powtórka", mastered: "Opanowane", weak: "Słabe", archived: "Archiwum" },
        searchPh: "Szukaj we wszystkich językach — norsk, pol, eng…",
        topicAll: "Temat: wszystkie", topic: "Temat", levelAll: "Poziom: wszystkie", level: "Poziom",
        sortStrength: "Wg siły", sortDue: "Wkrótce powtórka", sortAlpha: "Alfabetycznie",
        know: "Znam", knowMenu: "Znam to", openCard: "Otwórz kartę", speak: "Wymów",
        reset: "Zresetuj postęp", toArchive: "Do archiwum",
        selected: "Wybrano:", markMastered: "Oznacz jako opanowane", practice: "Ćwicz wybrane", clear: "Wyczyść",
        empty: "Nie znaleziono słów", emptyHint: "Zmień filtry lub zapytanie.",
        today: "dziś", tomorrow: "jutro", overdue: "czas",
        inMin: (n) => `za ${n} min`, inHours: (n) => `za ${n} godz`,
        inDays: (n) => `za ${n} ${plPl(n)}`,
    },
    lt: {
        chips: { all: "Visi", new: "Nauji", in_progress: "Eigoje", repeat: "Kartojimas", mastered: "Išmokti", weak: "Silpni", archived: "Archyvas" },
        searchPh: "Ieškoti visomis kalbomis — norsk, lt, eng…",
        topicAll: "Tema: visos", topic: "Tema", levelAll: "Lygis: visi", level: "Lygis",
        sortStrength: "Pagal stiprumą", sortDue: "Greitai kartoti", sortAlpha: "Abėcėlė",
        know: "Žinau", knowMenu: "Tai žinau", openCard: "Atverti kortelę", speak: "Įgarsinti",
        reset: "Atstatyti progresą", toArchive: "Į archyvą",
        selected: "Pasirinkta:", markMastered: "Pažymėti išmoktais", practice: "Praktika su pasirinktais", clear: "Nuimti",
        empty: "Žodžių nerasta", emptyHint: "Pakeiskite filtrus arba paieškos užklausą.",
        today: "šiandien", tomorrow: "rytoj", overdue: "laikas",
        inMin: (n) => `po ${n} min`, inHours: (n) => `po ${n} val`,
        inDays: (n) => `po ${n} ${plLt(n)}`,
    },
    lv: {
        chips: { all: "Visi", new: "Jauni", in_progress: "Procesā", repeat: "Atkārtojums", mastered: "Apgūti", weak: "Vāji", archived: "Arhīvs" },
        searchPh: "Meklē visās valodās — norsk, lv, eng…",
        topicAll: "Tēma: visas", topic: "Tēma", levelAll: "Līmenis: visi", level: "Līmenis",
        sortStrength: "Pēc stipruma", sortDue: "Drīz jāatkārto", sortAlpha: "Alfabētiski",
        know: "Zinu", knowMenu: "To zinu", openCard: "Atvērt kartiņu", speak: "Ierunāt",
        reset: "Atiestatīt progresu", toArchive: "Uz arhīvu",
        selected: "Izvēlēti:", markMastered: "Atzīmēt kā apgūtus", practice: "Praktizēt izvēlētos", clear: "Notīrīt",
        empty: "Vārdi nav atrasti", emptyHint: "Maini filtrus vai meklēšanas vaicājumu.",
        today: "šodien", tomorrow: "rīt", overdue: "laiks",
        inMin: (n) => `pēc ${n} min`, inHours: (n) => `pēc ${n} h`,
        inDays: (n) => `pēc ${n} ${plLv(n)}`,
    },
    ar: {
        chips: { all: "الكل", new: "جديدة", in_progress: "قيد التقدّم", repeat: "مراجعة", mastered: "متقَنة", weak: "ضعيفة", archived: "أرشيف" },
        searchPh: "ابحث بكل اللغات — norsk، عربي، eng…",
        topicAll: "الموضوع: الكل", topic: "الموضوع", levelAll: "المستوى: الكل", level: "المستوى",
        sortStrength: "حسب القوة", sortDue: "حان موعدها قريبًا", sortAlpha: "أبجديًا",
        know: "أعرف", knowMenu: "أعرف هذه", openCard: "افتح البطاقة", speak: "انطق",
        reset: "إعادة ضبط التقدّم", toArchive: "أرشفة",
        selected: "المحدَّد:", markMastered: "وسمها كمتقَنة", practice: "تدرّب على المحدَّد", clear: "مسح",
        empty: "لم يُعثر على كلمات", emptyHint: "غيّر الفلاتر أو استعلام البحث.",
        today: "اليوم", tomorrow: "غدًا", overdue: "حان الموعد",
        inMin: (n) => `بعد ${n} دقيقة`, inHours: (n) => `بعد ${n} ساعة`,
        inDays: (n) => `بعد ${n} ${plAr(n)}`,
    },
}, "WordsTab.L");
