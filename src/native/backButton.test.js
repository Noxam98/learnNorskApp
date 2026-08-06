import { describe, it, expect } from "vitest";
import { pathFromHash, decideBack } from "./backButton.js";

describe("pathFromHash", () => {
    it("вытаскивает путь из хеша", () => {
        expect(pathFromHash("#/learning")).toBe("/learning");
        expect(pathFromHash("#/pool?q=hus")).toBe("/pool");
        expect(pathFromHash("")).toBe("/");
        expect(pathFromHash("#")).toBe("/");
        expect(pathFromHash("#learning")).toBe("/learning");
    });
});

describe("decideBack", () => {
    it("с корневых экранов выходит из приложения", () => {
        expect(decideBack("/", true)).toBe("exit");
        expect(decideBack("/learning", true)).toBe("exit");
        expect(decideBack("/authorization", false)).toBe("exit");
    });
    it("с внутреннего экрана — назад по истории", () => {
        expect(decideBack("/pool", true)).toBe("back");
        expect(decideBack("/mypage", true)).toBe("back");
    });
    it("без истории — на домашний экран, а не выход", () => {
        expect(decideBack("/pool", false)).toBe("home");
    });
});
