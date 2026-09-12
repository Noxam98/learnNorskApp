// @vitest-environment jsdom
// Режим ЗАУЧИВАНИЯ (requeue) в цикле игры: слово, сданное НЕ с первой попытки предъявления,
// не выбывает из сессии, а встаёт в КОНЕЦ очереди и приходит снова; финиш — только когда каждое
// слово сдано начисто. Без флага поведение прежнее (очередь = набор, каждое слово один раз).
// autoAdvanceMs=0 + без speakAnswer → авто-перехода нет, листаем advance() вручную.
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useGameLoop } from "./useGameLoop.js";

vi.mock("../tools/sound.js", () => ({ playSound: vi.fn(), playWin: vi.fn(), semisOf: () => 0 }));
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: (sel) => sel({ currentLanguage: "ru", autoAdvance: true, soundOn: false }),
}));
vi.mock("../../store/wordStore", () => ({
    useWordsStore: (sel) => sel({ dictList: [], aiPlayWords: null, ToggleChooseToGame: vi.fn(), recordGameResult: vi.fn() }),
}));

const WORDS = [
    { id: 1, translate: { no: ["bil"], ru: ["машина"] } },
    { id: 2, translate: { no: ["hus"], ru: ["дом"] } },
];

const setup = (requeue) => renderHook(() => useGameLoop({
    gmode: "input", words: WORDS, requeue, onResult: () => {},
}));

afterEach(cleanup);

describe("useGameLoop: режим заучивания", () => {
    it("промах возвращает слово в конец очереди, а не заканчивает сессию", () => {
        const { result } = setup(true);
        const missed = result.current.current.id;
        act(() => { result.current.answer(false); });          // промах на первом слове
        expect(result.current.status).toBe("INCORRECT");
        act(() => { result.current.answer(true); });           // перепечатал верно → листаем дальше
        expect(result.current.status).toBe("ASKING");
        const second = result.current.current.id;
        expect(second).not.toBe(missed);
        act(() => { result.current.answer(true); });           // второе слово — начисто
        act(() => { result.current.advance(); });
        // очередь выросла на промах: вместо финиша снова показываем то самое слово
        expect(result.current.status).toBe("ASKING");
        expect(result.current.current.id).toBe(missed);
        act(() => { result.current.answer(true); });           // теперь начисто
        act(() => { result.current.advance(); });
        expect(result.current.status).toBe("FINISHED");
    });

    it("прогресс считает ЗАКРЫТЫЕ слова, а не позицию в очереди", () => {
        const { result } = setup(true);
        expect(result.current.qIndex).toBe(1);
        expect(result.current.qTotal).toBe(2);
        act(() => { result.current.answer(false); });          // промах — слово не закрыто
        expect(result.current.qIndex).toBe(1);
        expect(result.current.segs).toEqual(["now", ""]);
        act(() => { result.current.answer(true); });           // перепечатал → следующее слово
        act(() => { result.current.answer(true); });           // закрыл его начисто
        expect(result.current.knownFirstTry).toBe(1);
        expect(result.current.qIndex).toBe(2);
        expect(result.current.segs).toEqual(["ok", "now"]);
    });

    it("без флага очередь не растёт (прежнее поведение сессий)", () => {
        const { result } = setup(false);
        act(() => { result.current.answer(false); });
        act(() => { result.current.answer(true); });           // ретрай на месте → второе слово
        act(() => { result.current.answer(true); });
        act(() => { result.current.advance(); });
        expect(result.current.status).toBe("FINISHED");        // ровно два предъявления на два слова
    });
});
