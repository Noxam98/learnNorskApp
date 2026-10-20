// @vitest-environment jsdom
// Вопрос «опечатка?» в игре «Ввод» (int2no, экранная клава):
//   • «Нет, ошибся» — обычная ошибка: слово НЕ пролистывается, надо вписать его верно;
//   • «Да, опечатка» — зачёт и переход; следующее слово после верного ответа листается дальше
//     (раньше advance из таймера оставлял held=true, и следующий верный ответ «висел» вечно).
// Клавиатура — заглушка-кнопки (k-<буква>, k-go), соседство клавиш — любое (замена = опечатка).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

vi.mock("./GameKeyboard.jsx", () => ({
    GameKeyboard: ({ onType, onSubmit }) => (
        <div>
            {[..."abcdefghijklmnopqrstuvwxyz"].map((c) => <button key={c} onClick={() => onType(c)}>{"k-" + c}</button>)}
            <button onClick={() => onSubmit()}>k-go</button>
        </div>
    ),
    keysAdjacent: () => true,
}));
vi.mock("../tools/sound.js", () => ({ playSound: vi.fn(), playWin: vi.fn() }));
vi.mock("../ui/tts.js", () => ({
    speakText: () => Promise.resolve(), speakTextEnd: () => null, speakSequence: () => Promise.resolve(),
    prefetchTts: () => {}, ttsLang: (l) => l,
}));
vi.mock("../../store/systemStore.jsx", () => ({
    useSystemStore: (sel) => sel({
        currentLanguage: "ru", autoAdvance: true, soundOn: false, soundVolume: 1,
        showArticles: false, showVerbAa: false, setAutoAdvance: () => {}, setSoundOn: () => {},
    }),
}));
vi.mock("../../store/wordStore", () => ({
    useWordsStore: (sel) => sel({ dictList: [], aiPlayWords: null, ToggleChooseToGame: vi.fn(), recordGameResult: vi.fn() }),
}));

import { InputGame } from "./InputGame.jsx";

const WORDS = [
    { id: 1, translate: { no: ["huset"], ru: ["дом"] }, part_of_speech: "noun" },
    { id: 2, translate: { no: ["bilen"], ru: ["машина"] }, part_of_speech: "noun" },
];

const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });
// печать + «✓» (после дебаунса submit на новом слове)
const typeAndGo = (word) => {
    tick(300);
    for (const c of word) fireEvent.click(screen.getByText("k-" + c));
    fireEvent.click(screen.getByText("k-go"));
};
const shownWord = () => document.querySelector(".qword")?.textContent;
const status = () => document.querySelector(".play")?.getAttribute("data-state");

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("InputGame: вопрос «опечатка?»", () => {
    it("«Нет, ошибся» — ошибка с перепечаткой, слово не пролистывается", () => {
        const onResult = vi.fn();
        render(<InputGame mode="int2no" words={[WORDS[0]]} onResult={onResult} onFinish={vi.fn()} />);
        typeAndGo("husat");
        fireEvent.click(screen.getByText("Нет, ошибся"));
        expect(onResult).toHaveBeenCalledWith(WORDS[0], false, "input");
        tick(10000);                                            // никакого авто-перехода
        expect(status()).toBe("incorrect");
        expect(screen.getByText("Введи слово верно, чтобы продолжить")).toBeInTheDocument();
        expect(screen.getByText("k-go")).toBeInTheDocument();   // клавиатура снова доступна
    });

    it("«Нет, ошибся» → вписал верно → дальше", () => {
        const onFinish = vi.fn();
        render(<InputGame mode="int2no" words={[WORDS[0]]} onResult={vi.fn()} onFinish={onFinish} />);
        typeAndGo("husat");
        fireEvent.click(screen.getByText("Нет, ошибся"));
        for (const c of "huset") fireEvent.click(screen.getByText("k-" + c));
        fireEvent.click(screen.getByText("k-go"));
        expect(onFinish).toHaveBeenCalledOnce();
    });

    it("после «Да, опечатка» следующее верное слово листается дальше (не виснет)", () => {
        const onFinish = vi.fn();
        render(<InputGame mode="int2no" words={WORDS} onResult={vi.fn()} onFinish={onFinish} />);
        const first = shownWord();
        const typo = first?.includes("дом") ? "husat" : "bilan";
        typeAndGo(typo);
        fireEvent.click(screen.getByText("Да, опечатка"));
        tick(1000);                                             // пауза + хвост → следующее слово
        expect(status()).toBe("asking");
        expect(shownWord()).not.toBe(first);
        typeAndGo(first?.includes("дом") ? "bilen" : "huset");
        expect(status()).toBe("correct");
        tick(3000);                                             // авто-переход после верного → финиш
        expect(onFinish).toHaveBeenCalledOnce();
    });
});
