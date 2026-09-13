// @vitest-environment jsdom
// Выделение слов набора под «Заучить»: чекбокс на карточке, панель «Выделено N» с «Все /
// Инвертировать / Снять», запуск заучивания только выделенными (ничего не выделено — весь набор).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import SetsTab from "./SetsTab.jsx";
import api from "../../components/tools/api.js";

vi.mock("../../components/tools/api.js", () => ({
    default: { setsList: vi.fn(), setWords: vi.fn(), onTokens: vi.fn() },
}));

const SETS = [{ id: 7, name: "Контрольная", studying: false, count: 3 }];
const WORDS = [
    { pool_id: 1, norwegian: "bil", translate: { ru: ["машина"] }, part_of_speech: "noun", status: "new" },
    { pool_id: 2, norwegian: "hus", translate: { ru: ["дом"] }, part_of_speech: "noun", status: "new" },
    { pool_id: 3, norwegian: "katt", translate: { ru: ["кот"] }, part_of_speech: "noun", status: "new" },
];
// Поиск Базы и импорт-модалки к выделению отношения не имеют — заглушки (снимают сеть/DOM-замеры).
vi.mock("../../components/learning/PoolSearchPanel.jsx", () => ({ default: () => null }));
vi.mock("../../components/sets/GenerateSetModal.jsx", () => ({ default: () => null }));
vi.mock("../../components/sets/PhotoImportModal.jsx", () => ({ default: () => null }));
vi.mock("../../components/sets/TextImportModal.jsx", () => ({ default: () => null }));
vi.mock("../../components/sets/SharedImageImport.jsx", () => ({ default: () => null }));
vi.mock("../../native/sharedImages.js", () => ({ onSharedImages: () => () => {} }));
// Экран добора из Базы проверяется своим тестом — тут важен только факт открытия.
vi.mock("../../components/sets/SetPoolPicker.jsx", () => ({
    default: ({ setId, onClose }) => <div>picker:{setId}<button onClick={() => onClose?.(true)}>picker-done</button></div>,
}));

const checkboxes = () => screen.getAllByRole("checkbox");
const renderTab = (openSession = vi.fn()) => { render(<SetsTab lang="ru" openSession={openSession} />); return openSession; };

// Реализации ставим ПЕРЕД каждым тестом: mockResolvedValue переживает clearAllMocks, и «пустой
// набор» из одного теста протекал бы в следующие.
beforeEach(() => {
    api.setsList.mockResolvedValue(SETS);
    api.setWords.mockResolvedValue({ words: WORDS });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SetsTab: выделение слов набора", () => {
    it("панель выделения появляется только с первым отмеченным словом", async () => {
        renderTab();
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        expect(screen.queryByText(/Выделено/)).toBeNull();
        fireEvent.click(checkboxes()[0]);
        expect(await screen.findByText("Выделено 1")).toBeInTheDocument();
    });

    it("«Все» / «Инвертировать» / «Снять» двигают выделение", async () => {
        renderTab();
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        fireEvent.click(checkboxes()[0]);
        fireEvent.click(screen.getByRole("button", { name: /Все/ }));
        expect(screen.getByText("Выделено 3")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Инвертировать/ }));
        expect(screen.queryByText(/Выделено/)).toBeNull();      // инверсия «всех» — пусто, панель ушла
        fireEvent.click(checkboxes()[1]);
        fireEvent.click(screen.getByRole("button", { name: /Инвертировать/ }));
        expect(screen.getByText("Выделено 2")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Снять/ }));
        expect(screen.queryByText(/Выделено/)).toBeNull();
    });

    it("«Заучить N» стартует ТОЛЬКО выделенными словами", async () => {
        const openSession = renderTab();
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        fireEvent.click(checkboxes()[0]);
        fireEvent.click(checkboxes()[2]);
        fireEvent.click(within(screen.getByText("Выделено 2").parentElement).getByRole("button", { name: /Заучить/ }));
        expect(openSession).toHaveBeenCalledWith(null, "input", expect.objectContaining({
            setId: 7, cram: true, poolIds: [1, 3],
        }));
    });

    it("без выделения заучивание идёт всем набором (poolIds = null)", async () => {
        const openSession = renderTab();
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        fireEvent.click(document.querySelector('button[aria-haspopup="menu"]'));   // троеточие действий набора
        fireEvent.click(await screen.findByRole("button", { name: /Заучить/ }));
        expect(openSession).toHaveBeenCalledWith(null, "input", expect.objectContaining({ poolIds: null }));
    });

    it("кнопка «Из базы» открывает добор, закрытие с изменениями перечитывает набор", async () => {
        renderTab();
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        fireEvent.click(screen.getByRole("button", { name: /Из базы/ }));
        expect(await screen.findByText(/picker:7/)).toBeInTheDocument();
        api.setWords.mockClear();
        fireEvent.click(screen.getByText("picker-done"));
        await waitFor(() => expect(api.setWords).toHaveBeenCalledWith(7));
    });

    it("пустой набор зовёт в Базу, а не к ИИ-генерации", async () => {
        api.setWords.mockResolvedValue({ words: [] });
        renderTab();
        const empty = await screen.findByText("В наборе пока нет слов");
        expect(within(empty.parentElement).getByRole("button", { name: /Из базы/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Сгенерировать/ })).toBeNull();   // ИИ-генерация — в «⋮»
    });

    it("клик по чекбоксу не открывает карточку слова", async () => {
        const openWord = vi.fn();
        render(<SetsTab lang="ru" openSession={vi.fn()} openWord={openWord} />);
        await waitFor(() => expect(checkboxes()).toHaveLength(3));
        fireEvent.click(checkboxes()[0]);
        expect(openWord).not.toHaveBeenCalled();
    });
});
