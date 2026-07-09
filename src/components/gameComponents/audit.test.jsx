// @vitest-environment jsdom
// A11y/i18n-аудит игр «Учёбы». Покрывает три исправления:
//   • fix 1 — BuildGame показывает ЛОКАЛИЗОВАННЫЙ (не русский литерал) промпт для lang="en"
//             (раньше отсутствующий ключ t.collectFromLetters проваливал все языки в кириллицу);
//   • fix 5 — grammarOptions ДЕДУПЛИЦИРУЕТ повторяющиеся поверхностные формы (как путь слова);
//   • fix 2 — контейнер фидбэка игры — живой регион (role="status" aria-live="polite") для SR.
// BuildGame рендерим с замоканным циклом (useGameLoop → фиксированный статус INCORRECT), клавиатурой
// (заглушка) и стором — чтобы детерминированно отрисовать состояние фидбэка без прогона механики.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { grammarOptions } from "./gameShared.jsx";

// Цикл игры → фиксированное состояние «ошибка» (INCORRECT) с одним словом. Даёт отрисоваться блоку
// фидбэка (верный ответ + вердикт) без набора/сабмита.
vi.mock("./useGameLoop.js", () => ({
    useGameLoop: () => ({
        t: {
            word: "Word", correctly: "Correct", notQuite: "Not quite", mistake: "Mistake",
            typeRightToGo: "Type it right to continue", check: "Check", exit: "Exit",
            tts: "Listen", ttsPreparing: "…", autoAdvanceTip: "Auto", gameSounds: "Sounds",
            guessedStats: ["Guessed"], mistakesMade: "Mistakes", gameFinished: "Done",
            playAgain: "Play again", backToWordSelection: "Back", noWordsToPlay: "No words",
        },
        currentLanguage: "en",
        total: 1,
        current: { id: 1, translate: { no: ["hus"] }, part_of_speech: "noun" },
        status: "INCORRECT",
        missedIds: new Set(),
        knownFirstTry: 0, score: 0, qIndex: 1, qTotal: 1, segs: [],
        answer: () => {}, restart: () => {}, backToSelection: () => {},
    }),
}));
// Клавиатура не нужна для этих проверок — заглушка (снимает зависимости api/authStore/keyboard).
// BuildGame импортирует и KBD_SET — отдаём пустой Set, чтобы деривация extras не падала.
vi.mock("./GameKeyboard.jsx", () => ({
    GameKeyboard: () => null,
    KBD_SET: new Set(),
}));
// Стор — селекторная заглушка (нужна PlayTopBar / RampDrop): достаточно значений для чтения на маунте.
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: (sel) => sel({
        currentLanguage: "en", autoAdvance: true, soundOn: false, soundVolume: 1,
        vibration: false, vibrationStrength: "mid", kbdAssist: false, kbdAssistZones: false,
    }),
}));

import BuildGame from "./BuildGame.jsx";

afterEach(() => cleanup());

describe("fix 5 — grammarOptions дедуплицирует поверхностные формы", () => {
    it("повтор варианта схлопывается (нет дубль-key / дистрактора, равного верному)", () => {
        const el = { options: [{ w: "en" }, { w: "et" }, { w: "en" }, { w: "ei" }] };
        const opts = grammarOptions(el);
        expect(opts).toHaveLength(3);
        expect([...opts].sort()).toEqual(["ei", "en", "et"]);
        // без дублей → каждый вариант уникален
        expect(new Set(opts).size).toBe(opts.length);
    });

    it("дедуп без учёта регистра (как uniq пути слова)", () => {
        const el = { options: [{ w: "en" }, { w: "En" }, { w: "et" }] };
        const opts = grammarOptions(el);
        expect(opts).toHaveLength(2);
    });

    it("пустые/битые опции отфильтрованы", () => {
        const el = { options: [{ w: "en" }, { w: "" }, {}, { w: "et" }] };
        expect(grammarOptions(el).sort()).toEqual(["en", "et"]);
    });
});

describe("fix 1 — BuildGame: локализованный (не русский) промпт для lang=en", () => {
    it("показывает английский «Build the word · Norsk», без кириллицы", () => {
        render(<BuildGame />);
        const prompt = screen.getByText("Build the word · Norsk");
        expect(prompt).toBeInTheDocument();
        // ключевое: НЕ откат в русский литерал «Собери слово · Norsk»
        expect(screen.queryByText("Собери слово · Norsk")).toBeNull();
        expect(/[а-яА-ЯёЁ]/.test(prompt.textContent || "")).toBe(false);
    });
});

describe("fix 2 — фидбэк игры — живой рег. для SR", () => {
    it("контейнер вердикта — role=status aria-live=polite и содержит текст итога", () => {
        const { container } = render(<BuildGame />);
        const live = container.querySelector('[role="status"][aria-live="polite"]');
        expect(live).not.toBeNull();
        // текстовый вердикт озвучивается (а не только цветная подсветка)
        expect(live?.textContent).toContain("Not quite");
    });
});
