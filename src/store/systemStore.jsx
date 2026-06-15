import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'


export const useSystemStore = create(persist(
    (set) => ({
        currentLanguage: "ukr",
        theme: "light", // light | dark

        setCurrentLanguage: (newLanguage) =>
            set(
                produce((state) => {
                    state.currentLanguage = newLanguage;
                })
            ),

        setTheme: (theme) => set(produce((state) => { state.theme = theme; })),
        toggleTheme: () => set(produce((state) => { state.theme = state.theme === "dark" ? "light" : "dark"; })),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
    }
));


