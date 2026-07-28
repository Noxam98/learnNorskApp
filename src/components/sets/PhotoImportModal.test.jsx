// @vitest-environment jsdom
// Сеть под вынос PhotoImportModal из SetsTab: трёхфазный поток фото→OCR→правка→импорт.
// downscaleImage и api (setOcr/setImportWords) замоканы — проверяем, что фазы переключаются
// и наружу уходят верные вызовы (api.setOcr с картинкой, api.setImportWords со списком слов).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import PhotoImportModal from "./PhotoImportModal.jsx";
import api from "../tools/api.js";
import { cropImage, downscaleImage, rotateImage } from "../tools/imageScale.js";

vi.mock("../tools/api.js", () => ({ default: { setOcr: vi.fn(), setImportWords: vi.fn() } }));
vi.mock("../tools/imageScale.js", () => ({
    cropImage: vi.fn(),
    downscaleImage: vi.fn(),
    rotateImage: vi.fn(),
}));

const ll = {
    imgSource: "Источник", imgCamera: "Камера", imgGallery: "Галерея", imgTitle: "Фото",
    imgHintPh: "Подсказка", imgRun: "Распознать", imgBusy: "Распознаю…", imgReview: "Проверьте",
    imgEmpty: "Пусто", imgFail: "Ошибка", imgAdd: "Добавить {n}", addWord: "Добавить слово",
    namePh: "Слово", generating: "…", cancel: "Отмена",
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("PhotoImportModal", () => {
    it("open=true → показывает выбор источника (камера/галерея)", () => {
        render(<PhotoImportModal open setId={1} lang="ru" ll={ll} onClose={() => {}} onImported={() => {}} />);
        expect(screen.getByRole("button", { name: /Камера/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Галерея/ })).toBeInTheDocument();
    });

    it("полный поток: файл → OCR → правка списка → импорт", async () => {
        downscaleImage.mockResolvedValue("data:image/jpeg;base64,AAA");
        rotateImage.mockImplementation(async (image) => image);
        api.setOcr.mockResolvedValue({ words: ["hund", "katt"] });
        api.setImportWords.mockResolvedValue({});
        const onImported = vi.fn(), onClose = vi.fn();
        const { container } = render(
            <PhotoImportModal open setId={5} lang="ru" ll={ll} onClose={onClose} onImported={onImported} />,
        );

        // эмулируем выбор файла на скрытом input камеры (capture) → downscale → фаза OCR
        const camInput = container.querySelector('input[type="file"][capture]');
        const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
        fireEvent.change(camInput, { target: { files: [file] } });

        const runBtn = await screen.findByRole("button", { name: /Распознать/ });
        fireEvent.click(runBtn);
        await waitFor(() => expect(api.setOcr).toHaveBeenCalledWith(5, expect.objectContaining({ image: "data:image/jpeg;base64,AAA" })));

        // фаза правки: оба распознанных слова в полях + кнопка «Добавить 2»
        await screen.findByDisplayValue("hund");
        expect(screen.getByDisplayValue("katt")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Добавить 2/ }));
        await waitFor(() => expect(api.setImportWords).toHaveBeenCalledWith(5, {
            items: [
                { word: "hund", translation: "" },
                { word: "katt", translation: "" },
            ],
            lang: "ru",
        }));
        expect(onImported).toHaveBeenCalled();
    });

    it("несколько страниц: навигация, поворот и последовательный OCR без дублей", async () => {
        downscaleImage
            .mockResolvedValueOnce("data:image/jpeg;base64,ONE")
            .mockResolvedValueOnce("data:image/jpeg;base64,TWO");
        rotateImage.mockImplementation(async (image) => image);
        api.setOcr
            .mockResolvedValueOnce({ words: ["hund", "katt"] })
            .mockResolvedValueOnce({ words: ["katt", "fisk"] });
        const { container } = render(
            <PhotoImportModal open setId={5} lang="ru" ll={ll} onClose={() => {}} onImported={() => {}} />,
        );
        const gallery = container.querySelector('input[type="file"]:not([capture])');
        fireEvent.change(gallery, { target: { files: [
            new File(["1"], "one.jpg", { type: "image/jpeg" }),
            new File(["2"], "two.jpg", { type: "image/jpeg" }),
        ] } });

        await screen.findByText("Страница 1 из 2");
        fireEvent.click(screen.getByRole("button", { name: "Повернуть фото" }));
        fireEvent.click(screen.getByRole("button", { name: /Распознать/ }));

        await screen.findByDisplayValue("hund");
        expect(screen.getByDisplayValue("katt")).toBeInTheDocument();
        expect(screen.getByDisplayValue("fisk")).toBeInTheDocument();
        expect(api.setOcr).toHaveBeenCalledTimes(2);
        expect(rotateImage).toHaveBeenNthCalledWith(1, "data:image/jpeg;base64,ONE", 1);
        expect(rotateImage).toHaveBeenNthCalledWith(2, "data:image/jpeg;base64,TWO", 0);
    });

    it("обрезает текущую страницу и отправляет в OCR обновлённое изображение", async () => {
        downscaleImage.mockResolvedValue("data:image/jpeg;base64,SOURCE");
        rotateImage.mockImplementation(async (image) => image);
        cropImage.mockResolvedValue("data:image/jpeg;base64,CROPPED");
        api.setOcr.mockResolvedValue({ words: ["hund"] });
        const { container } = render(
            <PhotoImportModal open setId={5} lang="ru" ll={ll} onClose={() => {}} onImported={() => {}} />,
        );
        const gallery = container.querySelector('input[type="file"]:not([capture])');
        fireEvent.change(gallery, {
            target: { files: [new File(["1"], "one.jpg", { type: "image/jpeg" })] },
        });

        await screen.findByRole("button", { name: "Обрезать фото" });
        fireEvent.click(screen.getByRole("button", { name: "Обрезать фото" }));
        fireEvent.click(await screen.findByRole("button", { name: "Обрезать" }));

        await waitFor(() => expect(cropImage).toHaveBeenCalledWith(
            "data:image/jpeg;base64,SOURCE",
            { x: 0, y: 0, w: 1, h: 1 },
        ));
        fireEvent.click(await screen.findByRole("button", { name: /Распознать/ }));
        await waitFor(() => expect(api.setOcr).toHaveBeenCalledWith(5, expect.objectContaining({
            image: "data:image/jpeg;base64,CROPPED",
        })));
    });
});
