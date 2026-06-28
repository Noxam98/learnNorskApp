// Локальная i18n компонента MyPage — только данные переводов (langGuard-страж и паритет сохранены).
import { langGuard } from "../interface/i18nGuard.js";

// Авто-скрытие панелей навигации — подписи (локальная карта, тоггл только на смартфоне).
export const AH = langGuard({
    ru:  { t: "Автоскрытие панелей", d: "Панели навигации прячутся за край после паузы — больше места; грип возвращает." },
    en:  { t: "Auto-hide nav bars", d: "Navigation bars slide off after a pause for more space; a grip brings them back." },
    ukr: { t: "Автоприховування панелей", d: "Панелі навігації ховаються за край після паузи — більше місця; грип повертає." },
    pl:  { t: "Auto-ukrywanie pasków", d: "Paski nawigacji chowają się po chwili — więcej miejsca; uchwyt je przywraca." },
    lt:  { t: "Auto slėpti juostas", d: "Navigacijos juostos pasislepia po pauzės — daugiau vietos; rankenėlė grąžina." },
    lv:  { t: "Auto paslēpt joslas", d: "Navigācijas joslas paslēpjas pēc pauzes — vairāk vietas; rokturis tās atgriež." },
    ar:  { t: "إخفاء أشرطة التنقل تلقائيًا", d: "تنزلق أشرطة التنقل بعد توقف مؤقت لمساحة أكبر؛ المقبض يعيدها." },
}, "MyPage.AH");

// Порция новых слов за сессию (gamePrefs.newPerSession) — подписи слайдера.
export const NPS = langGuard({
    ru:  { t: "Новых слов за раз", d: "Сколько новых слов вводить за одну сессию — остальное добивается заданиями уже начатых." },
    en:  { t: "New words per session", d: "How many new words to introduce in one session — the rest are exercises on started words." },
    ukr: { t: "Нових слів за раз", d: "Скільки нових слів вводити за одну сесію — решта це вправи з уже початих." },
    pl:  { t: "Nowych słów na sesję", d: "Ile nowych słów wprowadzać w jednej sesji — reszta to ćwiczenia na rozpoczętych." },
    lt:  { t: "Naujų žodžių per sesiją", d: "Kiek naujų žodžių pateikti per vieną sesiją — likusi dalis – jau pradėtų pratimai." },
    lv:  { t: "Jauni vārdi sesijā", d: "Cik jaunu vārdu ieviest vienā sesijā — pārējais ir jau iesāktu vārdu vingrinājumi." },
    ar:  { t: "كلمات جديدة لكل جلسة", d: "كم كلمة جديدة تُقدَّم في الجلسة الواحدة — والبقية تمارين على كلمات بدأتها." },
}, "MyPage.NPS");
