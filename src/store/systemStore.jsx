import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'


export const useSystemStore = create(persist(
    (set) => ({
        currentLanguage: "ukr",

        setCurrentLanguage: (newLanguage) =>
            set(
                produce((state) => {
                    state.currentLanguage = newLanguage;
                })
            ),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
    }
));


