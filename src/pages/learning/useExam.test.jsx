// @vitest-environment jsdom
// Сеть под вынос логики «Экзамена» в useExam: начальная загрузка обзора ворот,
// запуск ворот → прогон, грейд ворот → результат. api/звуки замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

vi.mock("../../components/tools/sound.js", () => ({ playSound: vi.fn(), playWin: vi.fn() }));
vi.mock("../../components/tools/api.js", () => ({
    default: {
        learningGate: vi.fn(), learningGateExam: vi.fn(), learningGateGrade: vi.fn(),
    },
}));

import { useExam } from "./useExam.js";
import api from "../../components/tools/api.js";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("useExam", () => {
    it("грузит обзор ворот при монтировании", async () => {
        api.learningGate.mockResolvedValue({ pack: 3, threshold: 5, open: false });
        const { result } = renderHook(() => useExam("ru", vi.fn()));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.gate).toMatchObject({ pack: 3, open: false });
        expect(result.current.phase).toBe("overview");
    });

    it("запуск ворот → прогон, грейд → результат", async () => {
        api.learningGate.mockResolvedValue({ pack: 5, threshold: 5, open: true });
        api.learningGateExam.mockResolvedValue({ questions: [{ pool_id: 1, type: "no2int", no: "hund", options: ["a"] }] });
        api.learningGateGrade.mockResolvedValue({ passed: true, demoted: 0 });
        const refresh = vi.fn();
        const { result } = renderHook(() => useExam("ru", refresh));
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.startGate(); });
        expect(result.current.phase).toBe("run");
        expect(result.current.questions).toHaveLength(1);

        await act(async () => { await result.current.grade([{ pool_id: 1, answer: "a" }]); });
        await waitFor(() => expect(result.current.phase).toBe("result"));
        expect(result.current.result).toMatchObject({ passed: true });
        expect(refresh).toHaveBeenCalled();
    });
});
