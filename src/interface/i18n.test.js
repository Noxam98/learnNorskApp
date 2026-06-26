// CI-гейт полноты переводов: валит сборку, если в центральном interfaceTranslate не хватает
// языка реестра или ключа на каком-то языке (паритет). Локальные T-мапы покрывает dev-страж
// langGuard (см. i18nGuard.js) — их без импорта компонентов юнит-тестить неудобно.
import { describe, it, expect } from "vitest";
import { interfaceTranslate } from "./interfaceTranslation.jsx";
import { LANGUAGES, LANG_CODES } from "./languages.js";

describe("i18n: реестр языков", () => {
    it("у каждого языка заполнены метаданные (name/bcp/tts/dir/endonym)", () => {
        const bad = [];
        for (const l of LANGUAGES) {
            for (const f of ["code", "name", "bcp", "tts", "dir", "endonym"]) {
                if (!l[f]) bad.push(`${l.code || "?"}.${f}`);
            }
        }
        expect(bad, `пустые поля реестра: ${bad.join(", ")}`).toEqual([]);
    });
});

describe("i18n: interfaceTranslate", () => {
    it("есть языковой блок для каждого языка реестра", () => {
        const missing = LANG_CODES.filter((c) => !interfaceTranslate[c]);
        expect(missing, `нет блоков: ${missing.join(", ")}`).toEqual([]);
    });

    it("паритет ключей: каждый ключ присутствует во ВСЕХ языковых блоках", () => {
        const blocks = LANG_CODES.filter((c) => interfaceTranslate[c]);
        const allKeys = new Set();
        for (const c of blocks) for (const k of Object.keys(interfaceTranslate[c])) allKeys.add(k);
        const gaps = [];
        for (const c of blocks) {
            const miss = [...allKeys].filter((k) => !(k in interfaceTranslate[c]));
            if (miss.length) gaps.push(`${c}: ${miss.join(", ")}`);
        }
        expect(gaps, `пропущены ключи по языкам:\n${gaps.join("\n")}`).toEqual([]);
    });
});
