// Центр уведомлений: лента + бейдж непрочитанных. Общий на вырост — сейчас единственный тип
// уведомления это предложение забрать чужой набор (accept → своя копия, decline → закрыто),
// но лента, бейдж и «прочитано» уже не знают ничего про наборы.
//
// Свежесть держим дёшево: подгружаем на входе в приложение и при возврате фокуса (как
// useVersionCheck), без постоянного поллинга — уведомления тут не чат, а почтовый ящик.
import { create } from "zustand";
import api from "../components/tools/api.js";

const REFRESH_MS = 60_000;   // не дёргаем бэк чаще (фокус может прилетать пачкой)

export const useNotifyStore = create((set, get) => ({
    items: [],
    unread: 0,
    loading: false,
    loadedAt: 0,
    readTick: 0,   // растёт на каждом markRead — см. гонку в load ниже

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

    /** Принять предложение: у нас появляется своя копия набора. Возвращает ответ бэка. */
    accept: async (id) => {
        const r = await api.acceptNotification(id);
        set({ items: get().items.map((n) => (n.id === id ? { ...n, state: "accepted" } : n)) });
        return r;
    },

    decline: async (id) => {
        const r = await api.declineNotification(id);
        set({ items: get().items.map((n) => (n.id === id ? { ...n, state: "declined" } : n)) });
        return r;
    },

    /** Выход из аккаунта — чужие уведомления показывать нельзя. */
    reset: () => set({ items: [], unread: 0, loadedAt: 0 }),
}));
