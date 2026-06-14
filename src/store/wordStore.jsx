import { create } from "zustand";
import { produce } from "immer";
import api from "../components/tools/api.js";

// Данные полностью серверные. Локально храним только текущую сессию (без persist).
// Выбор слов для игры и выделение для удаления — клиентское эфемерное состояние.
export const useWordsStore = create((set, get) => ({
    dictList: [],
    dictNames: [],
    currentDictName: null,
    isLoading: false,
    loaded: false,

    // Загрузка всех словарей пользователя с сервера.
    loadData: async () => {
        set({ isLoading: true });
        try {
            const data = await api.getData();
            const names = data.dictNames || [];
            const current = names.includes(get().currentDictName) ? get().currentDictName : (names[0] || null);
            set({ dictList: data.dictList || [], dictNames: names, currentDictName: current, loaded: true, isLoading: false });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },

    reset: () => set({ dictList: [], dictNames: [], currentDictName: null, loaded: false }),

    _currentDictId: () => {
        const d = get().dictList.find((x) => x.dictName === get().currentDictName);
        return d?.id;
    },

    setCurrentDict: (dictName) => set({ currentDictName: dictName }),

    // Добавление слов в текущий словарь через ИИ (генерация на сервере + общий пул).
    addWords: async (prompt) => {
        const dictId = get()._currentDictId();
        if (!dictId) return { added: 0, errors: [] };
        const res = await api.addWords(dictId, prompt);
        await get().loadData();
        return res;
    },

    // Добавить слово из общего пула (автокомплит) — мгновенно, без ИИ.
    addFromPool: async (norwegian) => {
        const dictId = get()._currentDictId();
        if (!dictId) return;
        await api.addPoolWord(dictId, norwegian);
        await get().loadData();
    },

    addNewDict: async (name) => {
        await api.createDict(name);
        await get().loadData();
        set({ currentDictName: name });
    },

    removeDict: async (dictName) => {
        const d = get().dictList.find((x) => x.dictName === dictName);
        if (!d) return;
        await api.deleteDict(d.id);
        await get().loadData();
    },

    importDict: async (dictJson) => {
        await api.importDict(dictJson);
        await get().loadData();
        if (dictJson?.dictName) set({ currentDictName: dictJson.dictName });
    },

    deleteChosedWords: async () => {
        const dict = get().dictList.find((x) => x.dictName === get().currentDictName);
        if (!dict) return;
        const ids = dict.words.filter((w) => w?.techData?.isSelected).map((w) => w.id);
        await Promise.all(ids.map((id) => api.deleteWord(id)));
        await get().loadData();
    },

    editWord: async (wordId, override) => {
        // override: { translate?, part_of_speech? }
        await api.editWord(wordId, override);
        await get().loadData();
    },

    // Пометить слово неправильным: удалить из общего пула и перегенерировать.
    reportWord: async (wordId) => {
        await api.reportWord(wordId);
        await get().loadData();
    },

    // Ленивая загрузка описания (по требованию, не пакетно).
    loadDescription: async (wordId) => {
        get()._setWord(wordId, (w) => { w.descriptionState = "loading"; });
        try {
            const res = await api.getWordDescription(wordId);
            get()._setWord(wordId, (w) => {
                w.description = { description: res.description };
                w.descriptionState = "loaded";
            });
        } catch {
            get()._setWord(wordId, (w) => { w.descriptionState = "error"; });
        }
    },

    // --- Клиентское эфемерное состояние ---
    choseWord: (wordId) => set(produce((state) => {
        const dict = state.dictList.find((x) => x.dictName === state.currentDictName);
        const w = dict?.words.find((w) => w.id === wordId);
        if (w) w.techData.isSelected = !w.techData.isSelected;
    })),

    ToggleChooseToGame: (wordId) => set(produce((state) => {
        for (const dict of state.dictList) {
            const w = dict.words.find((w) => w.id === wordId);
            if (w) { w.gameData.isChoosedToGame = !w.gameData.isChoosedToGame; break; }
        }
    })),

    selectFullDictToGame: (dictName, isChoosed) => set(produce((state) => {
        const dict = state.dictList.find((x) => x.dictName === dictName);
        if (dict) dict.words.forEach((w) => { w.gameData.isChoosedToGame = isChoosed; });
    })),

    // Результат игры: пишем на сервер и сразу отражаем локально.
    recordGameResult: (wordId, isCorrect) => {
        get()._setWord(wordId, (w) => {
            if (isCorrect) w.gameData.correctFirstTry = (w.gameData.correctFirstTry || 0) + 1;
            else w.gameData.incorrectFirstTry = (w.gameData.incorrectFirstTry || 0) + 1;
        });
        api.recordResult(wordId, isCorrect).catch(() => { /* офлайн — не критично */ });
    },

    // Точечное обновление слова по id во всех словарях.
    _setWord: (wordId, mutator) => set(produce((state) => {
        for (const dict of state.dictList) {
            const w = dict.words.find((w) => w.id === wordId);
            if (w) { mutator(w); break; }
        }
    })),
}));
