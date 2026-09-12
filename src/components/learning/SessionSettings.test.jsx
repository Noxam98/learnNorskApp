// @vitest-environment jsdom
// Настройки учёбы: тумблеры пишут в gamePrefs одним путём (оптимистичный патч стора + api).
// Сеть под ступень «выбор из вариантов» (gamePrefs.choiceStage): дефолт — ВКЛ (поле может
// отсутствовать), клик шлёт ровно {choiceStage:false} и не задевает соседние настройки.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SessionSettings from "./SessionSettings.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import api from "../tools/api.js";

// onTokens — AuthStore подписывается на него при загрузке модуля, без него мок не поднимется
vi.mock("../tools/api.js", () => ({
    default: { setGamePrefs: vi.fn(() => Promise.resolve({})), onTokens: vi.fn() },
}));
vi.mock("../../store/sessionStore.jsx", () => ({
    useSessionStore: { getState: () => ({ refreshIfStale: vi.fn() }) },
}));

const setPrefs = (gamePrefs) => useAuthStore.setState({ user: { username: "t", gamePrefs } });

afterEach(() => { cleanup(); vi.clearAllMocks(); setPrefs({}); });

describe("SessionSettings: ступень «выбор из вариантов»", () => {
    it("по умолчанию включена (поля в gamePrefs ещё нет)", () => {
        setPrefs({});
        render(<SessionSettings open lang="ru" onClose={() => {}} />);
        expect(screen.getByRole("switch", { name: /Выбор из вариантов/i })).toHaveAttribute("aria-checked", "true");
    });

    it("клик выключает ступень и шлёт только своё поле", () => {
        setPrefs({ audio: true });
        render(<SessionSettings open lang="ru" onClose={() => {}} />);
        fireEvent.click(screen.getByRole("switch", { name: /Выбор из вариантов/i }));
        expect(api.setGamePrefs).toHaveBeenCalledWith({ choiceStage: false });
        expect(useAuthStore.getState().user.gamePrefs).toEqual({ audio: true, choiceStage: false });
    });

    it("выключенную ступень показывает выключенной и включает обратно", () => {
        setPrefs({ choiceStage: false });
        render(<SessionSettings open lang="ru" onClose={() => {}} />);
        const sw = screen.getByRole("switch", { name: /Выбор из вариантов/i });
        expect(sw).toHaveAttribute("aria-checked", "false");
        fireEvent.click(sw);
        expect(api.setGamePrefs).toHaveBeenCalledWith({ choiceStage: true });
    });
});
