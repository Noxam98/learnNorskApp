// @vitest-environment jsdom
// Вход в импорт из системного «Поделиться» (A4): картинка пришла извне, набор ещё не выбран.
// Проверяем ровно две вещи, ради которых компонент и появился: выбор/создание набора перед OCR
// и то, что выбранный набор + пришедший data-URL доезжают до PhotoImportModal (→ /sets/{id}/ocr).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import SharedImageImport from "./SharedImageImport.jsx";
import api from "../tools/api.js";
import { rotateImage } from "../tools/imageScale.js";

vi.mock("../tools/api.js", () => ({
    default: { setCreate: vi.fn(), setOcr: vi.fn(), setImportWords: vi.fn() },
}));
vi.mock("../tools/imageScale.js", () => ({
    cropImage: vi.fn(),
    downscaleImage: vi.fn(),
    rotateImage: vi.fn(),
}));

const SHOT = "data:image/jpeg;base64,SHOT";
// строки вкладки «Наборы» (то, что SetsTab передаёт как ll); остальное берётся из IMPORT_I18N
const ll = {
    imgSource: "Источник", imgCamera: "Камера", imgGallery: "Галерея", imgTitle: "Фото",
    imgHintPh: "Подсказка", imgRun: "Распознать", imgBusy: "Распознаю…",
    imgEmpty: "Пусто", imgFail: "Ошибка", imgAdd: "Добавить {n}", addWord: "Добавить слово",
    namePh: "Слово", cancel: "Отмена",
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SharedImageImport", () => {
    it("сначала спрашивает набор, а не запускает OCR", () => {
        render(<SharedImageImport images={[SHOT]} sets={[{ id: 7, name: "Дорога" }]} lang="ru" ll={ll}
            onClose={() => {}} />);
        expect(screen.getByText("В какой набор добавить слова?")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Дорога/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Распознать/ })).toBeNull();
        expect(api.setOcr).not.toHaveBeenCalled();
    });

    it("выбранный набор + входящий data-URL уходят в OCR через PhotoImportModal", async () => {
        rotateImage.mockImplementation(async (image) => image);
        api.setOcr.mockResolvedValue({ words: ["bil"] });
        render(<SharedImageImport images={[SHOT]} sets={[{ id: 7, name: "Дорога" }]} lang="ru" ll={ll}
            onClose={() => {}} />);

        fireEvent.click(screen.getByRole("button", { name: /Дорога/ }));

        // выбор источника (камера/галерея) пропущен — страница уже есть, сразу превью
        expect(screen.queryByRole("button", { name: /Камера/ })).toBeNull();
        const preview = await screen.findByRole("button", { name: /Распознать/ });
        expect(document.querySelector("img.ocr-preview").getAttribute("src")).toBe(SHOT);

        fireEvent.click(preview);
        await waitFor(() => expect(api.setOcr).toHaveBeenCalledWith(7, { image: SHOT, hint: "" }));
        await screen.findByDisplayValue("bil");
    });

    it("наборов нет — создаёт новый и идёт в OCR уже под ним", async () => {
        rotateImage.mockImplementation(async (image) => image);
        api.setCreate.mockResolvedValue({ id: 12, name: "Скриншоты" });
        api.setOcr.mockResolvedValue({ words: ["hund"] });
        const onSetCreated = vi.fn();
        render(<SharedImageImport images={[SHOT]} sets={[]} lang="ru" ll={ll}
            onClose={() => {}} onSetCreated={onSetCreated} />);

        fireEvent.change(screen.getByLabelText("Новый набор"), { target: { value: "Скриншоты" } });
        fireEvent.click(screen.getByRole("button", { name: /Создать/ }));

        await waitFor(() => expect(api.setCreate).toHaveBeenCalledWith("Скриншоты"));
        expect(onSetCreated).toHaveBeenCalledWith(12);
        fireEvent.click(await screen.findByRole("button", { name: /Распознать/ }));
        await waitFor(() => expect(api.setOcr).toHaveBeenCalledWith(12, { image: SHOT, hint: "" }));
    });

    it("несколько страниц: в OCR уходят обе картинки выбранного набора", async () => {
        rotateImage.mockImplementation(async (image) => image);
        api.setOcr.mockResolvedValue({ words: ["bil"] });
        render(<SharedImageImport images={[SHOT, "data:image/jpeg;base64,TWO"]} sets={[{ id: 3, name: "Фразы" }]}
            lang="ru" ll={ll} onClose={() => {}} />);

        fireEvent.click(screen.getByRole("button", { name: /Фразы/ }));
        fireEvent.click(await screen.findByRole("button", { name: /Распознать/ }));
        await waitFor(() => expect(api.setOcr).toHaveBeenCalledTimes(2));
        expect(api.setOcr).toHaveBeenNthCalledWith(1, 3, { image: SHOT, hint: "" });
        expect(api.setOcr).toHaveBeenNthCalledWith(2, 3, { image: "data:image/jpeg;base64,TWO", hint: "" });
    });
});
