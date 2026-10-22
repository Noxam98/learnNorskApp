// @vitest-environment jsdom
// Социальный слой на клиенте: вкладка друзей (список, поиск, состояния кнопки дружбы, отзыв
// заявки), мини-профиль (статистика / скрытый профиль / взять набор), каталог наборов
// (список → превью → своя копия), приглашение в комнату, рейтинг друзей.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import FriendsTab from "./FriendsTab.jsx";
import ProfileModal from "./ProfileModal.jsx";
import CatalogModal from "./CatalogModal.jsx";
import InviteModal from "./InviteModal.jsx";
import { LeaderboardModal } from "../learning/Leaderboard.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { useNotifyStore } from "../../store/notifyStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import api from "../tools/api.js";

vi.mock("../tools/api.js", () => ({
    default: {
        friendsList: vi.fn(), friendRequest: vi.fn(), friendRemove: vi.fn(() => Promise.resolve({ ok: true })),
        searchUsers: vi.fn(), userProfile: vi.fn(), catalogList: vi.fn(), catalogSet: vi.fn(), catalogClone: vi.fn(),
        adminCatalogUnpublish: vi.fn(), onlineInvite: vi.fn(), leaderboard: vi.fn(),
        getNotifications: vi.fn(() => Promise.resolve({ items: [], unread: 0 })), readNotifications: vi.fn(() => Promise.resolve({})),
        onTokens: vi.fn(),
    },
}));

const FRIENDS = {
    friends: [{ id: 3, name: "Аня", level: "A2", mastered: 300, streak: 4, weekPts: 120, today: true }],
    outgoing: [{ id: 8, name: "Олег" }],
};

beforeEach(() => {
    useSystemStore.setState({ currentLanguage: "ru" });
    useAuthStore.setState({ user: { username: "t" } });
    useSocialStore.setState({ profileId: null, friendsTick: 0, setsTick: 0 });
    api.friendsList.mockResolvedValue(FRIENDS);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("FriendsTab", () => {
    it("показывает друзей со сводкой и тап открывает профиль", async () => {
        render(<FriendsTab lang="ru" />);
        expect(await screen.findByText("Аня")).toBeInTheDocument();
        expect(screen.getByText("120")).toBeInTheDocument();
        expect(screen.getByText("Ждут ответа")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Аня"));
        expect(useSocialStore.getState().profileId).toBe(3);
    });

    it("поиск: кнопка отражает отношение, «В друзья» шлёт заявку", async () => {
        api.searchUsers.mockResolvedValue({ users: [
            { id: 5, name: "Борис", rel: "none" }, { id: 6, name: "Вера", rel: "incoming" }, { id: 3, name: "Аня", rel: "friend" },
        ] });
        api.friendRequest.mockResolvedValue({ ok: true, state: "pending" });
        render(<FriendsTab lang="ru" />);
        fireEvent.change(screen.getByLabelText("Найти друзей"), { target: { value: "ан" } });
        expect(await screen.findByText("Борис")).toBeInTheDocument();
        // точные имена: строка человека — тоже role=button, и её имя включает текст кнопки
        expect(screen.getByRole("button", { name: "Принять" })).toBeInTheDocument();   // Вера звала меня
        expect(screen.getByText("В друзьях")).toBeInTheDocument();                     // Аня уже друг
        fireEvent.click(screen.getByRole("button", { name: "В друзья" }));
        await waitFor(() => expect(api.friendRequest).toHaveBeenCalledWith(5));
        expect(await screen.findByText("Заявка отправлена")).toBeInTheDocument();
        expect(screen.queryByText("Борис")).toBeInTheDocument();                       // клик по кнопке не открыл профиль
        expect(useSocialStore.getState().profileId).toBeNull();
    });

    it("свою висящую заявку можно отозвать", async () => {
        render(<FriendsTab lang="ru" />);
        expect(await screen.findByText("Олег")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Отозвать/ }));
        await waitFor(() => expect(api.friendRemove).toHaveBeenCalledWith(8));
        expect(screen.queryByText("Олег")).toBeNull();
    });
});

describe("ProfileModal", () => {
    it("статистика + наборы человека; «Взять» делает копию", async () => {
        api.userProfile.mockResolvedValue({
            id: 3, name: "Аня", rel: "friend", hidden: false, level: "A2", mastered: 300, streak: 4, weekPts: 120,
            activity: [], sets: [{ id: 11, name: "Кухня", count: 12, clones: 2, level: "A1", mine: false, taken: false }],
        });
        api.catalogClone.mockResolvedValue({ ok: true, set_id: 50, name: "Кухня" });
        render(<ProfileModal />);
        useSocialStore.getState().openProfile(3);
        expect(await screen.findByText("300")).toBeInTheDocument();
        expect(screen.getByText("В друзьях")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Взять себе/ }));
        await waitFor(() => expect(api.catalogClone).toHaveBeenCalledWith(11));
        expect(await screen.findByText("Уже взят")).toBeInTheDocument();
        expect(useSocialStore.getState().setsTick).toBe(1);   // «Наборы» перечитаются
    });

    it("скрытый профиль: без цифр, с пометкой", async () => {
        api.userProfile.mockResolvedValue({ id: 4, name: null, rel: "none", hidden: true, sets: [] });
        render(<ProfileModal />);
        useSocialStore.getState().openProfile(4);
        expect(await screen.findByText("Человек скрыл свою статистику")).toBeInTheDocument();
        expect(screen.getAllByText("Аноним").length).toBeGreaterThan(0);
        expect(screen.queryByText("Выучено")).toBeNull();
    });
});

