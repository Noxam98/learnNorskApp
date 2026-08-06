import { describe, it, expect, vi, beforeEach } from "vitest";
import { Capacitor, SystemBars } from "@capacitor/core";
import { applySystemBarsTheme } from "./systemBars.js";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
    SystemBars: { setStyle: vi.fn(async () => {}) },
    SystemBarType: { StatusBar: "StatusBar", NavigationBar: "NavigationBar" },
    SystemBarsStyle: { Dark: "DARK", Light: "LIGHT", Default: "DEFAULT" },
}));

beforeEach(() => {
    vi.clearAllMocks();
    Capacitor.isNativePlatform.mockReturnValue(false);
    SystemBars.setStyle.mockResolvedValue(undefined);
});

describe("applySystemBarsTheme", () => {
    it("в вебе не трогает системные панели", async () => {
        await applySystemBarsTheme("light");
        expect(SystemBars.setStyle).not.toHaveBeenCalled();
    });

    it("на нативе: статус-бар всегда со светлыми значками (лежит на тёмной фирменной полосе)", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        await applySystemBarsTheme("light");
        expect(SystemBars.setStyle).toHaveBeenCalledWith({ bar: "StatusBar", style: "DARK" });
    });

    it("светлая тема приложения → тёмная жестовая полоса (она лежит на светлом таб-баре)", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        await applySystemBarsTheme("light");
        expect(SystemBars.setStyle).toHaveBeenCalledWith({ bar: "NavigationBar", style: "LIGHT" });
    });

    it("тёмная тема приложения → светлая жестовая полоса", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        await applySystemBarsTheme("dark");
        expect(SystemBars.setStyle).toHaveBeenCalledWith({ bar: "NavigationBar", style: "DARK" });
    });

    it("ошибка плагина не всплывает наружу", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        SystemBars.setStyle.mockRejectedValue(new Error("no window"));
        await expect(applySystemBarsTheme("light")).resolves.toBeUndefined();
    });
});
