// @vitest-environment jsdom
// Онбординг нативных фич (A7). Проверяем ровно то, ради чего он написан:
// в вебе его нет вообще, в APK он показывается ОДИН раз, а из Профиля к нему можно вернуться.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import NativeIntro, { openNativeIntro } from "./NativeIntro.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

const TITLE = "Слова из других приложений";

beforeEach(() => {
    localStorage.clear();
    Capacitor.isNativePlatform.mockReturnValue(false);
    useSystemStore.setState({ currentLanguage: "ru" });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("NativeIntro", () => {
    it("в вебе не показывается и флаг не трогает", () => {
        render(<NativeIntro />);
        expect(screen.queryByText(TITLE)).toBeNull();
        expect(localStorage.getItem("ln_native_intro_seen")).toBeNull();
    });

    it("в вебе не открывается даже опенером из Профиля", () => {
        render(<NativeIntro />);
        act(() => openNativeIntro());
        expect(screen.queryByText(TITLE)).toBeNull();
    });

    it("на нативе показывается сам — и только один раз", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        render(<NativeIntro />);
        expect(screen.getByText(TITLE)).toBeInTheDocument();
        // оба сценария + честная строчка про ограничение
        expect(screen.getByText("Выделили слово — добавили")).toBeInTheDocument();
        expect(screen.getByText("Слова со скриншота")).toBeInTheDocument();
        expect(screen.getByText(/своё меню выделения/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Понятно" }));
        expect(localStorage.getItem("ln_native_intro_seen")).toBe("1");

        // следующий запуск приложения — окна больше нет
        cleanup();
        render(<NativeIntro />);
        expect(screen.queryByText(TITLE)).toBeNull();
    });

    it("после закрытия открывается вручную (строка в Профиле)", () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        localStorage.setItem("ln_native_intro_seen", "1");
        render(<NativeIntro />);
        expect(screen.queryByText(TITLE)).toBeNull();

        act(() => openNativeIntro());
        expect(screen.getByText(TITLE)).toBeInTheDocument();
    });
});
