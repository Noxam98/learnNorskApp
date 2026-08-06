// Подписка на возврат приложения из фона: только натив, только isActive: true.
import { it, expect, vi, beforeEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { onAppResume } from "./appResume.js";

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

const remove = vi.fn();
let handler = null;
vi.mock("@capacitor/app", () => ({
    App: {
        addListener: vi.fn(async (_event, cb) => { handler = cb; return { remove }; }),
    },
}));

beforeEach(() => {
    handler = null;
    vi.clearAllMocks();
    Capacitor.isNativePlatform.mockReturnValue(false);
});

it("в вебе не подписывается", async () => {
    const off = await onAppResume(() => { throw new Error("не должно вызываться"); });
    expect(handler).toBeNull();
    expect(() => off()).not.toThrow();
});

it("на нативе зовёт обработчик только на isActive: true", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    const fn = vi.fn();
    const off = await onAppResume(fn);
    handler({ isActive: false });
    expect(fn).not.toHaveBeenCalled();
    handler({ isActive: true });
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    expect(remove).toHaveBeenCalled();
});
