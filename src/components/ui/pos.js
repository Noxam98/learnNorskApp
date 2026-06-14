// Маппинг части речи (норвежское/англ. значение из бэкенда) на класс цвета и ключ метки.
// Сама подпись локализуется через interfaceTranslate[lang].pos[key].
const MAP = [
    { re: /(substantiv|noun|сущ|ім\.|rzecz|dkt)/i,            cls: "pos--noun",   key: "noun" },
    { re: /(verb|гл|дієсл|czas|veiks)/i,                       cls: "pos--verb",   key: "verb" },
    { re: /(adjektiv|adjective|adj|прил|прикм|przym|būdv)/i,   cls: "pos--adj",    key: "adj" },
    { re: /(phrase|uttrykk|фраза|setning|fraz)/i,             cls: "pos--phrase", key: "phrase" },
];

// Возвращает { cls, key, raw }. raw — исходное значение (фолбэк, если перевода нет).
export const posMeta = (pos) => {
    const raw = (pos || "").toString();
    for (const m of MAP) if (m.re.test(raw)) return { cls: m.cls, key: m.key, raw };
    return { cls: "pos--other", key: "other", raw };
};

// Локализованная короткая метка части речи.
export const posLabel = (pos, t) => {
    const { key, raw } = posMeta(pos);
    return t?.pos?.[key] || (key === "other" ? (raw ? raw.slice(0, 8) : "") : key);
};

export default posMeta;
