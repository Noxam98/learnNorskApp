// Единый реестр языков интерфейса/переводов.
// ДОБАВИТЬ ЯЗЫК = одна запись здесь + блок строк в interfaceTranslation.jsx
// (+ на бэке добавить код в TRANSLATE_LANGS — переводы слов добьёт фоновый autofill).
//   code — наш внутренний код (он же ключ в word_pool.translate и в interfaceTranslate)
//   name — самоназвание (для выбора языка)
//   flag — эмодзи-флаг (для чипа в Профиле)
//   bcp  — BCP-47 для hyphen/Intl (укр: ukr→uk)
//   tts  — код языка для озвучки перевода (/tts?lang=…)
//   dir  — направление письма: ltr | rtl (rtl пока нет; поле заложено под будущее)
//   endonym — самоназвание в форме «перевод на …» (для подсказок «на русский / на English»)
export const LANGUAGES = [
    { code: "ru",  name: "Русский",    flag: "🇷🇺", bcp: "ru", tts: "ru", dir: "ltr", endonym: "русский" },
    { code: "ukr", name: "Українська", flag: "🇺🇦", bcp: "uk", tts: "uk", dir: "ltr", endonym: "українську" },
    { code: "en",  name: "English",    flag: "🇬🇧", bcp: "en", tts: "en", dir: "ltr", endonym: "English" },
    { code: "pl",  name: "Polski",     flag: "🇵🇱", bcp: "pl", tts: "pl", dir: "ltr", endonym: "polski" },
    { code: "lt",  name: "Lietuvių",   flag: "🇱🇹", bcp: "lt", tts: "lt", dir: "ltr", endonym: "lietuvių" },
];

/** карта code→endonym (совместимость с прежним ENDONYM-объектом) */
export const ENDONYM = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.endonym]));

/** @type {Record<string, typeof LANGUAGES[number]>} */
export const LANG_BY = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
export const LANG_CODES = LANGUAGES.map((l) => l.code);

export const isLang = (code) => !!LANG_BY[code];
/** код языка для озвучки перевода (для tts.js) */
export const ttsLangOf = (code) => (LANG_BY[code]?.tts) || code;
/** BCP-47 для переносов/Intl (для hyphenate.js): укр → uk */
export const bcpOf = (code) => (LANG_BY[code]?.bcp) || code;
/** направление письма: 'ltr' | 'rtl' */
export const dirOf = (code) => (LANG_BY[code]?.dir) || "ltr";
