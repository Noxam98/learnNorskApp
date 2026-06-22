import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'

// Сила вибрации → длительность импульса (мс). На вебе амплитуду не задать (Vibration API
// умеет только длительность/паттерн), поэтому «сила» = насколько длинный импульс.
// Длительность одиночного импульса (мс). Короткие (<~15мс) многие телефоны не ощущают —
// особенно теперь, когда на короткий тап бьём ОДИН раз (раньше было два по 8мс).
export const VIBE_MS = { low: 12, mid: 22, high: 38 };


export const useSystemStore = create(persist(
    (set) => ({
        currentLanguage: "ukr",
        theme: "light", // light | dark
        toast: "", // глобальное сообщение об ошибке (тост внизу слева); пусто = скрыт
        showArticles: true, // показывать артикль (en/ei/et) перед сущ. на чипах слов
        showVerbAa: true,    // показывать «å» перед глаголами на чипах слов
        soundOn: true,       // звуки игры (онлайн-режим)
        vibration: true,     // тактильный отклик нашей экранной клавиатуры (по умолчанию вкл)
        vibrationStrength: "mid", // сила (длительность) вибрации: low | mid | high
        nativeKeyboard: false, // печатать клавиатурой устройства вместо встроенной (где игра поддерживает)

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
        setVibration: (v) => set(produce((state) => { state.vibration = !!v; })),
        setVibrationStrength: (v) => set(produce((state) => { state.vibrationStrength = VIBE_MS[v] ? v : "mid"; })),
        setNativeKeyboard: (v) => set(produce((state) => { state.nativeKeyboard = !!v; })),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
        // toast — эфемерный, в localStorage не сохраняем (иначе всплывёт после перезагрузки).
        partialize: (state) => ({
            currentLanguage: state.currentLanguage, theme: state.theme,
            showArticles: state.showArticles, showVerbAa: state.showVerbAa, soundOn: state.soundOn,
            vibration: state.vibration, vibrationStrength: state.vibrationStrength,
            nativeKeyboard: state.nativeKeyboard,
        }),
    }
));