describe("CatalogModal", () => {
    const ITEM = { id: 11, name: "Кухня", count: 12, clones: 2, level: "A1", author: { id: 3, name: "Аня" }, mine: false, taken: false };

    it("список → превью → своя копия", async () => {
        api.catalogList.mockResolvedValue({ items: [ITEM], total: 1 });
        api.catalogSet.mockResolvedValue({ ...ITEM, words: [{ pool_id: 1, norwegian: "kniv", translate: { ru: ["нож"] }, level: "A1" }] });
        api.catalogClone.mockResolvedValue({ ok: true, set_id: 50, name: "Кухня" });
        const onTaken = vi.fn();
        render(<CatalogModal open lang="ru" onClose={vi.fn()} onTaken={onTaken} />);
        fireEvent.click(await screen.findByText("Кухня"));
        expect(await screen.findByText("kniv")).toBeInTheDocument();
        expect(screen.getByText("нож")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Взять себе/ }));
        await waitFor(() => expect(onTaken).toHaveBeenCalledWith(50));
        expect(await screen.findByRole("button", { name: /Уже взят/ })).toBeDisabled();
    });

    it("свой набор взять нельзя; пустой каталог — подсказка", async () => {
        api.catalogList.mockResolvedValueOnce({ items: [], total: 0 });
        const { unmount } = render(<CatalogModal open lang="ru" onClose={vi.fn()} />);
        expect(await screen.findByText(/Каталог пока пуст/)).toBeInTheDocument();
        unmount();
        api.catalogList.mockResolvedValue({ items: [{ ...ITEM, mine: true }], total: 1 });
        api.catalogSet.mockResolvedValue({ ...ITEM, mine: true, words: [] });
        render(<CatalogModal open lang="ru" onClose={vi.fn()} />);
        fireEvent.click(await screen.findByText("Кухня"));
        expect(await screen.findByRole("button", { name: /Ваш набор/ })).toBeDisabled();
    });

    it("автор — ссылка на его профиль", async () => {
        api.catalogList.mockResolvedValue({ items: [ITEM], total: 1 });
        render(<CatalogModal open lang="ru" onClose={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Аня" }));   // точное имя: строка набора тоже кнопка
        expect(useSocialStore.getState().profileId).toBe(3);
        expect(api.catalogSet).not.toHaveBeenCalled();   // тап по автору не открыл превью
    });
});

describe("InviteModal", () => {
    it("зовёт друга в одно касание; уже сидящих в комнате не предлагает", async () => {
        api.friendsList.mockResolvedValue({ friends: [
            { id: 3, name: "Аня" }, { id: 4, name: "Борис" },
        ], outgoing: [] });
        api.onlineInvite.mockResolvedValue({ ok: true });
        render(<InviteModal open roomId="abc234" lang="ru" inRoom={["Борис"]} onClose={vi.fn()} />);
        expect(await screen.findByText("Аня")).toBeInTheDocument();
        expect(screen.queryByText("Борис")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /Позвать/ }));
        await waitFor(() => expect(api.onlineInvite).toHaveBeenCalledWith("abc234", 3));
        expect(await screen.findByText("Позвали")).toBeInTheDocument();
    });

    it("ошибку бэка показывает понятно", async () => {
        api.friendsList.mockResolvedValue({ friends: [{ id: 3, name: "Аня" }], outgoing: [] });
        api.onlineInvite.mockRejectedValue(new Error("room_full"));
        const showToast = vi.spyOn(useSystemStore.getState(), "showToast");
        render(<InviteModal open roomId="abc234" lang="ru" onClose={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: /Позвать/ }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith("Комната заполнена"));
    });
});

describe("LeaderboardModal — друзья", () => {
    it("вкладка «Друзья» просит scope=friends; без друзей — кнопка поиска друзей", async () => {
        api.leaderboard.mockResolvedValue({ top: [{ rank: 1, id: 1, name: "t", points: 5, me: true }], me: { rank: 1 }, count: 1 });
        useNotifyStore.setState({ panelOpen: false, panelTab: "feed" });
        const onClose = vi.fn();
        render(<LeaderboardModal lang="ru" onClose={onClose} />);
        fireEvent.click(screen.getByRole("button", { name: "Друзья" }));
        await waitFor(() => expect(api.leaderboard).toHaveBeenCalledWith("week", 100, "friends"));
        fireEvent.click(await screen.findByRole("button", { name: /Найти друзей/ }));
        expect(onClose).toHaveBeenCalled();
        expect(useNotifyStore.getState().panelOpen).toBe(true);
        expect(useNotifyStore.getState().panelTab).toBe("friends");
    });

    it("строка рейтинга открывает профиль", async () => {
        api.leaderboard.mockResolvedValue({ top: [{ rank: 1, id: 7, name: "Аня", points: 50, me: false }], me: null, count: 1 });
        render(<LeaderboardModal lang="ru" onClose={vi.fn()} />);
        fireEvent.click(await screen.findByText("Аня"));
        expect(useSocialStore.getState().profileId).toBe(7);
    });
});
