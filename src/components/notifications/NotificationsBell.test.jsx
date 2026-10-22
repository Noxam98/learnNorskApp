// @vitest-environment jsdom
// Центр уведомлений: бейдж непрочитанных, открытие панели гасит бейдж (но не решение),
// «Принять» создаёт копию набора (ответ бэка → тост), «Отклонить» закрывает предложение.
// Социальные типы: заявка в друзья (принять → дружба), приглашение в игру («Войти» ведёт в
// /online?join=…; закрытая комната — без кнопок), вкладка «Друзья».
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import NotificationsBell, { NotificationsPanel, useNotificationsSync } from "./NotificationsBell.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: {
        getNotifications: vi.fn(),
        readNotifications: vi.fn(() => Promise.resolve({ ok: true })),
        acceptNotification: vi.fn(() => Promise.resolve({ ok: true, state: "accepted", set_id: 9, name: "Теория" })),
        declineNotification: vi.fn(() => Promise.resolve({ ok: true, state: "declined" })),
        friendsList: vi.fn(() => Promise.resolve({ friends: [], outgoing: [] })),
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
    useNotifyStore.setState({ items: [], unread: 0, loading: false, loadedAt: 0, panelOpen: false, panelTab: "feed", busyId: null });
    api.getNotifications.mockResolvedValue({ items: [OFFER], unread: 1 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Where() {
    const loc = useLocation();
    return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

// Точек входа две (шапка и нижняя панель), панель рендерится отдельно — собираем как в приложении.
// Роутер нужен панели: «Войти» по приглашению ведёт на /online?join=…
function Harness() {
    useNotificationsSync();
    return (
        <MemoryRouter initialEntries={["/learning"]}>
            <NotificationsBell /><NotificationsPanel />
            <Routes><Route path="*" element={<Where />} /></Routes>
        </MemoryRouter>
    );
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
        render(<Harness />);
        expect(screen.queryByRole("button", { name: /Уведомления/ })).toBeNull();
        expect(api.getNotifications).not.toHaveBeenCalled();
    });
});

describe("NotificationsBell — социальные типы", () => {
    const REQ = { id: 6, type: "friend_request", state: "new", read: false, from_id: 3, from_name: "Аня" };
    const INVITE = { id: 7, type: "room_invite", state: "new", read: false, from_id: 3, from_name: "Аня",
        room_id: "abc234", room_name: "Вечерняя", live: true };

    const openWith = async (items, text) => {
        api.getNotifications.mockResolvedValue({ items, unread: items.length });
        render(<Harness />);
        await waitFor(() => expect(screen.getByText(String(items.length))).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
        return screen.findByText(text);
    };

    it("заявку в друзья можно принять — списки друзей перечитываются", async () => {
        api.acceptNotification.mockResolvedValueOnce({ ok: true, state: "accepted", type: "friend_request", friend_id: 3 });
        const tick = useSocialStore.getState().friendsTick;
        await openWith([REQ], /Аня хочет добавить вас в друзья/);
        fireEvent.click(screen.getByRole("button", { name: /Принять/ }));
        await waitFor(() => expect(api.acceptNotification).toHaveBeenCalledWith(6));
        expect(await screen.findByText("Принято")).toBeInTheDocument();
        expect(useSocialStore.getState().friendsTick).toBe(tick + 1);
    });

    it("«Войти» по приглашению ведёт в комнату и закрывает панель", async () => {
        api.acceptNotification.mockResolvedValueOnce({ ok: true, state: "accepted", type: "room_invite", room_id: "abc234" });
        await openWith([INVITE], /Аня зовёт в игру/);
        expect(screen.getByText("Комната «Вечерняя»")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Войти/ }));
        await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/online?join=abc234"));
        expect(useNotifyStore.getState().panelOpen).toBe(false);
    });

    it("закрытая комната — без кнопок, с пометкой", async () => {
        await openWith([{ ...INVITE, live: false }], /Аня зовёт в игру/);
        expect(screen.getByText("Комната уже закрыта")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Войти/ })).toBeNull();
    });

    it("вкладка «Друзья» грузит список друзей", async () => {
        await openWith([REQ], /Аня хочет/);
        fireEvent.click(screen.getByRole("tab", { name: "Друзья" }));
        await waitFor(() => expect(api.friendsList).toHaveBeenCalled());
        expect(await screen.findByText("Пока нет друзей")).toBeInTheDocument();
    });
});
