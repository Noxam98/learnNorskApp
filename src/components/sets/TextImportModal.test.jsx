// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TextImportModal from "./TextImportModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: { setParseText: vi.fn(), setImportWords: vi.fn() },
}));

const ll = {
    importText: "Из текста", textHint: "Подсказка", textPh: "Вставь текст",
    imgHintPh: "Уточнение", textBusy: "Обрабатываю…", textRun: "Обработать",
    imgReview: "Проверьте", addWord: "Добавить слово", imgAdd: "Добавить {n}",
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("TextImportModal", () => {
    it("сохраняет явный перевод без лишнего поля, показывает итог и закрывается по «Готово»", async () => {
        api.setParseText.mockResolvedValue({
            items: [{ word: "hund", translation: "собака" }],
        });
        api.setImportWords.mockResolvedValue({
            words: [{ pool_id: 7, norwegian: "hund" }],
            summary: {
                requested: 1, added: 1, already_in_set: 0,
                reused_from_pool: 0, created: 1, skipped: 0, failed: 0,
            },
            failed: [],
        });
        const onClose = vi.fn(), onImported = vi.fn();
        render(<TextImportModal open setId={3} lang="ru" ll={ll}
            onClose={onClose} onImported={onImported} />);

        fireEvent.change(screen.getByPlaceholderText("Вставь текст"), {
            target: { value: "hund — собака" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Обработать/ }));
        await screen.findByDisplayValue("hund");
        expect(screen.queryByDisplayValue("собака")).not.toBeInTheDocument();
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Добавить 1/ }));
        await waitFor(() => expect(api.setImportWords).toHaveBeenCalledWith(3, {
            items: [{ word: "hund", translation: "собака" }],
            lang: "ru",
        }));
        expect(await screen.findByText("Импорт завершён")).toBeInTheDocument();
        expect(onImported).toHaveBeenCalledWith(expect.objectContaining({ words: expect.any(Array) }));

        fireEvent.click(screen.getByRole("button", { name: /Готово/ }));
        expect(onClose).toHaveBeenCalled();
    });

    it("возвращается к исходному тексту без потери черновика", async () => {
        api.setParseText.mockResolvedValue({ items: [{ word: "hund", translation: "" }] });
        render(<TextImportModal open setId={3} lang="ru" ll={ll} onClose={() => {}} />);

        const input = screen.getByPlaceholderText("Вставь текст");
        fireEvent.change(input, { target: { value: "hund" } });
        fireEvent.click(screen.getByRole("button", { name: /Обработать/ }));
        await screen.findByDisplayValue("hund");
        fireEvent.click(screen.getByRole("button", { name: /Назад/ }));

        expect(screen.getByPlaceholderText("Вставь текст")).toHaveValue("hund");
    });

    it("оставляет неудачные слова для повторной попытки", async () => {
        api.setParseText.mockResolvedValue({ items: [{ word: "nyord", translation: "" }] });
        api.setImportWords.mockResolvedValue({
            words: [],
            summary: {
                requested: 1, added: 0, already_in_set: 0,
                reused_from_pool: 0, created: 0, skipped: 0, failed: 1,
            },
            failed: [{ word: "nyord", reason: "provider_failed" }],
        });
        render(<TextImportModal open setId={3} lang="ru" ll={ll} onClose={() => {}} />);

        fireEvent.change(screen.getByPlaceholderText("Вставь текст"), { target: { value: "nyord" } });
        fireEvent.click(screen.getByRole("button", { name: /Обработать/ }));
        await screen.findByDisplayValue("nyord");
        fireEvent.click(screen.getByRole("button", { name: /Добавить 1/ }));
        expect(await screen.findByText("Импорт завершён частично")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Повторить неудачные/ }));

        expect(screen.getByDisplayValue("nyord")).toBeInTheDocument();
    });
});
