import { create } from "zustand";
import { produce } from "immer";
import api from "../components/tools/api.js";

// Фаза 2: личные словари убраны из UI. Слова живут в «Учёбе» (единый набор, бэк хранит их в
// dict_words скрытого словаря). Здесь остаётся только: серверная загрузка набора (для фонового
// догруза озвучки + fallback игр), транзитный AI-набор и добавление/удаление в Учёбу.
export const useWordsStore = create((set, get) => ({
    dictList: [],
    isLoading: false,
    loaded: false,
    aiPlayWords: null,   // транзитный AI-набор для одиночной игры (не из набора)

    setAiPlayWords: (words) => set({ aiPlayWords: words }),
    clearAiPlayWords: () => set({ aiPlayWords: null }),

    // Загрузка набора слов пользователя с сервера. silent=true — без полноэкранного лоадера.
    loadData: async (silent = false) => {
        if (!silent) set({ isLoading: true });
        try {
            const data = await api.getData();
            set({ dictList: data.dictList || [], loaded: true, isLoading: false });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },

    reset: () => set({ dictList: [], loaded: false }),

    // Тихое обновление (без мигания) — фоновый догруз озвучки/эмбеддингов.
    refresh: async () => {
        try {
            const data = await api.getData();
            set({ dictList: data.dictList || [] });
        } catch { /* офлайн — не критично */ }
    },

    // Добавить/убрать слово из Базы напрямую в «Учёбу» (бэк кладёт в скрытый авто-словарь
    // studying=1; удаление — мягкое: прогресс архивируется, не стирается). Не зависит от словаря.
    addToLearning: async (norwegian) => { await api.learningAdd(norwegian); return true; },
    removeFromLearning: async (norwegian) => { await api.learningRemove(norwegian); },

    // --- Игры (одиночные/учебные сессии через useGameLoop) ---
    ToggleChooseToGame: (wordId) => set(produce((state) => {
        for (const dict of state.dictList) {
            const w = dict.words.find((w) => w.id === wordId);
            if (w) { w.gameData.isChoosedToGame = !w.gameData.isChoosedToGame; break; }
        }
    })),

    // Результат игры: пишем на сервер и сразу отражаем локально.
    recordGameResult: (wordId, isCorrect, mode = null) => {
        if (typeof wordId === "string" && wordId.startsWith("ai-")) return; // AI-набор — статистику не пишем
        get()._setWord(wordId, (w) => {
            if (isCorrect) w.gameData.correctFirstTry = (w.gameData.correctFirstTry || 0) + 1;
            else w.gameData.incorrectFirstTry = (w.gameData.incorrectFirstTry || 0) + 1;
        });
        // mode (choice/input) кормит SRS «Учёбы» серией «без ошибок» по виду игры
        api.recordResult(wordId, isCorrect, mode).catch(() => { /* офлайн — не критично */ });
    },

    // Точечное обновление слова по id во всех наборах.
    _setWord: (wordId, mutator) => set(produce((state) => {
        for (const dict of state.dictList) {
            const w = dict.words.find((w) => w.id === wordId);
            if (w) { mutator(w); break; }
        }
    })),
}));
