// @vitest-environment jsdom
// «Поделиться набором»: поиск человека с дебаунсом, отправка предложения, понятные ошибки бэка.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import ShareSetModal from "./ShareSetModal.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: { searchUsers: vi.fn(), setShare: vi.fn(), onTokens: vi.fn() },
}));

const open = (props = {}) => render(
    <ShareSetModal open setId={7} setName="Теория" lang="ru" onClose={vi.fn()} {...props} />);
const type = (v) => fireEvent.change(screen.getByPlaceholderText(/Имя или логин/), { target: { value: v } });

beforeEach(() => {
    api.searchUsers.mockResolvedValue({ users: [{ id: 2, name: "Максим" }] });
    api.setShare.mockResolvedValue({ ok: true, count: 12 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("ShareSetModal", () => {
    it("короткий запрос не ходит в поиск", async () => {
        open();
        type("м");
        expect(await screen.findByText("Введите минимум 2 символа")).toBeInTheDocument();
        expect(api.searchUsers).not.toHaveBeenCalled();
    });

    it("находит человека и отправляет ему набор", async () => {
        open();
        type("макс");
        expect(await screen.findByText("Максим")).toBeInTheDocument();
        await waitFor(() => expect(api.searchUsers).toHaveBeenCalledWith("макс"));
        fireEvent.click(screen.getByRole("button", { name: /Отправить/ }));
        await waitFor(() => expect(api.setShare).toHaveBeenCalledWith(7, 2));
        expect(await screen.findByText("Отправлено")).toBeInTheDocument();
    });

    it("ошибку бэка показывает по-человечески", async () => {
        api.setShare.mockRejectedValue(new Error("too many"));
        open();
        type("макс");
        await screen.findByText("Максим");
        fireEvent.click(screen.getByRole("button", { name: /Отправить/ }));
        expect(await screen.findByText("Слишком много предложений этому человеку")).toBeInTheDocument();
    });

    it("никого не нашли — так и говорим", async () => {
        api.searchUsers.mockResolvedValue({ users: [] });
        open();
        type("ктото");
        expect(await screen.findByText("Никого не нашли")).toBeInTheDocument();
    });
});
