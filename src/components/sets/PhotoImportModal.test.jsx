// @vitest-environment jsdom
// Сеть под вынос PhotoImportModal из SetsTab: трёхфазный поток фото→OCR→правка→импорт.
// downscaleImage и api (setOcr/setImportWords) замоканы — проверяем, что фазы переключаются
// и наружу уходят верные вызовы (api.setOcr с картинкой, api.setImportWords со списком слов).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import PhotoImportModal from "./PhotoImportModal.jsx";
import api from "../tools/api.js";
import { downscaleImage } from "../tools/imageScale.js";

vi.mock("../tools/api.js", () => ({ default: { setOcr: vi.fn(), setImportWords: vi.fn() } }));
vi.mock("../tools/imageScale.js", () => ({ downscaleImage: vi.fn() }));

const ll = {
    imgSource: "Источник", imgCamera: "Камера", imgGallery: "Галерея", imgTitle: "Фото",
    imgHintPh: "Подсказка", imgRun: "Распознать", imgBusy: "Распознаю…", imgReview: "Проверьте",
    imgEmpty: "Пусто", imgFail: "Ошибка", imgAdd: "Добавить {n}", addWord: "Добавить слово",
    namePh: "Слово", generating: "…",
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
        await waitFor(() => expect(api.setImportWords).toHaveBeenCalledWith(5, { words: ["hund", "katt"], lang: "ru" }));
        expect(onImported).toHaveBeenCalled();
    });
});
