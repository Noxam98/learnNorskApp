// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import PasswordModal from "./PasswordModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({ default: { setPassword: vi.fn() } }));
const t = {
    changePassword: "Сменить", setPassword: "Задать", cancel: "Отмена", save: "Сохранить",
    newPasswordPlaceholder: "Пароль", passwordLengthError: "Минимум 6", unexpectedError: "Ошибка",
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("PasswordModal", () => {
    it("короткий пароль → ошибка, api не вызывается", async () => {
        render(<PasswordModal open hasPassword t={t} onClose={() => {}} onSaved={() => {}} />);
        fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "123" } });
        // кнопка «Сохранить» disabled при <6, но прямой вызов save через Enter покажет ошибку
        fireEvent.keyDown(screen.getByPlaceholderText("Пароль"), { key: "Enter" });
        expect(await screen.findByText("Минимум 6")).toBeInTheDocument();
        expect(api.setPassword).not.toHaveBeenCalled();
    });

    it("валидный пароль сохраняется", async () => {
        api.setPassword.mockResolvedValue({});
        const onSaved = vi.fn(), onClose = vi.fn();
        render(<PasswordModal open hasPassword t={t} onClose={onClose} onSaved={onSaved} />);
        fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "secret123" } });
        fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
        await waitFor(() => expect(api.setPassword).toHaveBeenCalledWith("secret123"));
        expect(onSaved).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
