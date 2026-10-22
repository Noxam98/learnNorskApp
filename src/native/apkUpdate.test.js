// Самообновление APK: когда предлагать новую версию и как идут фазы установки.
import { describe, it, expect, vi, beforeEach } from "vitest";

const plugin = {
    canInstall: vi.fn(),
    downloadAndInstall: vi.fn(),
    openInstallSettings: vi.fn(),
    addListener: vi.fn(async (_ev, cb) => { plugin._progress = cb; return { remove: vi.fn() }; }),
};
// Как настоящий Proxy из registerPlugin: на любое свойство отдаёт «метод плагина», и .then
// тоже — поэтому await прокси (вернуть его из async-функции) падает. Ловит ту ошибку с эмулятора.
const capacitorProxy = new Proxy(plugin, {
    get: (t, k) => (k === "then"
        ? () => { throw new Error('"ApkUpdater.then()" is not implemented on android'); }
        : t[k]),
});
vi.mock("@capacitor/core", () => ({ registerPlugin: () => capacitorProxy, Capacitor: { isNativePlatform: () => false } }));

const { checkApk, installApk, dismissApk } = await import("./apkUpdate.js");
const { useAppUpdateStore } = await import("../store/appUpdateStore.jsx");

const M = { versionCode: 12, versionName: "1.11", apk: "https://example.test/app.apk", sha256: "ff" };
const deps = (build) => ({
    app: { getInfo: vi.fn(async () => ({ build })) },
    http: { get: vi.fn(async () => ({ status: 200, data: JSON.stringify(M) })) },
});

beforeEach(() => {
    vi.clearAllMocks();
    useAppUpdateStore.setState({ apk: M, apkPhase: "idle", apkProgress: 0 });
});

describe("checkApk", () => {
    it("предлагает только версию новее установленной", async () => {
        expect(await checkApk(deps("11"), { manifestUrl: "https://x/app.json" })).toEqual(M);
        expect(await checkApk(deps("12"), { manifestUrl: "https://x/app.json" })).toBeNull();
        expect(await checkApk(deps("13"), { manifestUrl: "https://x/app.json" })).toBeNull();
    });

    it("без адреса манифеста — выключено", async () => {
        const d = deps("1");
        expect(await checkApk(d, { manifestUrl: "" })).toBeNull();
        expect(d.http.get).not.toHaveBeenCalled();
    });
});

describe("installApk", () => {
    it("нет разрешения на установку — фаза permission, без скачивания", async () => {
        plugin.canInstall.mockResolvedValue({ allowed: false });
        await installApk(M);
        expect(useAppUpdateStore.getState().apkPhase).toBe("permission");
        expect(plugin.downloadAndInstall).not.toHaveBeenCalled();
    });

    it("качает с прогрессом и sha256, затем ждёт системный установщик", async () => {
        plugin.canInstall.mockResolvedValue({ allowed: true });
        plugin.downloadAndInstall.mockImplementation(async () => {
            expect(useAppUpdateStore.getState().apkPhase).toBe("downloading");
            plugin._progress({ percent: 42 });
            expect(useAppUpdateStore.getState().apkProgress).toBe(42);
        });
        await installApk(M);
        expect(plugin.downloadAndInstall).toHaveBeenCalledWith({ url: M.apk, sha256: "ff" });
        expect(useAppUpdateStore.getState().apkPhase).toBe("installing");
    });

    it("сбой скачивания/проверки — фаза error", async () => {
        plugin.canInstall.mockResolvedValue({ allowed: true });
        plugin.downloadAndInstall.mockRejectedValue(new Error("checksum mismatch"));
        await installApk(M);
        expect(useAppUpdateStore.getState().apkPhase).toBe("error");
    });

    it("«Позже» прячет предложение", () => {
        dismissApk(12);
        expect(useAppUpdateStore.getState().apk).toBeNull();
    });
});
