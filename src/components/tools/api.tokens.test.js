// Мост токенов (A2.1): гидрация ApiService из асинхронного хранилища (натив) и регидрация
// на возврате в приложение. Веб-путь (синхронный снимок) проверяем отдельным кейсом —
// его поведение меняться не должно.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiService } from "./api.js";

const A1 = "aaa.bbb.ccc";
const R1 = "ddd.eee.fff";
const A2 = "a2.b2.c2";
const R2 = "d2.e2.f2";

/**
 * Хранилище «как на нативе»: синхронного снимка нет, всё через промисы.
 * @param {{access?: string|null, refresh?: string|null}} [initial]
 */
function nativeStore(initial = {}) {
    const data = { access: initial.access ?? null, refresh: initial.refresh ?? null };
    return {
        data,
        readSync: vi.fn(() => null),
        read: vi.fn(async () => ({ ...data })),
        write: vi.fn(async (access, refresh) => { data.access = access; data.refresh = refresh; }),
        clear: vi.fn(async () => { data.access = null; data.refresh = null; }),
    };
}

/** Хранилище «как в вебе»: снимок отдаётся синхронно. */
function webStore(initial = {}) {
    const s = nativeStore(initial);
    s.readSync = vi.fn(() => ({ ...s.data }));
    return s;
}

let store;

beforeEach(() => { store = nativeStore(); });

describe("гидрация", () => {
    it("пустое хранилище → юзер не авторизован, ready() резолвится", async () => {
        const api = new ApiService("http://x", store);
        await api.ready();
        expect(api.accessToken).toBeNull();
        expect(api.refreshToken).toBeNull();
        expect(api.isAuthenticated()).toBe(false);
        expect(store.clear).not.toHaveBeenCalled();
    });

    it("валидная пара приезжает в память ДО резолва ready()", async () => {
        const api = new ApiService("http://x", nativeStore({ access: A1, refresh: R1 }));
        expect(api.accessToken).toBeNull();          // Preferences асинхронный: сразу токена нет
        await api.ready();
        expect(api.accessToken).toBe(A1);
        expect(api.refreshToken).toBe(R1);
        expect(api.isAuthenticated()).toBe(true);
    });

    it("битая пара (старый AES-блоб) не применяется и вычищается", async () => {
        const broken = nativeStore({ access: "U2FsdGVkX1+blob", refresh: "U2FsdGVkX1+blob2" });
        const api = new ApiService("http://x", broken);
        await api.ready();
        expect(api.accessToken).toBeNull();
        expect(broken.clear).toHaveBeenCalled();
    });

    it("половина пары (только access) — тоже мусор, чистим", async () => {
        const half = nativeStore({ access: A1, refresh: null });
        const api = new ApiService("http://x", half);
        await api.ready();
        expect(api.accessToken).toBeNull();
        expect(half.clear).toHaveBeenCalled();
    });

    it("сбой хранилища не роняет старт", async () => {
        const broken = { ...nativeStore(), read: vi.fn(async () => { throw new Error("no plugin"); }) };
        const api = new ApiService("http://x", broken);
        await expect(api.ready()).resolves.toBeUndefined();
        expect(api.accessToken).toBeNull();
    });

    it("веб: снимок применяется синхронно, ещё до await ready()", async () => {
        const api = new ApiService("http://x", webStore({ access: A1, refresh: R1 }));
        expect(api.accessToken).toBe(A1);           // как было до Capacitor
        await api.ready();
        expect(api.accessToken).toBe(A1);
    });
});

describe("запись", () => {
    it("_setTokens кладёт пару в память и в адаптер", async () => {
        const api = new ApiService("http://x", store);
        await api.ready();
        api._setTokens(A1, R1);
        expect(api.accessToken).toBe(A1);
        expect(store.write).toHaveBeenCalledWith(A1, R1);
        await Promise.resolve();
        expect(store.data).toEqual({ access: A1, refresh: R1 });
    });

    it("logout чистит и память, и адаптер", async () => {
        const api = new ApiService("http://x", nativeStore({ access: A1, refresh: R1 }));
        await api.ready();
        api.logout();
        expect(api.accessToken).toBeNull();
        expect(api.refreshToken).toBeNull();
        expect(store.clear).not.toHaveBeenCalled();  // чистится ТОТ store, что отдан инстансу
        expect(api._store.clear).toHaveBeenCalled();
    });
});

describe("регидрация на возврате в приложение", () => {
    it("подхватывает пару, записанную «снаружи» (нативная активити отрефрешила и ротировала refresh)", async () => {
        const s = nativeStore({ access: A1, refresh: R1 });
        const api = new ApiService("http://x", s);
        await api.ready();

        s.data.access = A2;   // это сделала активити PROCESS_TEXT, пока WebView был в фоне
        s.data.refresh = R2;

        expect(await api.rehydrateTokens()).toBe(true);
        expect(api.accessToken).toBe(A2);
        expect(api.refreshToken).toBe(R2);           // со старым refresh следующий /refresh дал бы 401
    });

    it("уведомляет подписчиков (зеркало accessToken в AuthStore)", async () => {
        const s = nativeStore({ access: A1, refresh: R1 });
        const api = new ApiService("http://x", s);
        await api.ready();
        const seen = [];
        api.onTokens((t) => seen.push(t));
        s.data.access = A2; s.data.refresh = R2;
        await api.rehydrateTokens();
        expect(seen).toEqual([A2]);
    });

    it("без изменений в хранилище — не трогает память и не шумит событиями", async () => {
        const api = new ApiService("http://x", nativeStore({ access: A1, refresh: R1 }));
        await api.ready();
        const seen = vi.fn();
        api.onTokens(seen);
        expect(await api.rehydrateTokens()).toBe(false);
        expect(api.accessToken).toBe(A1);
        expect(seen).not.toHaveBeenCalled();
    });

    it("пустое/битое хранилище не разлогинивает живую сессию", async () => {
        const s = nativeStore({ access: A1, refresh: R1 });
        const api = new ApiService("http://x", s);
        await api.ready();
        s.data.access = null; s.data.refresh = null;
        expect(await api.rehydrateTokens()).toBe(false);
        expect(api.accessToken).toBe(A1);
    });

    it("сбой чтения не разлогинивает", async () => {
        const s = nativeStore({ access: A1, refresh: R1 });
        const api = new ApiService("http://x", s);
        await api.ready();
        s.read.mockRejectedValueOnce(new Error("boom"));
        expect(await api.rehydrateTokens()).toBe(false);
        expect(api.accessToken).toBe(A1);
    });
});
