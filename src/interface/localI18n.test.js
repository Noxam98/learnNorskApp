// Полнота ЛОКАЛЬНЫХ i18n-карт компонентов (вынесенных в *.i18n.js): каждая карта грузится
// без ошибок, содержит все языки реестра и одинаковый набор ключей во всех языках (паритет).
// langGuard в проде/CI — no-op и лишь console.warn'ит про языки, паритет ключей вообще не
// проверяет, поэтому без этого теста «потерянный на одном языке ключ» проходит молча.
// Центральный interfaceTranslate покрывает i18n.test.js.
import { describe, it, expect } from "vitest";
import { LANG_CODES } from "./languages.js";

import * as ExamTab from "../pages/learning/ExamTab.i18n.js";
import * as TodayTab from "../pages/learning/TodayTab.i18n.js";
import * as SetsTab from "../pages/learning/SetsTab.i18n.js";
import * as WordsTab from "../pages/learning/WordsTab.i18n.js";
import * as ProgressTab from "../pages/learning/ProgressTab.i18n.js";
import * as MyPage from "../pages/MyPage.i18n.js";
import * as LearningSession from "../components/learning/LearningSession.i18n.js";

const MODULES = { ExamTab, TodayTab, SetsTab, WordsTab, ProgressTab, MyPage, LearningSession };

// Каждый экспорт-объект с языковым ключом `ru` считаем langGuard-картой переводов.
const MAPS = [];
for (const [mod, ns] of Object.entries(MODULES)) {
    for (const [name, val] of Object.entries(ns)) {
        if (val && typeof val === "object" && val.ru) MAPS.push([`${mod}.${name}`, val]);
    }
}

describe("локальные i18n-карты (*.i18n.js)", () => {
    it("найдены и загрузились", () => {
        expect(MAPS.length).toBeGreaterThanOrEqual(Object.keys(MODULES).length);
    });

    it.each(MAPS)("%s: все языки реестра присутствуют", (_name, map) => {
        expect(LANG_CODES.filter((c) => !map[c])).toEqual([]);
    });

    it.each(MAPS)("%s: паритет ключей во всех языках", (_name, map) => {
        const langs = LANG_CODES.filter((c) => map[c]);
        const allKeys = new Set();
        for (const c of langs) for (const k of Object.keys(map[c])) allKeys.add(k);
        const gaps = [];
        for (const c of langs) for (const k of allKeys) if (!(k in map[c])) gaps.push(`${c}.${k}`);
        expect(gaps).toEqual([]);
    });
});
