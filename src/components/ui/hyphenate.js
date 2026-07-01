import { hyphenateSync as nb } from "hyphen/nb";   // норвежский показываем всегда — грузим статически
import { bcpOf } from "../../interface/languages.js";

// Загруженные словари переносов. nb — сразу; словарь языка ИНТЕРФЕЙСА подгружаем динамически
// (6 лишних словарей ~500КБ больше не в стартовом чанке — грузится только активный язык).
const FN = { nb };
const LOADING = {};   // bcp -> Promise (не грузим один словарь дважды)

// Статический маппинг лоадеров: vite код-сплитит только литеральные import()-строки.
const LOADERS = {
    ru: () => import("hyphen/ru"), uk: () => import("hyphen/uk"), en: () => import("hyphen/en"),
    pl: () => import("hyphen/pl"), lt: () => import("hyphen/lt"), lv: () => import("hyphen/lv"),
};

function ensureDict(lang) {
    if (lang === "nb" || FN[lang] || LOADING[lang]) return;
    const load = LOADERS[lang];
    if (!load) return;
    LOADING[lang] = load().then((m) => { FN[lang] = m.hyphenateSync; }).catch(() => {});
}

// Код языка для переноса: норвежский → nb, иначе BCP-47 из единого реестра языков (укр → uk).
export const hyLang = (currentLanguage, isNorwegian) =>
    (isNorwegian ? "nb" : bcpOf(currentLanguage));

// Вставляет мягкие переносы (U+00AD) по правилам языка — браузер рисует дефис в точке разрыва.
// Безопасно: при неизвестном языке/ошибке ИЛИ пока словарь языка интерфейса ещё грузится —
// возвращает исходный текст (переносы косметические; словарь подтягивается разово в первые мгновения).
export const hyphenate = (text, lang) => {
    if (!text) return text;
    const fn = FN[lang];
    if (!fn) { ensureDict(lang); return text; }
    try { return fn(text); } catch { return text; }
};
