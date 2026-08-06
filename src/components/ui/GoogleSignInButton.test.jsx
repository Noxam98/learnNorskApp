// @vitest-environment jsdom
// A2.2: в вебе кнопку по-прежнему рисует Google Identity Services, на нативе — своя кнопка,
// дёргающая системный плагин (веб-флоу Google в WebView запрещён).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoogleSignInButton from "./GoogleSignInButton.jsx";
import { googleNativeAvailable, signInWithGoogleNative } from "../../native/googleAuth.js";

vi.mock("../../native/googleAuth.js", () => ({
    googleNativeAvailable: vi.fn(() => false),
    signInWithGoogleNative: vi.fn(async () => "id.token.jwt"),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "296014238677-test.apps.googleusercontent.com");
    googleNativeAvailable.mockReturnValue(false);
    signInWithGoogleNative.mockResolvedValue("id.token.jwt");
});

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it("без VITE_GOOGLE_CLIENT_ID кнопки нет вовсе", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { container } = render(<GoogleSignInButton onCredential={() => {}} />);
    expect(container.innerHTML).toBe("");
});

describe("веб", () => {
    it("не рисует свою кнопку — ждёт GIS", () => {
        render(<GoogleSignInButton onCredential={() => {}} text="signin_with" />);
        expect(screen.queryByRole("button")).toBeNull();
        expect(signInWithGoogleNative).not.toHaveBeenCalled();
    });
});

describe("натив", () => {
    beforeEach(() => { googleNativeAvailable.mockReturnValue(true); });

    it("тап по кнопке отдаёт id_token наружу", async () => {
        const onCredential = vi.fn();
        render(<GoogleSignInButton onCredential={onCredential} text="signin_with" />);
        await userEvent.click(screen.getByRole("button"));
        await waitFor(() => expect(onCredential).toHaveBeenCalledWith("id.token.jwt"));
    });

    it("сбой плагина (нет Android-клиента в Cloud Console) показывает ошибку, а не тишину", async () => {
        signInWithGoogleNative.mockRejectedValue(new Error("10: developer error"));
        const onCredential = vi.fn();
        render(<GoogleSignInButton onCredential={onCredential} text="signin_with" />);
        await userEvent.click(screen.getByRole("button"));
        await waitFor(() => expect(document.querySelector(".alert")).not.toBeNull());
        expect(onCredential).not.toHaveBeenCalled();
    });

    it("отмена пользователем ошибкой не считается", async () => {
        signInWithGoogleNative.mockRejectedValue(new Error("The user canceled the sign-in flow"));
        render(<GoogleSignInButton onCredential={vi.fn()} text="signin_with" />);
        await userEvent.click(screen.getByRole("button"));
        await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
        expect(document.querySelector(".alert")).toBeNull();
    });
});
