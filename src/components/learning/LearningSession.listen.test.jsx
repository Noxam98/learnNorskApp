// @vitest-environment jsdom
// Слуховой режим LearningSession: аудио-рендер (ChoiceGame listen=true) включается ТОЛЬКО для
// элементов, помеченных бэком listen:true (слуховая сессия из /learning/listen). Любой
// choice_no2int БЕЗ listen (дневная сессия при выкл. аудио) рендерится ТЕКСТОМ (listen=false).
// Контроллер useLearningSession и игры замоканы — проверяем только маппинг флага на проп игры.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// Захватываем пропсы, с которыми смонтировали ChoiceGame.
const choiceProps = [];
vi.mock("../gameComponents/ChoiceGame.jsx", () => ({
    default: (p) => { choiceProps.push(p); return null; },
}));
// Прочие игры в этом тесте не используются — заглушки, чтобы импорт не тянул реальные.
vi.mock("../gameComponents/InputGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/StudyGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/BuildGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/ClozeGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/OrderGame.jsx", () => ({ default: () => null }));
vi.mock("../gameComponents/CellsGame.jsx", () => ({ default: () => null }));

vi.mock("../../store/systemStore.jsx", () => ({ useSystemStore: (sel) => sel({ soundOn: true }) }));
vi.mock("../../store/AuthStore.jsx", () => ({ useAuthStore: (sel) => sel({ user: { gamePrefs: { newPerSession: 6 } } }) }));
vi.mock("../../store/sessionStore.jsx", () => ({ useSessionStore: (sel) => sel({ loading: false }) }));

// Контроллер отдаём фиксированной программой play с одним текущим элементом (idx управляем).
let currentElements = [];
let currentIdx = 0;
vi.mock("./useLearningSession.js", () => ({
    LEGACY_DIR: "int2no",
    useLearningSession: () => ({
        isSystem: true, isListen: true, phase: "play", round: 0, isDesktop: false,
        elements: currentElements, idx: currentIdx, legacyGw: [],
        res: { correct: 0, total: 0 }, cards: 0, hist: [], graduated: 0, protectedNow: 0, protectedTypo: 0,
        after: null, gate: null, busy: false, loadingNext: false,
        onResult: vi.fn(), recordIntro: vi.fn(), onGameFinish: vi.fn(),
        reportCurrent: vi.fn(), skipCurrent: vi.fn(), knowCurrent: vi.fn(), again: vi.fn(),
    }),
}));

import LearningSession from "./LearningSession.jsx";

const gw = (pid) => ({ pool_id: pid, id: pid, no: `w${pid}`, part_of_speech: "noun", translate: { no: [`w${pid}`], ru: [`п${pid}`] } });
const listenEl = (pid) => ({ mode: "choice", dir: "no2int", step: "choice_no2int", repeat: true, listen: true, gw: gw(pid) });
const dailyChoiceEl = (pid) => ({ mode: "choice", dir: "no2int", step: "choice_no2int", repeat: false, listen: false, gw: gw(pid) });

afterEach(() => { cleanup(); choiceProps.length = 0; currentElements = []; currentIdx = 0; });

describe("LearningSession listen-режим", () => {
    it("элемент с listen:true → ChoiceGame в аудио-режиме (listen=true)", () => {
        currentElements = [listenEl(1)];
        currentIdx = 0;
        render(<LearningSession system listen lang="ru" onClose={() => {}} />);
        expect(choiceProps.at(-1).listen).toBe(true);
    });

    it("choice_no2int БЕЗ listen (дневная) → текст (listen=false)", () => {
        currentElements = [dailyChoiceEl(2)];
        currentIdx = 0;
        render(<LearningSession system lang="ru" onClose={() => {}} />);
        expect(choiceProps.at(-1).listen).toBe(false);
    });

    it("listen:true, но фраза → всё равно текстом (listen=false)", () => {
        const el = listenEl(3);
        el.gw.part_of_speech = "phrase";
        currentElements = [el];
        currentIdx = 0;
        render(<LearningSession system listen lang="ru" onClose={() => {}} />);
        expect(choiceProps.at(-1).listen).toBe(false);
    });
});
