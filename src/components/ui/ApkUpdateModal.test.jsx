// @vitest-environment jsdom
// Модалка самообновления APK: появляется только при доступной версии, ведёт по фазам,
// «Позже» прячет предложение.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../../native/apkUpdate.js", () => ({
    installApk: vi.fn(), openInstallSettings: vi.fn(() => Promise.resolve()),
    dismissApk: vi.fn(() => { mod.useAppUpdateStore.getState().dismissApk(); }),
}));
const mod = await import("../../store/appUpdateStore.jsx");
const { useAppUpdateStore } = mod;
const { installApk, openInstallSettings, dismissApk } = await import("../../native/apkUpdate.js");
const { default: ApkUpdateModal } = await import("./ApkUpdateModal.jsx");
const { useSystemStore } = await import("../../store/systemStore.jsx");

const M = { versionCode: 12, versionName: "1.11", apk: "https://x/app.apk" };

beforeEach(() => { useSystemStore.setState({ currentLanguage: "ru" }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); useAppUpdateStore.setState({ apk: null, apkPhase: "idle", apkProgress: 0 }); });

describe("ApkUpdateModal", () => {
    it("нет новой версии — ничего не рисует", () => {
        const { container } = render(<ApkUpdateModal />);
        expect(container).toBeEmptyDOMElement();
    });

    it("предлагает версию и запускает установку", () => {
        useAppUpdateStore.setState({ apk: M, apkPhase: "idle" });
        render(<ApkUpdateModal />);
        expect(screen.getByText(/Доступна версия 1\.11/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Обновить/ }));
        expect(installApk).toHaveBeenCalledWith(M);
    });

    it("нет разрешения — объясняет и ведёт в настройки", () => {
        useAppUpdateStore.setState({ apk: M, apkPhase: "permission" });
        render(<ApkUpdateModal />);
        expect(screen.getByText(/Разрешить из этого источника/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Открыть настройки/ }));
        expect(openInstallSettings).toHaveBeenCalled();
    });

    it("во время скачивания — прогресс, «Позже» скрыто", () => {
        useAppUpdateStore.setState({ apk: M, apkPhase: "downloading", apkProgress: 37 });
        render(<ApkUpdateModal />);
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "37");
        expect(screen.getByText(/Скачиваю… 37%/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Позже" })).toBeNull();
    });

    it("«Позже» прячет предложение этой версии", () => {
        useAppUpdateStore.setState({ apk: M, apkPhase: "idle" });
        render(<ApkUpdateModal />);
        fireEvent.click(screen.getByRole("button", { name: "Позже" }));
        expect(dismissApk).toHaveBeenCalledWith(12);
    });
});
