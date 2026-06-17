import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'


export const useSystemStore = create(persist(
    (set) => ({
        currentLanguage: "ukr",
        theme: "light", // light | dark
        toast: "", // глобальное сообщение об ошибке (тост внизу слева); пусто = скрыт

        setCurrentLanguage: (newLanguage) =>
            set(
                produce((state) => {
                    state.currentLanguage = newLanguage;
                })
            ),

        setTheme: (theme) => set(produce((state) => { state.theme = theme; })),
        toggleTheme: () => set(produce((state) => { state.theme = state.theme === "dark" ? "light" : "dark"; })),

        // Показать/скрыть глобальный тост (пустая строка = скрыть). Зовётся из api.js при сбоях запроса.
        showToast: (text) => set(produce((state) => { state.toast = text || ""; })),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
        // toast — эфемерный, в localStorage не сохраняем (иначе всплывёт после перезагрузки).
        partialize: (state) => ({ currentLanguage: state.currentLanguage, theme: state.theme }),
    }
));


