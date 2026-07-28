// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameKeyboard } from "./GameKeyboard.jsx";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("GameKeyboard", () => {
    it("не отменяет touchstart кнопки «Не знаю» и вызывает её действие", () => {
        const onDunno = vi.fn();
        render(<GameKeyboard lang="no" showDunno dunnoLabel="Не знаю" onDunno={onDunno} />);

        const button = screen.getByRole("button", { name: "Не знаю" });
        expect(fireEvent.touchStart(button)).toBe(true);
        fireEvent.click(button);

        expect(onDunno).toHaveBeenCalledOnce();
    });

    it("по-прежнему отменяет нативный touchstart буквенных клавиш", () => {
        render(<GameKeyboard lang="no" />);

        expect(fireEvent.touchStart(screen.getByRole("button", { name: "q" }))).toBe(false);
    });
});
