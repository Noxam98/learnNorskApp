// @vitest-environment jsdom
// Smoke-сеть под вынос RoomForm из OnlinePage: модалка рендерится, закрывается по open=false,
// и кнопка подтверждения отдаёт введённое имя + дефолтные настройки наружу (onConfirm).
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
import { RoomForm } from "./RoomForm.jsx";

const apiMock = vi.hoisted(() => ({
    setsList: vi.fn(() => Promise.resolve([
        { id: 12, name: "Работа", count: 14, studying: false },
        { id: 13, name: "Короткий", count: 2, studying: false },
        { id: 14, name: "Большой набор", count: 50, studying: false },
    ])),
    getPool: vi.fn(() => Promise.resolve({
        total: 3,
        words: [
            { pool_id: 101, word: "arbeid", translate: { ru: ["работа"] }, part_of_speech: "noun", level: "A1" },
            { pool_id: 102, word: "møte", translate: { ru: ["встреча"] }, part_of_speech: "noun", level: "A2" },
            { pool_id: 103, word: "avtale", translate: { ru: ["договорённость"] }, part_of_speech: "noun", level: "A2" },
        ],
    })),
    setWords: vi.fn(() => Promise.resolve({
        words: [
            { pool_id: 201, norwegian: "reise", translate: { ru: ["путешествовать"] }, part_of_speech: "verb", level: "A1" },
            { pool_id: 202, norwegian: "fly", translate: { ru: ["самолёт"] }, part_of_speech: "noun", level: "A1" },
            { pool_id: 203, norwegian: "billett", translate: { ru: ["билет"] }, part_of_speech: "noun", level: "A2" },
        ],
    })),
}));
vi.mock("../tools/api.js", () => ({ default: apiMock }));

afterEach(cleanup);

// Минимальные словари: RoomForm всюду подставляет дефолты через `|| "…"`, тема — t.topics.
const t = {
    cancel: "Отмена", topics: {}, description: "Описание",
    tts: "Озвучить", ttsPreparing: "Готовим", addToDict: "Добавить", removeFromDict: "Убрать",
};
const to = {};

function renderForm(props = {}) {
    return render(
        <RoomForm open onClose={() => {}} theme="dark" t={t} to={to}
            title="Создать комнату" confirmLabel="Создать" onConfirm={() => {}} {...props} />,
    );
}

describe("RoomForm", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(
            <RoomForm open={false} onClose={() => {}} theme="dark" t={t} to={to} onConfirm={() => {}} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("рендерит диалог с заголовком и кнопкой подтверждения", () => {
        renderForm();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Создать комнату")).toBeInTheDocument();
        expect(screen.getByText("Создать")).toBeEnabled();   // source=pool по умолчанию → форма валидна
    });

    it("onConfirm получает введённое имя и дефолтные настройки (game=quiz)", () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm, initialName: "Моя комната" });
        fireEvent.click(screen.getByText("Создать"));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        const [name, settings] = onConfirm.mock.calls[0];
        expect(name).toBe("Моя комната");
        expect(settings.game).toBe("quiz");
        expect(settings.count).toBe(7);
    });

    it("крестик/Отмена вызывают onClose", () => {
        const onClose = vi.fn();
        renderForm({ onClose });
        fireEvent.click(screen.getByText("Отмена"));
        expect(onClose).toHaveBeenCalled();
    });

    it("выбирает личный набор и передаёт его id/название", async () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm });
        fireEvent.click(screen.getByRole("radio", { name: /Мой набор/ }));
        await screen.findByText("Выберите набор");
        fireEvent.click(screen.getByText("Выберите набор"));
        fireEvent.click(await screen.findByRole("option", { name: /Работа/ }));
        fireEvent.click(screen.getByText("Создать"));

        const settings = onConfirm.mock.calls[0][1];
        expect(settings.source).toBe("dict");
        expect(settings.dictId).toBe(12);
        expect(settings.dictName).toBe("Работа");
    });

    it("ручной выбор требует 3 слова и отдаёт точные pool_id", async () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm });
        fireEvent.click(screen.getByRole("radio", { name: /Выбрать слова/ }));
        expect(screen.getByText("Создать")).toBeDisabled();

        fireEvent.click(screen.getAllByText("Выбрать слова").at(-1));
        await waitFor(() => expect(screen.getAllByLabelText("Выбрать слово")).toHaveLength(3));
        for (const button of screen.getAllByLabelText("Выбрать слово")) fireEvent.click(button);
        fireEvent.click(screen.getByText("Готово"));
        await waitFor(() => expect(screen.getByText("Создать")).toBeEnabled());
        fireEvent.click(screen.getByText("Создать"));

        const settings = onConfirm.mock.calls[0][1];
        expect(settings.source).toBe("selected");
        expect(settings.poolIds).toEqual([101, 102, 103]);
        expect(settings.count).toBe(3);
    });

    it("большой личный набор позволяет выбрать точный состав", async () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm });
        fireEvent.click(screen.getByRole("radio", { name: /Мой набор/ }));
        await screen.findByText("Выберите набор");
        fireEvent.click(screen.getByText("Выберите набор"));
        fireEvent.click(await screen.findByRole("option", { name: /Большой набор/ }));
        fireEvent.click(screen.getByRole("radio", { name: "Выбрать" }));
        fireEvent.click(screen.getByRole("button", { name: "Выбрать слова" }));

        await waitFor(() => expect(screen.getAllByLabelText("Выбрать слово")).toHaveLength(3));
        for (const button of screen.getAllByLabelText("Выбрать слово")) fireEvent.click(button);
        await waitFor(() => expect(screen.getByText("Выбрано: 3 из 40")).toBeInTheDocument());
        const done = await screen.findByRole("button", { name: "Готово" });
        await waitFor(() => expect(done).toBeEnabled());
        fireEvent.click(done);
        await screen.findByText("Выбрано: 3 из 40");
        expect(screen.getByRole("radio", { name: "Выбрать" })).toHaveAttribute("aria-checked", "true");
        await waitFor(() => expect(screen.getByText("Создать")).toBeEnabled());
        fireEvent.click(screen.getByText("Создать"));

        const settings = onConfirm.mock.calls[0][1];
        expect(settings.source).toBe("dict");
        expect(settings.dictMode).toBe("selected");
        expect(settings.dictPoolIds).toEqual([201, 202, 203]);
        expect(settings.count).toBe(3);
    });

    it("из большого личного набора можно взять случайные N слов до 40", async () => {
        const onConfirm = vi.fn();
        renderForm({ onConfirm });
        fireEvent.click(screen.getByRole("radio", { name: /Мой набор/ }));
        await screen.findByText("Выберите набор");
        fireEvent.click(screen.getByText("Выберите набор"));
        fireEvent.click(await screen.findByRole("option", { name: /Большой набор/ }));

        expect(screen.getByRole("radio", { name: "Случайные" })).toHaveAttribute("aria-checked", "true");
        const wordsSlider = screen.getAllByRole("slider")[0];
        expect(wordsSlider).toHaveAttribute("max", "40");
        fireEvent.change(wordsSlider, { target: { value: "37" } });
        fireEvent.click(screen.getByText("Создать"));

        const settings = onConfirm.mock.calls[0][1];
        expect(settings.dictMode).toBe("random");
        expect(settings.count).toBe(37);
    });
});
