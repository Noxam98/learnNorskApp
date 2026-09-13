// @vitest-environment jsdom
// Центр уведомлений: бейдж непрочитанных, открытие панели гасит бейдж (но не решение),
// «Принять» создаёт копию набора (ответ бэка → тост), «Отклонить» закрывает предложение.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import NotificationsBell, { NotificationsPanel, useNotificationsSync } from "./NotificationsBell.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: {
        getNotifications: vi.fn(),
        readNotifications: vi.fn(() => Promise.resolve({ ok: true })),
        acceptNotification: vi.fn(() => Promise.resolve({ ok: true, state: "accepted", set_id: 9, name: "Теория" })),
        declineNotification: vi.fn(() => Promise.resolve({ ok: true, state: "declined" })),
        onTokens: vi.fn(),
    },
}));

const OFFER = {
    id: 5, type: "set_share", state: "new", read: false, created_at: "2026-09-13T08:00:00",
    set_name: "Теория", count: 12, from_id: 2, from_name: "Максим",
};

beforeEach(() => {
    useSystemStore.setState({ currentLanguage: "ru" });   // проверяем русские строки — фиксируем язык
    useAuthStore.setState({ user: { username: "t" } });
    useNotifyStore.setState({ items: [], unread: 0, loading: false, loadedAt: 0, panelOpen: false, busyId: null });
    api.getNotifications.mockResolvedValue({ items: [OFFER], unread: 1 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

// Точек входа две (шапка и нижняя панель), панель рендерится отдельно — собираем как в приложении.
function Harness() {
    useNotificationsSync();
    return (<><NotificationsBell /><NotificationsPanel /></>);
}

const openPanel = async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());   // бейдж
    fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
    return screen.findByText(/Максим предлагает набор/);
};

describe("NotificationsBell", () => {
    it("показывает бейдж непрочитанных и предложение набора", async () => {
        await openPanel();
        expect(screen.getByText(/«Теория» · 12 слов/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Принять/ })).toBeInTheDocument();
    });

    it("открытие панели гасит бейдж, но кнопки решения остаются", async () => {
        await openPanel();
        await waitFor(() => expect(api.readNotifications).toHaveBeenCalled());
        expect(screen.queryByText("1")).toBeNull();                      // бейдж ушёл
        expect(screen.getByRole("button", { name: /Принять/ })).toBeInTheDocument();
    });

    it("«Принять» зовёт бэк и показывает решение", async () => {
        await openPanel();
        fireEvent.click(screen.getByRole("button", { name: /Принять/ }));
        await waitFor(() => expect(api.acceptNotification).toHaveBeenCalledWith(5));
        expect(await screen.findByText("Принято")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Отклонить/ })).toBeNull();
    });

    it("«Отклонить» закрывает предложение без набора", async () => {
        await openPanel();
        fireEvent.click(screen.getByRole("button", { name: /Отклонить/ }));
        await waitFor(() => expect(api.declineNotification).toHaveBeenCalledWith(5));
        expect(await screen.findByText("Отклонено")).toBeInTheDocument();
        expect(api.acceptNotification).not.toHaveBeenCalled();
    });

    it("без пользователя колокольчика нет (на экране логина)", () => {
        useAuthStore.setState({ user: null });
        const { container } = render(<Harness />);
        expect(container).toBeEmptyDOMElement();
        expect(api.getNotifications).not.toHaveBeenCalled();
    });
});
