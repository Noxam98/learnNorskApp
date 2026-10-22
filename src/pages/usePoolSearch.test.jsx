// @vitest-environment jsdom
// Сеть под вынос логики Базы в usePoolSearch: начальная загрузка дергает api.getPool/getPoolTopics,
// смена фильтра сбрасывает страницу и перезагружает список, добавление помечает слово. api/сторы замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

const addToLearning = vi.fn(async () => {});
const removeFromLearning = vi.fn(async () => {});
const showToast = vi.fn();

vi.mock("../store/wordStore.jsx", () => ({ useWordsStore: (sel) => sel({ addToLearning, removeFromLearning }) }));
vi.mock("../store/systemStore.jsx", () => ({ useSystemStore: Object.assign(() => {}, { getState: () => ({ showToast }) }) }));
vi.mock("../components/tools/api.js", () => ({
    default: {
        getPool: vi.fn(), getPoolTopics: vi.fn(), searchPool: vi.fn(),
        generateWord: vi.fn(), getPoolMeta: vi.fn(), adminDeletePoolWord: vi.fn(),
    },
}));

import { usePoolSearch } from "./usePoolSearch.js";
import api from "../components/tools/api.js";

const t = { addedToLearning: "добавлено", removedFromLearning: "убрано" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("usePoolSearch", () => {
    it("начальная загрузка списка и фасетов", async () => {
        api.getPoolTopics.mockResolvedValue({ topics: [], levels: [] });
        api.getPool.mockResolvedValue({ words: [{ pool_id: 1, word: "hund" }], total: 1 });
        api.searchPool.mockResolvedValue({ results: [] });

        const { result } = renderHook(() => usePoolSearch("ru", t));
        await waitFor(() => expect(result.current.items).toHaveLength(1));
        expect(result.current.total).toBe(1);
        expect(api.getPool).toHaveBeenCalled();
        expect(api.getPoolTopics).toHaveBeenCalled();
    });

    it("выбор темы сбрасывает страницу и перезагружает список", async () => {
        api.getPoolTopics.mockResolvedValue({ topics: [], levels: [] });
        api.getPool.mockResolvedValue({ words: [], total: 0 });
        api.searchPool.mockResolvedValue({ results: [] });

        const { result } = renderHook(() => usePoolSearch("ru", t));
        await waitFor(() => expect(api.getPool).toHaveBeenCalledTimes(1));
        act(() => result.current.toggleTopic("animals"));
        expect(result.current.topics).toContain("animals");
        await waitFor(() => expect(api.getPool).toHaveBeenCalledTimes(2));
        expect(result.current.page).toBe(1);
    });

    it("onAdd помечает слово добавленным и зовёт addToLearning", async () => {
        api.getPoolTopics.mockResolvedValue({ topics: [], levels: [] });
        api.getPool.mockResolvedValue({ words: [{ pool_id: 7, word: "katt" }], total: 1 });
        api.searchPool.mockResolvedValue({ results: [] });

        const { result } = renderHook(() => usePoolSearch("ru", t));
        await waitFor(() => expect(result.current.items).toHaveLength(1));
        await act(async () => { await result.current.onAdd({ pool_id: 7, word: "katt" }); });
        expect(addToLearning).toHaveBeenCalledWith(7);
        expect(result.current.added[7]).toBe(true);
    });

    it("админ-удаление карточки — только этот омоним (по pool_id), соседний остаётся", async () => {
        api.getPoolTopics.mockResolvedValue({ topics: [], levels: [] });
        api.getPool.mockResolvedValue({ words: [{ pool_id: 1, word: "mot" }, { pool_id: 2, word: "mot" }], total: 2 });
        api.searchPool.mockResolvedValue({ results: [] });
        api.adminDeletePoolWord.mockResolvedValue({ ok: true });
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

        const { result } = renderHook(() => usePoolSearch("ru", t));
        await waitFor(() => expect(result.current.items).toHaveLength(2));
        await act(async () => { await result.current.onAdminDelete({ pool_id: 2, word: "mot" }); });
        expect(api.adminDeletePoolWord).toHaveBeenCalledWith("mot", 2);   // без pool_id бэк снёс бы ВСЕ «mot»
        expect(result.current.items.map((w) => w.pool_id)).toEqual([1]);
        expect(result.current.total).toBe(1);
        confirm.mockRestore();
    });

    it("reload перечитывает список (после правки слова в карточке)", async () => {
        api.getPoolTopics.mockResolvedValue({ topics: [], levels: [] });
        api.getPool.mockResolvedValue({ words: [], total: 0 });
        api.searchPool.mockResolvedValue({ results: [] });

        const { result } = renderHook(() => usePoolSearch("ru", t));
        await waitFor(() => expect(api.getPool).toHaveBeenCalledTimes(1));
        act(() => result.current.reload());
        await waitFor(() => expect(api.getPool).toHaveBeenCalledTimes(2));
    });
});
