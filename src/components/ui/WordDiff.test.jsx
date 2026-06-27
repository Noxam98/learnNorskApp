// @vitest-environment jsdom
// Сеть под вынос WordDiff: при монтировании грузит api.getWordDiff(word, other), показывает
// разбор; «Исправить» → форма → api.rediff обновляет разбор. Сеть замокана.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import WordDiff from "./WordDiff.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { getWordDiff: vi.fn(), rediff: vi.fn() } }));
const t = { difference: "Разница", descUnavailable: "—", fix: "Исправить", regenerate: "Перегенерировать", cancel: "Отмена", fixHintPlaceholder: "Подсказка" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("WordDiff", () => {
    it("грузит и показывает разбор разницы", async () => {
        api.getWordDiff.mockResolvedValue({ diff: { summary: "Похожи, но не совсем", when_a: "для А", when_b: "для Б", example: "пример" } });
        render(<WordDiff word="hund" other="bikkje" lang="ru" t={t} />);
        await waitFor(() => expect(api.getWordDiff).toHaveBeenCalledWith("hund", "bikkje", "ru"));
        expect(await screen.findByText("Похожи, но не совсем")).toBeInTheDocument();
    });

    it("перегенерирует разбор по подсказке", async () => {
        api.getWordDiff.mockResolvedValue({ diff: { summary: "S1", when_a: "A", when_b: "B" } });
        api.rediff.mockResolvedValue({ diff: { summary: "S2", when_a: "A2", when_b: "B2" } });
        render(<WordDiff word="hund" other="bikkje" lang="ru" t={t} />);
        await screen.findByText("S1");
        fireEvent.click(screen.getByRole("button", { name: /Исправить/ }));
        fireEvent.change(screen.getByPlaceholderText("Подсказка"), { target: { value: "уточни" } });
        fireEvent.click(screen.getByRole("button", { name: /Перегенерировать/ }));
        await waitFor(() => expect(api.rediff).toHaveBeenCalledWith("hund", "bikkje", "ru", "уточни"));
        expect(await screen.findByText("S2")).toBeInTheDocument();
    });
});
