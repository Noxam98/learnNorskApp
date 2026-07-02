// @vitest-environment jsdom
// Сеть под вынос логики дашборда в useToday: загрузка статистики/ворот, расчёт честного состава
// и learnable из byStatus, toggleFocus шлёт темы на сервер. api/сторы замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

const setState = vi.fn();
vi.mock("../../store/AuthStore.jsx", () => ({
    useAuthStore: Object.assign((sel) => sel({ user: { focusTopics: [] } }), { setState: (...a) => setState(...a) }),
}));
vi.mock("../../store/sessionStore.jsx", () => ({
    useSessionStore: Object.assign((sel) => sel({ loading: false, next: null }),
        { getState: () => ({ refreshIfStale: () => {} }) }),
}));
vi.mock("../../components/tools/api.js", () => ({
    default: {
        learningGate: vi.fn(), learningStats: vi.fn(), learningSession: vi.fn(), setFocusTopics: vi.fn(),
        getListenStatus: vi.fn(() => Promise.resolve({ pending: 0, pack: 10, ready: false, audio: true })),
    },
}));

import { useToday } from "./useToday.js";
import api from "../../components/tools/api.js";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("useToday", () => {
    it("грузит обзор и считает состав/learnable из byStatus", async () => {
        api.learningGate.mockResolvedValue({ open: false, pack: 0, threshold: 0 });
        api.learningStats.mockResolvedValue({ total: 10, byStatus: { repeat: 2, new: 3 }, streak: 5 });
        api.learningSession.mockResolvedValue({ words: [] });
        const { result } = renderHook(() => useToday({ reloadKey: 0, refresh: vi.fn(), openSession: vi.fn() }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.streak).toBe(5);
        expect(result.current.composition.review).toBe(2);   // из by.repeat (сессия не прогрета)
        expect(result.current.learnable).toBe(5);            // 2 repeat + 3 new
    });

    it("toggleFocus добавляет тему и шлёт на сервер", async () => {
        api.learningGate.mockResolvedValue({});
        api.learningStats.mockResolvedValue({ total: 5, byStatus: {} });
        api.setFocusTopics.mockResolvedValue({});
        const { result } = renderHook(() => useToday({ reloadKey: 0, refresh: vi.fn(), openSession: vi.fn() }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => { await result.current.toggleFocus("animals"); });
        expect(api.setFocusTopics).toHaveBeenCalledWith(["animals"]);
    });
});
