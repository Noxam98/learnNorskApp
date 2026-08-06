// Адаптер хранилища токенов: веб → localStorage (синхронный снимок), натив → Preferences.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { tokenStore, ACCESS_KEY, REFRESH_KEY } from "./tokenStore.js";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

// Нативное хранилище: тот же контракт, что у @capacitor/preferences (get/set/remove).
//
// Мокаем ПРОКСИ, а не голый объект — иначе тест разойдётся с устройством. Настоящий
// Capacitor отдаёт Proxy, который отвечает функцией на ЛЮБОЕ обращение к свойству, в том
// числе `then`. Из-за этого прокси выглядит thenable, и если вернуть его из async-функции,
// движок дёрнет `Preferences.then(resolve, reject)` → на Android метода нет → промис не
// разрешается никогда → белый экран (ровно это и словили на телефоне). Плоский мок такое
// пропускает, прокси — нет.
const prefs = new Map();
vi.mock("@capacitor/preferences", () => {
    const impl = {
        get: vi.fn(async ({ key }) => ({ value: prefs.has(key) ? prefs.get(key) : null })),
        set: vi.fn(async ({ key, value }) => { prefs.set(key, value); }),
        remove: vi.fn(async ({ key }) => { prefs.delete(key); }),
    };
    const Preferences = new Proxy(impl, {
        get(target, prop) {
            if (typeof prop === "symbol") return undefined;
            if (prop in target) return target[prop];
            return () => new Promise(() => {});   // несуществующий метод: висит, как на нативе
        },
    });
    return { Preferences };
});

/** @type {Map<string, string>} */
let ls;

beforeEach(() => {
    prefs.clear();
    ls = new Map();
    globalThis.localStorage = /** @type {any} */ ({
        getItem: (k) => (ls.has(k) ? ls.get(k) : null),
        setItem: (k, v) => { ls.set(k, String(v)); },
        removeItem: (k) => { ls.delete(k); },
    });
    Capacitor.isNativePlatform.mockReturnValue(false);
});

afterEach(() => {
    // @ts-ignore — чистим подмену между тестами
    delete globalThis.localStorage;
    vi.clearAllMocks();
});

describe("веб", () => {
    it("readSync отдаёт пару из localStorage синхронно", () => {
        ls.set(ACCESS_KEY, "a.b.c");
        ls.set(REFRESH_KEY, "d.e.f");
        expect(tokenStore.readSync()).toEqual({ access: "a.b.c", refresh: "d.e.f" });
    });

    it("write/clear ходят в localStorage", async () => {
        await tokenStore.write("a.b.c", "d.e.f");
        expect(ls.get(ACCESS_KEY)).toBe("a.b.c");
        expect(ls.get(REFRESH_KEY)).toBe("d.e.f");
        await tokenStore.clear();
        expect(ls.size).toBe(0);
    });

    it("недоступный localStorage не роняет чтение", () => {
        globalThis.localStorage = /** @type {any} */ ({ getItem: () => { throw new Error("blocked"); } });
        expect(tokenStore.readSync()).toEqual({ access: null, refresh: null });
    });
});

describe("натив", () => {
    beforeEach(() => { Capacitor.isNativePlatform.mockReturnValue(true); });

    it("readSync не отдаёт снимок — Preferences асинхронный", () => {
        expect(tokenStore.readSync()).toBeNull();
    });

    it("write кладёт обе записи в Preferences, read их возвращает", async () => {
        await tokenStore.write("a.b.c", "d.e.f");
        expect(prefs.get(ACCESS_KEY)).toBe("a.b.c");
        expect(prefs.get(REFRESH_KEY)).toBe("d.e.f");
        expect(await tokenStore.read()).toEqual({ access: "a.b.c", refresh: "d.e.f" });
        // localStorage при этом не трогаем — источник правды на нативе один
        expect(ls.size).toBe(0);
    });

    it("пустое хранилище читается как пара null", async () => {
        expect(await tokenStore.read()).toEqual({ access: null, refresh: null });
    });

    it("разово переносит пару из localStorage прошлых сборок в Preferences", async () => {
        ls.set(ACCESS_KEY, "a.b.c");
        ls.set(REFRESH_KEY, "d.e.f");
        expect(await tokenStore.read()).toEqual({ access: "a.b.c", refresh: "d.e.f" });
        expect(prefs.get(ACCESS_KEY)).toBe("a.b.c");
        expect(ls.size).toBe(0);                       // миграция одноразовая
        expect(await tokenStore.read()).toEqual({ access: "a.b.c", refresh: "d.e.f" });
    });

    it("clear удаляет обе записи", async () => {
        await tokenStore.write("a.b.c", "d.e.f");
        await tokenStore.clear();
        expect(await tokenStore.read()).toEqual({ access: null, refresh: null });
    });
});

// Регрессия белого экрана (найдено на устройстве, 6.08.2026): прокси Capacitor выглядит
// thenable, поэтому возвращать его из async-функции нельзя — иначе read() никогда не
// завершится, api.ready() не резолвится и приложение не рисуется вообще.
describe("прокси Capacitor не подвешивает старт", () => {
    it("read() на нативе завершается, а не висит", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        prefs.set(ACCESS_KEY, "a.b.c");
        prefs.set(REFRESH_KEY, "d.e.f");
        const pair = await Promise.race([
            tokenStore.read(),
            new Promise((r) => setTimeout(() => r("ПОВИСЛО"), 200)),
        ]);
        expect(pair).toEqual({ access: "a.b.c", refresh: "d.e.f" });
    });

    it("write() и clear() на нативе тоже завершаются", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        const w = await Promise.race([
            tokenStore.write("a.b.c", "d.e.f").then(() => "ок"),
            new Promise((r) => setTimeout(() => r("ПОВИСЛО"), 200)),
        ]);
        expect(w).toBe("ок");
        const c = await Promise.race([
            tokenStore.clear().then(() => "ок"),
            new Promise((r) => setTimeout(() => r("ПОВИСЛО"), 200)),
        ]);
        expect(c).toBe("ок");
    });
});
