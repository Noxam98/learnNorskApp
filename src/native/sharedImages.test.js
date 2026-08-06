// @vitest-environment jsdom
// Доставка картинки из системного «Поделиться» (A4): очередь не теряет картинку, если JS ещё не
// подписан (приложение было закрыто в момент шаринга), и уводит приложение на вкладку «Наборы».
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import {
    SETS_ROUTE, onSharedImages, pushSharedImages, resetSharedImages, setupSharedImages,
} from "./sharedImages.js";

const consume = vi.fn();
const remove = vi.fn();
let event = null;

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
    registerPlugin: vi.fn(() => ({
        consume: (...args) => consume(...args),
        addListener: vi.fn(async (_name, cb) => { event = cb; return { remove }; }),
    })),
}));

const SHOT = "data:image/jpeg;base64,SHOT";

beforeEach(() => {
    resetSharedImages();
    event = null;
    vi.clearAllMocks();
    Capacitor.isNativePlatform.mockReturnValue(false);
    window.location.hash = "#/learning?tab=today";
});

describe("очередь", () => {
    it("отдаёт картинку уже подписанному слушателю", () => {
        const got = vi.fn();
        onSharedImages(got);
        pushSharedImages([SHOT]);
        expect(got).toHaveBeenCalledWith([SHOT]);
    });

    it("картинка, пришедшая до подписки, не теряется (приложение было закрыто)", () => {
        pushSharedImages([SHOT]);
        const got = vi.fn();
        onSharedImages(got);
        expect(got).toHaveBeenCalledWith([SHOT]);
    });

    it("отданное не приходит второй раз", () => {
        const got = vi.fn();
        const off = onSharedImages(got);
        pushSharedImages([SHOT]);
        off();
        const later = vi.fn();
        onSharedImages(later);
        expect(later).not.toHaveBeenCalled();
    });

    it("мусор вместо data-URL игнорируется", () => {
        const got = vi.fn();
        onSharedImages(got);
        expect(pushSharedImages(["", null, "https://example.com/a.jpg"])).toBe(0);
        expect(got).not.toHaveBeenCalled();
    });

    it("уводит приложение на вкладку «Наборы», но не дёргает роутер, если уже там", () => {
        pushSharedImages([SHOT]);
        expect(window.location.hash).toBe(SETS_ROUTE);
        window.location.hash = "#/learning?tab=sets&x=1";
        pushSharedImages([SHOT]);
        expect(window.location.hash).toBe("#/learning?tab=sets&x=1");
    });
});

describe("нативный мост", () => {
    it("в вебе плагин не трогаем", async () => {
        const off = await setupSharedImages();
        expect(consume).not.toHaveBeenCalled();
        expect(() => off()).not.toThrow();
    });

    it("на нативе забирает очередь на старте и по событию плагина", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        consume.mockResolvedValue({ images: [SHOT] });
        const got = vi.fn();
        onSharedImages(got);

        const off = await setupSharedImages();
        expect(consume).toHaveBeenCalledTimes(1);
        expect(got).toHaveBeenCalledWith([SHOT]);

        consume.mockResolvedValue({ images: ["data:image/jpeg;base64,TWO"] });
        event();
        await vi.waitFor(() => expect(got).toHaveBeenLastCalledWith(["data:image/jpeg;base64,TWO"]));
        off();
        expect(remove).toHaveBeenCalled();
    });

    it("падение плагина не всплывает наружу", async () => {
        Capacitor.isNativePlatform.mockReturnValue(true);
        consume.mockRejectedValue(new Error("no plugin"));
        await expect(setupSharedImages()).resolves.toBeInstanceOf(Function);
    });
});
