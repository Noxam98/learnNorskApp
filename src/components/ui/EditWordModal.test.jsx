// @vitest-environment jsdom
// Сеть под вынос EditWordModal: форма инициализируется из переводов слова, сохранение шлёт
// api.editPoolWord(no, translate, lang, hint); при одобрении зовётся onSaved и виден вердикт.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import EditWordModal from "./EditWordModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { editPoolWord: vi.fn() } }));
const t = {
    editWord: "Изменить", cancel: "Отмена", save: "Сохранить", reviewing: "Проверка…",
    norwegianWord: "Норв.", translate: "Перевод", multipleVariantsHint: "через запятую",
    more: "Дополнительно", editHintLabel: "Подсказка", editHintPlaceholder: "…",
    reviewApproved: "Одобрено", reviewRejected: "Отклонено",
    russian: "Рус", ukrainian: "Укр", english: "Англ", polish: "Пол", lithuanian: "Лит",
};
// pool_id обязателен в правке: без него бэк правит старшую по id запись омонима (порча общей Базы)
const view = { no: "hund", pool_id: 42, translate: { no: ["hund"], ru: ["собака"] } };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("EditWordModal", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(<EditWordModal open={false} view={view} lang="ru" t={t} onClose={() => {}} onSaved={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("инициализирует поля из переводов и сохраняет одобренную правку", async () => {
        api.editPoolWord.mockResolvedValue({ approved: true, no: "hund", translate: { no: ["hund"], ru: ["собака", "пёс"] } });
        const onSaved = vi.fn();
        render(<EditWordModal open view={view} lang="ru" t={t} onClose={() => {}} onSaved={onSaved} />);
        expect(screen.getByDisplayValue("собака")).toBeInTheDocument();   // поле ru заполнено из view
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.editPoolWord).toHaveBeenCalled());
        const [no, translate, lang, , poolId] = api.editPoolWord.mock.calls[0];
        expect(no).toBe("hund");
        expect(lang).toBe("ru");
        expect(translate.ru).toEqual(["собака"]);
        expect(poolId).toBe(42);    // правится ИМЕННО показанный омоним
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ no: "hund" }));
        expect(await screen.findByText(/Одобрено/)).toBeInTheDocument();
    });
});
