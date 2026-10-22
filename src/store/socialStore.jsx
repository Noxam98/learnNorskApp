// Социальный слой на клиенте: какой мини-профиль открыт + «тики» для перечитывания списков.
//
// Профиль открывается откуда угодно (рейтинг, друзья, каталог, лента), а рисуется ОДИН раз
// (NavigationBar) — поэтому id открытого профиля живёт тут, как панель уведомлений в notifyStore.
// Тики: действие в одном месте (принял заявку в ленте, взял набор из профиля) должно обновить
// список в другом (вкладка «Друзья», вкладка «Наборы») — подписчик перечитывает по росту тика.
import { create } from "zustand";

export const useSocialStore = create((set, get) => ({
    profileId: null,
    openProfile: (id) => set({ profileId: id }),
    closeProfile: () => set({ profileId: null }),

    friendsTick: 0,
    bumpFriends: () => set({ friendsTick: get().friendsTick + 1 }),
    setsTick: 0,
    bumpSets: () => set({ setsTick: get().setsTick + 1 }),
}));
