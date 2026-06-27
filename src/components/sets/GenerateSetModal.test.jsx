// @vitest-environment jsdom
// Сеть под вынос GenerateSetModal из SetsTab: модалка собирает форму (тема/уровни/кол-во)
// и зовёт api.setGenerate с верным payload, затем onGenerated + onClose. LLM/сеть замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import GenerateSetModal from "./GenerateSetModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { setGenerate: vi.fn() } }));

const ll = {
    genTitle: "Генерация", genTopicPh: "Тема", genTopicTpl: "Тема: «{n}»", levelAny: "Любой",
    count: "Количество", generate: "Сгенерировать", generating: "Генерирую…",
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("GenerateSetModal", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(
            <GenerateSetModal open={false} setId={1} lang="ru" ll={ll} onClose={() => {}} onGenerated={() => {}} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("генерирует с выбранным уровнем; пустая тема → имя набора", async () => {
        api.setGenerate.mockResolvedValue({});
        const onGenerated = vi.fn(), onClose = vi.fn();
        render(
            <GenerateSetModal open setId={7} lang="ru" ll={ll} defaultTopic="Еда"
                onClose={onClose} onGenerated={onGenerated} />,
        );
        fireEvent.click(screen.getByRole("button", { name: "A1" }));        // выбрать уровень A1
        fireEvent.click(screen.getByRole("button", { name: /Сгенерировать/ }));
        await waitFor(() => expect(api.setGenerate).toHaveBeenCalledTimes(1));
        const [setId, payload] = api.setGenerate.mock.calls[0];
        expect(setId).toBe(7);
        expect(payload).toMatchObject({ level: "A1", topic: "Еда", count: 10, lang: "ru" });
        expect(onGenerated).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
