// @vitest-environment jsdom
// Дымовой тест загрузки модулей: каждый рефакторенный компонент ИМПОРТИРУЕТСЯ без ошибок
// (module-eval) и экспортирует функцию-компонент. Ловит класс багов «верхнеуровневая ссылка
// на удалённый импорт» (напр. langGuard после выноса i18n) — его не видят ни tsc (без @ts-check),
// ни vite build (бандлит неопределённые идентификаторы без ошибки), только рантайм.
import { describe, it, expect } from "vitest";

const MODULES = {
    SetsTab: () => import("./SetsTab.jsx"),
    WordsTab: () => import("./WordsTab.jsx"),
    ProgressTab: () => import("./ProgressTab.jsx"),
    ExamTab: () => import("./ExamTab.jsx"),
    TodayTab: () => import("./TodayTab.jsx"),
    MyPage: () => import("../MyPage.jsx"),
    LearningSession: () => import("../../components/learning/LearningSession.jsx"),
    GenerateSetModal: () => import("../../components/sets/GenerateSetModal.jsx"),
    PhotoImportModal: () => import("../../components/sets/PhotoImportModal.jsx"),
};

describe("рефакторенные модули грузятся без ошибок", () => {
    it.each(Object.entries(MODULES))("%s импортируется и экспортирует компонент", async (_name, load) => {
        const mod = await load();
        const Comp = mod.default || Object.values(mod).find((v) => typeof v === "function");
        expect(typeof Comp).toBe("function");
    });
});
