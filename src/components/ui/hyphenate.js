import { hyphenateSync as nb } from "hyphen/nb";
import { hyphenateSync as ru } from "hyphen/ru";
import { hyphenateSync as uk } from "hyphen/uk";
import { hyphenateSync as en } from "hyphen/en";
import { hyphenateSync as pl } from "hyphen/pl";
import { hyphenateSync as lt } from "hyphen/lt";

const FN = { nb, ru, uk, en, pl, lt };
const BCP = { ru: "ru", ukr: "uk", en: "en", pl: "pl", lt: "lt" };

// Код языка для переноса: норвежский → nb, иначе по currentLanguage приложения.
export const hyLang = (currentLanguage, isNorwegian) =>
    (isNorwegian ? "nb" : (BCP[currentLanguage] || currentLanguage));

// Вставляет мягкие переносы (U+00AD) по правилам языка — браузер рисует дефис
// в точке разрыва строки (работает без словарей переносов браузера, на всех языках).
// Безопасно: при неизвестном языке/ошибке возвращает исходный текст.
export const hyphenate = (text, lang) => {
    if (!text) return text;
    const fn = FN[lang];
    if (!fn) return text;
    try { return fn(text); } catch { return text; }
};
