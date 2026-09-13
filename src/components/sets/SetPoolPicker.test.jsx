// @vitest-environment jsdom
// Добор слов в набор из Базы: тот же экран Базы с переопределёнными действиями.
//   • тап по карточке — добавить/убрать слово в ТЕКУЩЕМ наборе (а не в Учёбу);
//   • удержание — карточка слова;
//   • чип «Набор» — срез in_set на бэке (set_id + in_set уходят в /pool).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import SetPoolPicker from "./SetPoolPicker.jsx";
import api from "../tools/api.js";

const POOL = {
    total: 2,
    words: [
        { word: "bil", pool_id: 1, translate: { ru: ["машина"] }, part_of_speech: "noun", level: "A1", topics: [], inSet: false },
        { word: "hus", pool_id: 2, translate: { ru: ["дом"] }, part_of_speech: "noun", level: "A1", topics: [], inSet: true },
    ],
    facets: { topics: [], levels: [] },
};

vi.mock("../tools/api.js", () => ({
    default: {
        getPool: vi.fn(() => Promise.resolve(POOL)),
        getPoolTopics: vi.fn(() => Promise.resolve({ topics: [], levels: [] })),
        searchPool: vi.fn(() => Promise.resolve({ results: [] })),
        setAddWords: vi.fn(() => Promise.resolve({ ok: true })),
        setRemoveWord: vi.fn(() => Promise.resolve({ ok: true })),
        addToLearning: vi.fn(),
        onTokens: vi.fn(),
    },
}));
// Карточка слова — тяжёлая (описание/ИИ/озвучка); для этих проверок хватит факта открытия.
vi.mock("../ui/WordInfoModal.jsx", () => ({
    WordInfoModal: ({ open, word }) => (open ? <div>card:{word}</div> : null),
}));

const card = (w) => document.querySelector(`.wcard[data-word="${w}"]`);
const open = (props = {}) => render(<SetPoolPicker setId={7} setName="Теория" count={1} lang="ru" onClose={vi.fn()} {...props} />);

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SetPoolPicker", () => {
    it("грузит Базу со срезом набора и красит уже добавленные слова", async () => {
        open();
        await waitFor(() => expect(card("bil")).toBeTruthy());
        expect(api.getPool).toHaveBeenCalledWith(expect.objectContaining({ setId: 7 }));
        expect(card("hus").className).toContain("is-added");     // inSet:true с бэка
        expect(card("bil").className).not.toContain("is-added");
    });

    it("тап по карточке кладёт слово в набор, повторный — убирает", async () => {
        open();
        await waitFor(() => expect(card("bil")).toBeTruthy());
        fireEvent.click(card("bil"));
        await waitFor(() => expect(api.setAddWords).toHaveBeenCalledWith(7, [1]));
        fireEvent.click(card("hus"));
        await waitFor(() => expect(api.setRemoveWord).toHaveBeenCalledWith(7, 2));
        expect(api.addToLearning).not.toHaveBeenCalled();        // в Учёбу напрямую не кладём
    });

    it("удержание открывает карточку слова и НЕ добавляет его", async () => {
        vi.useFakeTimers();
        try {
            open();
            await vi.waitFor(() => expect(card("bil")).toBeTruthy());
            fireEvent.pointerDown(card("bil"));
            act(() => { vi.advanceTimersByTime(500); });
            fireEvent.pointerUp(card("bil"));
            fireEvent.click(card("bil"));                        // клик после удержания подавляется
            expect(screen.getByText("card:bil")).toBeInTheDocument();
            expect(api.setAddWords).not.toHaveBeenCalled();
        } finally { vi.useRealTimers(); }
    });

    it("чип «Набор» шлёт срез in_set на бэк", async () => {
        open();
        await waitFor(() => expect(card("bil")).toBeTruthy());
        fireEvent.click(screen.getByRole("button", { name: /Набор/ }));
        fireEvent.click(await screen.findByText("Нет в наборе"));
        await waitFor(() => expect(api.getPool).toHaveBeenLastCalledWith(expect.objectContaining({ setId: 7, inSet: "out" })));
    });

    it("«Готово» закрывает и сообщает, менялся ли набор", async () => {
        const onClose = vi.fn();
        open({ onClose });
        await waitFor(() => expect(card("bil")).toBeTruthy());
        fireEvent.click(screen.getByRole("button", { name: /Готово/ }));
        expect(onClose).toHaveBeenCalledWith(false);             // ничего не трогали
        cleanup(); onClose.mockClear();
        open({ onClose });
        await waitFor(() => expect(card("bil")).toBeTruthy());
        fireEvent.click(card("bil"));
        await waitFor(() => expect(api.setAddWords).toHaveBeenCalled());
        fireEvent.click(screen.getByRole("button", { name: /Готово/ }));
        expect(onClose).toHaveBeenCalledWith(true);               // набор менялся → вкладка перечитает
    });
});
