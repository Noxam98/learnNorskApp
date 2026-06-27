// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import NameEditModal from "./NameEditModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { setName: vi.fn() } }));
const t = { displayName: "Имя", cancel: "Отмена", save: "Сохранить", displayNamePlaceholder: "Имя" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("NameEditModal", () => {
    it("инициализирует поле из initial и сохраняет имя", async () => {
        api.setName.mockResolvedValue({});
        const onSaved = vi.fn(), onClose = vi.fn();
        render(<NameEditModal open initial="Старое" t={t} onClose={onClose} onSaved={onSaved} />);
        const input = screen.getByDisplayValue("Старое");
        fireEvent.change(input, { target: { value: "Новое" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.setName).toHaveBeenCalledWith("Новое"));
        expect(onSaved).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
