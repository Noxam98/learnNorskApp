// @vitest-environment jsdom
// Сеть под EditWordModal: форма инициализируется из записи (все языки реестра + часть речи),
// в api.editPoolWord уходит ПАТЧ — только изменённые поля (очищенное → []), pool_id и смена части
// речи; при успехе зовётся onSaved с сохранённым и виден итог. Админ правит без подсказки нейросети.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import EditWordModal from "./EditWordModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { editPoolWord: vi.fn() } }));
const t = {
    editWord: "Изменить", cancel: "Отмена", save: "Сохранить", reviewing: "Проверка…",
    norwegianWord: "Норв.", translate: "Перевод", multipleVariantsHint: "через запятую",
    more: "Дополнительно", editHintLabel: "Подсказка", editHintPlaceholder: "…",
    reviewApproved: "Одобрено", reviewRejected: "Отклонено", editSaved: "Сохранено",
    wordExistsError: "Такое слово уже есть", unexpectedError: "Ошибка", partOfSpeech: "Часть речи",
    russian: "Рус", ukrainian: "Укр", english: "Англ", polish: "Пол", lithuanian: "Лит",
};
// pool_id обязателен в правке: без него бэк правит старшую по id запись омонима (порча общей Базы)
const view = {
    no: "hund", pool_id: 42, part_of_speech: "noun",
    translate: { no: ["hund"], ru: ["собака"], en: ["dog"], lv: ["suns"], ar: ["كلب"] },
};
const saved = (over = {}) => ({ approved: true, reason: "", no: "hund", part_of_speech: "noun", translate: view.translate, ...over });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const ruInput = () => screen.getByDisplayValue("собака");

describe("EditWordModal", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(<EditWordModal open={false} view={view} lang="ru" t={t} onClose={() => {}} onSaved={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("шлёт только изменённое поле и pool_id; onSaved получает сохранённое", async () => {
        const tr = { ...view.translate, ru: ["собака", "пёс"] };
        api.editPoolWord.mockResolvedValue(saved({ translate: tr }));
        const onSaved = vi.fn();
        render(<EditWordModal open view={view} lang="ru" t={t} onClose={() => {}} onSaved={onSaved} />);
        fireEvent.change(ruInput(), { target: { value: "собака, пёс" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.editPoolWord).toHaveBeenCalled());
        const [no, translate, lang, , poolId, pos] = api.editPoolWord.mock.calls[0];
        expect(no).toBe("hund");
        expect(lang).toBe("ru");
        expect(translate).toEqual({ ru: ["собака", "пёс"] });   // нетронутые языки не шлём — бэк их не трогает
        expect(poolId).toBe(42);    // правится ИМЕННО показанный омоним
        expect(pos).toBeUndefined();
        expect(onSaved).toHaveBeenCalledWith({ no: "hund", translate: tr, part_of_speech: "noun" });
        expect(await screen.findByText(/Одобрено/)).toBeInTheDocument();
    });

    it("админ: без подсказки нейросети, итог «Сохранено»", async () => {
        api.editPoolWord.mockResolvedValue(saved());
        render(<EditWordModal open isAdmin view={view} lang="ru" t={t} onClose={() => {}} onSaved={() => {}} />);
        expect(screen.queryByText("Подсказка")).toBeNull();
        fireEvent.change(ruInput(), { target: { value: "пёс" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.editPoolWord).toHaveBeenCalled());
        expect(api.editPoolWord.mock.calls[0][3]).toBe("");
        expect(await screen.findByText(/Сохранено/)).toBeInTheDocument();
    });

    it("все языки реестра (lv/ar) правятся; очищенное поле уходит пустым списком", async () => {
        api.editPoolWord.mockResolvedValue(saved());
        render(<EditWordModal open isAdmin view={view} lang="ru" t={t} onClose={() => {}} onSaved={() => {}} />);
        fireEvent.click(screen.getByText("Дополнительно"));
        expect(screen.getByDisplayValue("كلب")).toBeInTheDocument();
        fireEvent.change(screen.getByDisplayValue("suns"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.editPoolWord).toHaveBeenCalled());
        expect(api.editPoolWord.mock.calls[0][1]).toEqual({ lv: [] });
    });

    it("язык интерфейса lv: главное поле — латышский перевод записи", () => {
        render(<EditWordModal open view={view} lang="lv" t={t} onClose={() => {}} onSaved={() => {}} />);
        expect(screen.getByDisplayValue("suns")).toBeInTheDocument();
    });

    it("смена части речи уходит отдельным полем", async () => {
        api.editPoolWord.mockResolvedValue(saved({ part_of_speech: "verb" }));
        render(<EditWordModal open isAdmin view={view} lang="ru" t={t} onClose={() => {}} onSaved={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: /Существительное/ }));
        fireEvent.click(screen.getByRole("option", { name: /Глагол/ }));
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.editPoolWord).toHaveBeenCalled());
        const [, translate, , , , pos] = api.editPoolWord.mock.calls[0];
        expect(translate).toEqual({});
        expect(pos).toBe("verb");
    });

    it("ничего не изменили — окно закрывается без запроса", () => {
        const onClose = vi.fn();
        render(<EditWordModal open isAdmin view={view} lang="ru" t={t} onClose={onClose} onSaved={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        expect(api.editPoolWord).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("коллизия с другой записью (409) — понятная причина, не «словарь уже есть»", async () => {
        api.editPoolWord.mockRejectedValue(new Error("Word already exists"));
        const onSaved = vi.fn();
        render(<EditWordModal open isAdmin view={view} lang="ru" t={t} onClose={() => {}} onSaved={onSaved} />);
        fireEvent.change(ruInput(), { target: { value: "пёс" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        expect(await screen.findByText(/Такое слово уже есть/)).toBeInTheDocument();
        expect(onSaved).not.toHaveBeenCalled();
    });
});
