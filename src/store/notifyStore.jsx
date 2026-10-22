// Центр уведомлений: лента + бейдж непрочитанных + вкладка панели (лента / друзья). Типы
// уведомлений (набор, заявка в друзья, приглашение в игру…) различает только карточка в
// NotificationsBell; лента, бейдж и «прочитано» про них ничего не знают.
//
// Свежесть держим дёшево: подгружаем на входе в приложение и при возврате фокуса (как
// useVersionCheck), без постоянного поллинга — уведомления тут не чат, а почтовый ящик.
import { create } from "zustand";
import api from "../components/tools/api.js";
import { useSystemStore } from "./systemStore.jsx";
import { useSocialStore } from "./socialStore.jsx";
import { N as NT } from "../components/notifications/Notifications.i18n.js";

const REFRESH_MS = 60_000;   // не дёргаем бэк чаще (фокус может прилетать пачкой)

export const useNotifyStore = create((set, get) => ({
    items: [],
    unread: 0,
    loading: false,
    loadedAt: 0,
    readTick: 0,    // растёт на каждом markRead — см. гонку в load ниже
    panelOpen: false,
    panelTab: "feed",   // feed | friends
    busyId: null,   // по какому уведомлению сейчас идёт действие (кнопки блокируются)

    /** Открыть панель: точек входа несколько (шапка, нижняя панель, «Найти друзей» в рейтинге),
     *  поэтому состояние тут. tab — сразу на нужной вкладке. */
    openPanel: (tab = "feed") => {
        set({ panelOpen: true, panelTab: tab === "friends" ? "friends" : "feed" });
        get().load(true);
        get().markRead();
    },
    closePanel: () => set({ panelOpen: false }),
    setPanelTab: (tab) => set({ panelTab: tab }),

    /** Подтянуть ленту. force=true — игнорировать окно REFRESH_MS (после действия/открытия панели). */
    load: async (force = false) => {
        const st = get();
        if (st.loading) return;
        if (!force && st.loadedAt && Date.now() - st.loadedAt < REFRESH_MS) return;
        const tick = st.readTick;
        set({ loading: true });
        try {
            const r = await api.getNotifications();
            // Панель открывают И грузят почти одновременно: ответ, выехавший ДО «прочитано»,
            // не должен воскрешать бейдж. Если за время запроса было markRead — берём 0.
            const stale = get().readTick !== tick;
            set({
                items: (r?.items || []).map((n) => (stale ? { ...n, read: true } : n)),
                unread: stale ? 0 : (r?.unread || 0),
                loadedAt: Date.now(),
            });
        } catch { /* офлайн/не залогинен — молча, бейдж просто не обновится */ }
        finally { set({ loading: false }); }
    },

    /** Панель открыли — гасим бейдж (решения по предложениям это не трогает). */
    markRead: async () => {
        set({ unread: 0, readTick: get().readTick + 1, items: get().items.map((n) => ({ ...n, read: true })) });
        try { await api.readNotifications(); } catch { /* в следующий load подтянется правда */ }
    },

    /** Принять: набор → своя копия (тост с её именем); заявка → дружба (списки друзей
     *  перечитываются); приглашение → ответ несёт room_id, в комнату ведёт панель. */
    accept: async (id) => {
        set({ busyId: id });
        try {
            const r = await api.acceptNotification(id);
            set({ items: get().items.map((n) => (n.id === id ? { ...n, state: "accepted" } : n)) });
            if (r?.type === "friend_request") useSocialStore.getState().bumpFriends();
            else if (r?.set_id) useSocialStore.getState().bumpSets();
            if (r?.set_id && r?.name) {
                const { showToast, currentLanguage } = useSystemStore.getState();
                const tpl = (NT[currentLanguage] || NT.ru).acceptedToast;
                showToast(String(tpl).replace("{set}", r.name), "success");
            }
            return r;
        } finally { set({ busyId: null }); }
    },

    decline: async (id) => {
        set({ busyId: id });
        try {
            const r = await api.declineNotification(id);
            set({ items: get().items.map((n) => (n.id === id ? { ...n, state: "declined" } : n)) });
            return r;
        } finally { set({ busyId: null }); }
    },

    /** Выход из аккаунта — чужие уведомления показывать нельзя. */
    reset: () => set({ items: [], unread: 0, loadedAt: 0 }),
}));
