import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'


export const useSystemStore = create(persist(
    (set) => ({
        currentLanguage: "ukr",
        theme: "light", // light | dark
        toast: "", // глобальное сообщение об ошибке (тост внизу слева); пусто = скрыт
        showArticles: true, // показывать артикль (en/ei/et) перед сущ. на чипах слов
        showVerbAa: true,    // показывать «å» перед глаголами на чипах слов
        soundOn: true,       // звуки игры (онлайн-режим)

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

        setShowArticles: (v) => set(produce((state) => { state.showArticles = !!v; })),
        setShowVerbAa: (v) => set(produce((state) => { state.showVerbAa = !!v; })),
        setSoundOn: (v) => set(produce((state) => { state.soundOn = !!v; })),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
        // toast — эфемерный, в localStorage не сохраняем (иначе всплывёт после перезагрузки).
        partialize: (state) => ({
            currentLanguage: state.currentLanguage, theme: state.theme,
            showArticles: state.showArticles, showVerbAa: state.showVerbAa, soundOn: state.soundOn,
        }),
    }
));


