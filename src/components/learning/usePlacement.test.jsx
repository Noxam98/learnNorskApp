// @vitest-environment jsdom
// Сеть под вынос логики placement в usePlacement: запуск теста (api.placementGet, сортировка по
// уровню), прохождение всех вопросов → грейд (api.placementGrade) → result, самооценка (placementLevel).
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

vi.mock("../tools/api.js", () => ({
    default: { placementGet: vi.fn(), placementGrade: vi.fn(), placementLevel: vi.fn() },
}));

import { usePlacement } from "./usePlacement.js";
import api from "../tools/api.js";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("usePlacement", () => {
    it("стартует в intro", () => {
        const { result } = renderHook(() => usePlacement("ru", vi.fn()));
        expect(result.current.phase).toBe("intro");
    });

    it("запуск теста → play (вопросы отсортированы по уровню), прогон → result", async () => {
        api.placementGet.mockResolvedValue({ questions: [
            { no: "b", level: "B1", type: "choice", options: ["x"] },
            { no: "a", level: "A1", type: "choice", options: ["y"] },
        ] });
        api.placementGrade.mockResolvedValue({ level: "A2" });
        const { result } = renderHook(() => usePlacement("ru", vi.fn()));

        await act(async () => { await result.current.beginTest(); });
        expect(result.current.phase).toBe("play");
        expect(result.current.questions[0].level).toBe("A1");   // отсортировано A1 < B1

        act(() => result.current.answer("y"));   // 1-й вопрос
        await act(async () => { result.current.answer("x"); });  // 2-й → грейд
        await waitFor(() => expect(result.current.phase).toBe("result"));
        expect(result.current.result).toMatchObject({ level: "A2" });
    });

    it("самооценка уровня сохраняется и закрывает", async () => {
        api.placementLevel.mockResolvedValue({});
        const onClose = vi.fn();
        const { result } = renderHook(() => usePlacement("ru", onClose));
        act(() => result.current.setSelfLevel("C1"));
        await act(async () => { await result.current.saveSelf(); });
        expect(api.placementLevel).toHaveBeenCalledWith("C1");
        expect(onClose).toHaveBeenCalledWith(true);
    });
});
