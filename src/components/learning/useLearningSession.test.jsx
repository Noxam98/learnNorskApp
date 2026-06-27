// @vitest-environment jsdom
// Сеть под вынос логики сессии в useLearningSession: легаси-путь (передан набор) сразу в play,
// системный путь грузит программу через sessionStore.take и переходит в play, финиш игры ведёт
// к summary с подтянутой статистикой. api/стор замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

const take = vi.fn();
const prefetch = vi.fn();
vi.mock("../../store/sessionStore.jsx", () => ({ useSessionStore: Object.assign(() => {}, { getState: () => ({ take, prefetch }) }) }));
vi.mock("../tools/api.js", () => ({
    default: {
        learningAnswer: vi.fn(() => Promise.resolve()),
        learningStats: vi.fn(() => Promise.resolve({ due: 0, byStatus: {} })),
        learningGate: vi.fn(() => Promise.resolve({ open: false })),
        getPoolDistractors: vi.fn(() => Promise.resolve(null)),
    },
}));

import { useLearningSession } from "./useLearningSession.js";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("useLearningSession", () => {
    it("легаси-набор: сразу play, слова приведены к игровой форме", () => {
        const { result } = renderHook(() => useLearningSession({
            words: [{ pool_id: 1, no: "hund", translate: { ru: ["собака"] } }], system: false, lang: "ru", onClose: () => {},
        }));
        expect(result.current.isSystem).toBe(false);
        expect(result.current.phase).toBe("play");
        expect(result.current.legacyGw).toHaveLength(1);
        expect(result.current.legacyGw[0].id).toBe(1);
    });

    it("системный путь: грузит программу через take и переходит в play", async () => {
        take.mockResolvedValue({ elements: [{ pool_id: 5, mode: "choice", direction: "no2int", options: [1, 2] }] });
        const { result } = renderHook(() => useLearningSession({ words: [], system: true, lang: "ru", onClose: () => {} }));
        expect(result.current.phase).toBe("load");
        await waitFor(() => expect(result.current.phase).toBe("play"));
        expect(result.current.elements).toHaveLength(1);
        expect(take).toHaveBeenCalled();
    });

    it("финиш легаси-игры ведёт к summary", async () => {
        const { result } = renderHook(() => useLearningSession({
            words: [{ pool_id: 1, no: "hund" }], system: false, lang: "ru", onClose: () => {},
        }));
        await act(async () => { result.current.onGameFinish({ correct: 1, total: 1 }, false, "choice"); });
        await waitFor(() => expect(result.current.phase).toBe("summary"));
    });
});
