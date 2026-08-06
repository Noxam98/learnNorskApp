// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { setupServiceWorker, unregisterServiceWorkers } from "./serviceWorker.js";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

/** @type {{ register: any, getRegistrations: any }} */
let swMock;
let unregister;

beforeEach(() => {
    unregister = vi.fn(async () => true);
    swMock = {
        register: vi.fn(async () => ({})),
        getRegistrations: vi.fn(async () => [{ unregister }]),
    };
    Object.defineProperty(navigator, "serviceWorker", { value: swMock, configurable: true });
    Capacitor.isNativePlatform.mockReturnValue(false);
});

afterEach(() => {
    // @ts-ignore — чистим подмену между тестами
    delete navigator.serviceWorker;
    vi.clearAllMocks();
});

describe("setupServiceWorker", () => {
    it("в вебе регистрирует /sw.js после load", async () => {
        setupServiceWorker();
        expect(swMock.register).not.toHaveBeenCalled();   // ждём события load
        window.dispatchEvent(new Event("load"));
        expect(swMock.register).toHaveBeenCalledWith("/sw.js");
        expect(swMock.getRegistrations).not.toHaveBeenCalled();
    });

    it("на нативе не регистрирует SW и снимает старую регистрацию", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        setupServiceWorker();
        window.dispatchEvent(new Event("load"));
        await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
        expect(swMock.register).not.toHaveBeenCalled();
    });

    it("без Service Worker API ничего не делает", () => {
        // @ts-ignore — окружение без SW (старый браузер / node)
        delete navigator.serviceWorker;
        expect(() => setupServiceWorker()).not.toThrow();
    });
});

describe("unregisterServiceWorkers", () => {
    it("считает снятые регистрации", async () => {
        expect(await unregisterServiceWorkers()).toBe(1);
    });

    it("не падает, если getRegistrations бросает", async () => {
        swMock.getRegistrations.mockRejectedValue(new Error("nope"));
        expect(await unregisterServiceWorkers()).toBe(0);
    });
});
