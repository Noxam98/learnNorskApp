// Dev-страж полноты переводов. Ловит «забыл добавить язык/ключ» при добавлении нового языка:
// в режиме разработки console.warn'ит про любой блок/мапу, где не хватает языка из реестра
// (или есть лишний код / неполный набор ключей). В проде — полный no-op (ранний return).
import { LANG_CODES } from "./languages.js";

const DEV = !!(import.meta && import.meta.env && import.meta.env.DEV);

/**
 * Проверить, что в карте-переводов есть ВСЕ языки реестра. Возвращает map без изменений
 * (удобно оборачивать прямо при объявлении: `const T = langGuard({...}, "ListenPrompt")`).
 * @template T
 * @param {T} map  объект вида { ru:…, ukr:…, en:…, pl:…, lt:… }
 * @param {string} [name]  имя для понятного предупреждения
 * @returns {T}
 */
export function langGuard(map, name = "i18n") {
    if (!DEV || !map || typeof map !== "object") return map;
    const codes = Object.keys(map);
    const missing = LANG_CODES.filter((c) => !(c in map));
    if (missing.length) console.warn(`[i18n] ${name}: не хватает языков реестра → ${missing.join(", ")}`);
    const extra = codes.filter((c) => !LANG_CODES.includes(c));
    if (extra.length) console.warn(`[i18n] ${name}: незнакомые коды (не из реестра) → ${extra.join(", ")}`);
    return map;
}

/**
 * Полная проверка центрального interfaceTranslate: все языки реестра присутствуют И во всех
 * языковых блоках одинаковый набор ключей (паритет) — иначе на каком-то языке тихо пропадёт строка.
 * @param {Record<string, Record<string, any>>} translate
 */
export function checkInterfaceTranslate(translate) {
    if (!DEV || !translate) return;
    langGuard(translate, "interfaceTranslate");
    const blocks = LANG_CODES.filter((c) => translate[c]);
    const allKeys = new Set();
    blocks.forEach((c) => Object.keys(translate[c]).forEach((k) => allKeys.add(k)));
    blocks.forEach((c) => {
        const miss = [...allKeys].filter((k) => !(k in translate[c]));
        if (miss.length) {
            const head = miss.slice(0, 12).join(", ");
            console.warn(`[i18n] interfaceTranslate.${c}: нет ${miss.length} ключ(ей) → ${head}${miss.length > 12 ? "…" : ""}`);
        }
    });
}
