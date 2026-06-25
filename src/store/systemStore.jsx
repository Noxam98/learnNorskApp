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
        toast: "", // глобальный тост (внизу слева); пусто = скрыт
        toastType: "error", // error (красный) | success (зелёный) | warning (жёлтый) | info (нейтральный)
        toastUrl: "", // если задан — тост кликабельный, ведёт на этот hash-маршрут (напр. "/moderation")
        toastAction: null, // { label, onClick } — кнопка-действие в тосте (напр. «Понял»)
        toastPersist: false, // true — тост НЕ гаснет по таймеру (только по кнопке/повторному showToast)
        showArticles: true, // показывать артикль (en/ei/et) перед сущ. на чипах слов
        showVerbAa: true,    // показывать «å» перед глаголами на чипах слов
        soundOn: true,       // звуки игры (онлайн-режим)
        soundVolume: 1,      // громкость звука 0..1 (общий множитель для синтез-звуков и TTS)
        vibration: true,     // тактильный отклик нашей экранной клавиатуры (по умолчанию вкл)
        vibrationStrength: "mid", // сила (длительность) вибрации: low | mid | high
        pushEnabled: false,    // включены ли пуш-напоминания (намерение юзера; сама подписка — в браузере)
        // Задания «на слух» выключены ЛОКАЛЬНО (только это устройство). null = следовать аккаунту
        // (gamePrefs.listenOff), true/false = переопределение для этого устройства. См. MyPage (выбор «тут/везде»).
        listenOffLocal: null,

        setCurrentLanguage: (newLanguage) =>
            set(
                produce((state) => {
                    state.currentLanguage = newLanguage;
                })
            ),

        setTheme: (theme) => set(produce((state) => { state.theme = theme; })),
        toggleTheme: () => set(produce((state) => { state.theme = state.theme === "dark" ? "light" : "dark"; })),

        // Показать/скрыть глобальный тост (пустая строка = скрыть). type: error|success|warning|info.
        // 3-й аргумент: либо строка-hash-маршрут (тост кликабельный, ведёт туда), либо объект-опции
        // { url, action: { label, onClick }, persist }. С action/persist тост не гаснет сам.
        showToast: (text, type = "error", opt = "") => set(produce((state) => {
            const o = (opt && typeof opt === "object") ? opt : { url: opt };
            state.toast = text || "";
            state.toastType = type;
            state.toastUrl = o.url || "";
            state.toastAction = o.action || null;
            state.toastPersist = !!o.persist || !!o.action;
        })),

        setShowArticles: (v) => set(produce((state) => { state.showArticles = !!v; })),
        setShowVerbAa: (v) => set(produce((state) => { state.showVerbAa = !!v; })),
        setSoundOn: (v) => set(produce((state) => { state.soundOn = !!v; })),
        // громкость 0..1; 0 = выкл (синхронно гасим soundOn), >0 = вкл
        setSoundVolume: (v) => set(produce((state) => {
            const n = Math.max(0, Math.min(1, Number(v)));
            state.soundVolume = isNaN(n) ? 1 : n;
            state.soundOn = state.soundVolume > 0;
        })),
        setVibration: (v) => set(produce((state) => { state.vibration = !!v; })),
        setVibrationStrength: (v) => set(produce((state) => { state.vibrationStrength = VIBE_MS[v] ? v : "mid"; })),
        setPushEnabled: (v) => set(produce((state) => { state.pushEnabled = !!v; })),
        // v: null (следовать аккаунту) | true (выкл на этом устройстве) | false (вкл на этом устройстве)
        setListenOffLocal: (v) => set(produce((state) => { state.listenOffLocal = (v === null ? null : !!v); })),

    }),
    {
        name: 'system-storage',
        storage: createJSONStorage(() => localStorage),
        // toast — эфемерный, в localStorage не сохраняем (иначе всплывёт после перезагрузки).
        partialize: (state) => ({
            currentLanguage: state.currentLanguage, theme: state.theme,
            showArticles: state.showArticles, showVerbAa: state.showVerbAa,
            soundOn: state.soundOn, soundVolume: state.soundVolume,
            vibration: state.vibration, vibrationStrength: state.vibrationStrength,
            pushEnabled: state.pushEnabled, listenOffLocal: state.listenOffLocal,
        }),
    }
));


