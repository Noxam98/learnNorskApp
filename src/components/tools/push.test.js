// @vitest-environment jsdom
// Гвард A5: внутри APK веб-пуш-подписка (VAPID) не должна вызываться — Service Worker Push
// в Capacitor WebView нет, натив уедет на FCM. В вебе поведение остаётся прежним.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import api from "./api.js";
import { pushSupported, getPushStatus, enablePush, disablePush, resyncPush } from "./push.js";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

vi.mock("./api.js", () => ({
    default: {
        pushVapidKey: vi.fn(async () => ({ publicKey: "AAAA" })),
        pushSubscribe: vi.fn(async () => ({})),
        pushUnsubscribe: vi.fn(async () => ({})),
    },
}));

let subscribe;
let getSubscription;
let readyAccessed;

beforeEach(() => {
    readyAccessed = 0;
    subscribe = vi.fn(async () => ({ toJSON: () => ({ endpoint: "https://push/e" }), endpoint: "https://push/e" }));
    getSubscription = vi.fn(async () => null);
    const registration = { pushManager: { subscribe, getSubscription } };

    Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
            get ready() { readyAccessed += 1; return Promise.resolve(registration); },
        },
    });
    // @ts-ignore — окружение браузера с поддержкой пушей
    window.PushManager = function PushManager() {};
    // @ts-ignore
    window.Notification = { permission: "granted", requestPermission: vi.fn(async () => "granted") };
    Capacitor.isNativePlatform.mockReturnValue(false);
});

afterEach(() => {
    // @ts-ignore
    delete navigator.serviceWorker;
    // @ts-ignore
    delete window.PushManager;
    // @ts-ignore
    delete window.Notification;
    vi.clearAllMocks();
});

describe("веб", () => {
    it("пуши поддерживаются и подписка уходит на бэк", async () => {
        expect(pushSupported()).toBe(true);
        await expect(enablePush()).resolves.toBe(true);
        expect(subscribe).toHaveBeenCalled();
        expect(api.pushSubscribe).toHaveBeenCalledWith({ endpoint: "https://push/e" });
    });

    it("resyncPush молча пере-подписывает", async () => {
        await expect(resyncPush()).resolves.toBe(true);
        expect(api.pushSubscribe).toHaveBeenCalled();
    });
});

describe("натив", () => {
    beforeEach(() => { Capacitor.isNativePlatform.mockReturnValue(true); });

    it("pushSupported() === false даже при живом SW-API", () => {
        expect(pushSupported()).toBe(false);
    });

    it("enablePush не трогает SW и бэк", async () => {
        await expect(enablePush()).rejects.toThrow("unsupported");
        expect(readyAccessed).toBe(0);
        expect(subscribe).not.toHaveBeenCalled();
        expect(api.pushVapidKey).not.toHaveBeenCalled();
        expect(api.pushSubscribe).not.toHaveBeenCalled();
    });

    it("resyncPush ничего не делает", async () => {
        await expect(resyncPush()).resolves.toBe(false);
        expect(api.pushSubscribe).not.toHaveBeenCalled();
    });

    it("disablePush не виснет на serviceWorker.ready", async () => {
        await expect(disablePush()).resolves.toBe(true);
        expect(readyAccessed).toBe(0);
        expect(api.pushUnsubscribe).not.toHaveBeenCalled();
    });

    it("статус пушей — unsupported", async () => {
        await expect(getPushStatus()).resolves.toEqual({
            supported: false, subscribed: false, permission: "unsupported",
        });
    });
});
