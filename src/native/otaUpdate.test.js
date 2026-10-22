// Живое обновление веб-части APK: когда качать, когда нет, и что бандл ставится «на следующий запуск».
import { describe, it, expect, vi } from "vitest";
import { checkOta, fetchJson } from "./otaUpdate.js";

const MANIFEST = "https://example.test/ota/latest.json";

function deps({ manifest, build = "11", bundles = [] } = {}) {
    return {
        http: { get: vi.fn(async () => ({ status: 200, data: manifest })) },
        app: { getInfo: vi.fn(async () => ({ build, version: "1.10" })) },
        updater: {
            list: vi.fn(async () => ({ bundles })),
            download: vi.fn(async ({ version }) => ({ id: `id-${version}`, version, status: "pending" })),
            next: vi.fn(async ({ id }) => ({ id })),
        },
    };
}

const M = { version: "b2", url: "b2.zip", checksum: "abc", minNative: 11 };

describe("checkOta", () => {
    it("та же сборка — ничего не делаем", async () => {
        const d = deps({ manifest: { ...M, version: "b1" } });
        expect(await checkOta(d, { manifestUrl: MANIFEST, current: "b1" })).toBeNull();
        expect(d.updater.download).not.toHaveBeenCalled();
    });

    it("новая сборка — качаем zip (URL относительно манифеста, с checksum) и ставим на следующий запуск", async () => {
        const d = deps({ manifest: M });
        expect(await checkOta(d, { manifestUrl: MANIFEST, current: "b1" })).toBe("id-b2");
        expect(d.updater.download).toHaveBeenCalledWith({ url: "https://example.test/ota/b2.zip", version: "b2", checksum: "abc" });
        expect(d.updater.next).toHaveBeenCalledWith({ id: "id-b2" });
    });

    it("веб требует нативку новее установленного APK — не ставим (ждём обновления APK)", async () => {
        const d = deps({ manifest: { ...M, minNative: 12 }, build: "11" });
        expect(await checkOta(d, { manifestUrl: MANIFEST, current: "b1" })).toBeNull();
        expect(d.updater.download).not.toHaveBeenCalled();
    });

    it("уже скачанный бандл той же версии не качаем заново; сломанный — качаем", async () => {
        const ok = deps({ manifest: M, bundles: [{ id: "old", version: "b2", status: "pending" }] });
        expect(await checkOta(ok, { manifestUrl: MANIFEST, current: "b1" })).toBe("old");
        expect(ok.updater.download).not.toHaveBeenCalled();
        const broken = deps({ manifest: M, bundles: [{ id: "bad", version: "b2", status: "error" }] });
        expect(await checkOta(broken, { manifestUrl: MANIFEST, current: "b1" })).toBe("id-b2");
    });

    it("без манифеста или вшитой сборки (dev) — выключено", async () => {
        const d = deps({ manifest: M });
        expect(await checkOta(d, { manifestUrl: "", current: "b1" })).toBeNull();
        expect(await checkOta(d, { manifestUrl: MANIFEST, current: null })).toBeNull();
        expect(d.http.get).not.toHaveBeenCalled();
    });
});

describe("fetchJson", () => {
    it("разбирает строку (ассет GitHub приходит как octet-stream) и падает на не-200", async () => {
        const str = { get: vi.fn(async () => ({ status: 200, data: '{"a":1}' })) };
        expect(await fetchJson(str, MANIFEST)).toEqual({ a: 1 });
        const nf = { get: vi.fn(async () => ({ status: 404, data: "" })) };
        await expect(fetchJson(nf, MANIFEST)).rejects.toThrow("HTTP 404");
    });
});
