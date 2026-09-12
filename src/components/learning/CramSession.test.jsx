// @vitest-environment jsdom
// Режим ЗАУЧИВАНИЯ: сессия берёт слова набора, копит ответы и на финише отдаёт их ТОЛЬКО в дневной
// журнал (SRS не трогаем — /learning/answer не дёргается вовсе). Игру подменяем заглушкой: механику
// очереди проверяет useGameLoop.requeue.test.jsx, тут — обвязка сессии.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import CramSession from "./CramSession.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: {
        setWords: vi.fn(),
        learningNoteActivity: vi.fn(() => Promise.resolve({ ok: true })),
        learningAnswer: vi.fn(() => Promise.resolve({})),
        learningStats: vi.fn(() => Promise.resolve({})),
        onTokens: vi.fn(),
    },
}));
// Заглушка игры: кнопками эмулируем промах / чистый ответ / финиш очереди.
vi.mock("../gameComponents/InputGame.jsx", () => ({
    default: ({ onResult, onFinish, onExit }) => (
        <div>
            <button onClick={() => onResult({ id: 1 }, false)}>miss</button>
            <button onClick={() => onResult({ id: 1 }, true)}>hit</button>
            <button onClick={() => onFinish({ total: 2, correct: 2 })}>fin</button>
            <button onClick={() => onExit?.()}>exit</button>
        </div>
    ),
}));

const WORDS = { words: [
    { pool_id: 1, norwegian: "bil", translate: { ru: ["машина"] } },
    { pool_id: 2, norwegian: "hus", translate: { ru: ["дом"] } },
] };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("CramSession", () => {
    it("показывает интро с числом слов набора", async () => {
        api.setWords.mockResolvedValue(WORDS);
        render(<CramSession setId={7} setName="Контрольная" lang="ru" onClose={() => {}} />);
        expect(await screen.findByText("2 слова")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Начать/ })).toBeInTheDocument();
    });

    it("итог считает ответы и промахи, активность уходит одним пакетом, SRS не трогаем", async () => {
        api.setWords.mockResolvedValue(WORDS);
        render(<CramSession setId={7} lang="ru" onClose={() => {}} />);
        fireEvent.click(await screen.findByRole("button", { name: /Начать/ }));
        fireEvent.click(screen.getByText("miss"));
        fireEvent.click(screen.getByText("hit"));
        fireEvent.click(screen.getByText("hit"));
        fireEvent.click(screen.getByText("fin"));
        expect(await screen.findByText("Всё вписано начисто")).toBeInTheDocument();
        expect(api.learningNoteActivity).toHaveBeenCalledWith(3, 2);   // 3 предъявления, 2 начисто
        expect(api.learningAnswer).not.toHaveBeenCalled();             // рампа/расписание не двигаются
    });

    it("«Готово» после итога не дописывает активность второй раз", async () => {
        api.setWords.mockResolvedValue(WORDS);
        const onClose = vi.fn();
        render(<CramSession setId={7} lang="ru" onClose={onClose} />);
        fireEvent.click(await screen.findByRole("button", { name: /Начать/ }));
        fireEvent.click(screen.getByText("hit"));
        fireEvent.click(screen.getByText("fin"));
        await screen.findByText("Всё вписано начисто");
        fireEvent.click(screen.getByRole("button", { name: "Готово" }));
        expect(api.learningNoteActivity).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalled();
    });

    it("выход до финиша всё равно засчитывает данные ответы в журнал", async () => {
        api.setWords.mockResolvedValue(WORDS);
        const onClose = vi.fn();
        render(<CramSession setId={7} lang="ru" onClose={onClose} />);
        fireEvent.click(await screen.findByRole("button", { name: /Начать/ }));
        fireEvent.click(screen.getByText("hit"));
        fireEvent.click(screen.getByText("miss"));
        fireEvent.click(screen.getByText("exit"));       // бросил на полпути (× / Esc в игре)
        await waitFor(() => expect(api.learningNoteActivity).toHaveBeenCalledWith(2, 1));
        expect(onClose).toHaveBeenCalledWith(true);
    });

    it("берёт только выделенные слова; исчезнувшие из набора id отсекаются", async () => {
        api.setWords.mockResolvedValue(WORDS);
        render(<CramSession setId={7} poolIds={[2, 999]} lang="ru" onClose={() => {}} />);
        expect(await screen.findByText("1 слово")).toBeInTheDocument();
    });

    it("пустой набор — экран «нет слов», без сессии", async () => {
        api.setWords.mockResolvedValue({ words: [] });
        render(<CramSession setId={7} lang="ru" onClose={() => {}} />);
        expect(await screen.findByText("В наборе пока нет слов")).toBeInTheDocument();
        expect(screen.queryByText("miss")).toBeNull();
    });
});
