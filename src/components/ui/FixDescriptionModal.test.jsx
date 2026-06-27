// @vitest-environment jsdom
// Сеть под вынос FixDescriptionModal: подсказка → api.redescribe(no, hint), новое описание
// уходит наружу onFixed(no, desc) + onClose. LLM/сеть замоканы.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import FixDescriptionModal from "./FixDescriptionModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { redescribe: vi.fn() } }));
const t = { fixDesc: "Исправить", cancel: "Отмена", asking: "…", regenerate: "Перегенерировать", fixHintPlaceholder: "Подсказка" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("FixDescriptionModal", () => {
    it("при open=false ничего не рендерит", () => {
        const { container } = render(<FixDescriptionModal open={false} no="hund" lang="ru" t={t} onClose={() => {}} onFixed={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("перегенерирует описание и отдаёт новое наружу", async () => {
        api.redescribe.mockResolvedValue({ description: { ru: "Новое описание" } });
        const onFixed = vi.fn(), onClose = vi.fn();
        render(<FixDescriptionModal open no="hund" lang="ru" t={t} onClose={onClose} onFixed={onFixed} />);
        fireEvent.change(screen.getByPlaceholderText("Подсказка"), { target: { value: "уточнение" } });
        fireEvent.click(screen.getByRole("button", { name: /Перегенерировать/ }));
        await waitFor(() => expect(api.redescribe).toHaveBeenCalledWith("hund", "уточнение"));
        expect(onFixed).toHaveBeenCalledWith("hund", "Новое описание");
        expect(onClose).toHaveBeenCalled();
    });
});
