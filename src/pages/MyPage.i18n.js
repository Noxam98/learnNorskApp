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
