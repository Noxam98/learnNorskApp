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
    aiPlayWords: null,   // транзитный AI-набор для одиночной игры (не из словаря)

    setAiPlayWords: (words) => set({ aiPlayWords: words }),
    clearAiPlayWords: () => set({ aiPlayWords: null }),

    // Загрузка всех словарей пользователя с сервера.
    // silent=true — без полноэкранного лоадера (обновление после мутаций).
    loadData: async (silent = false) => {
        if (!silent) set({ isLoading: true });
        try {
            const data = await api.getData();
            const names = data.dictNames || [];
            const keep = get().currentDictName;
            // приоритет: текущий выбор сессии → сохранённый на сервере → первый словарь
            const current = (keep && names.includes(keep)) ? keep
                : (data.currentDict && names.includes(data.currentDict)) ? data.currentDict
                : (names[0] || null);
            set({ dictList: data.dictList || [], dictNames: names, currentDictName: current, loaded: true, isLoading: false });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },

    reset: () => set({ dictList: [], dictNames: [], currentDictName: null, loaded: false }),

    // Тихое обновление (без мигания загрузки) — для фонового опроса (звук/эмбеддинги догружаются).
    refresh: async () => {
        try {
            const data = await api.getData();
            set({ dictList: data.dictList || [], dictNames: data.dictNames || [] });
        } catch { /* офлайн — не критично */ }
    },

    _currentDictId: () => {
        const d = get().dictList.find((x) => x.dictName === get().currentDictName);
        return d?.id;
    },

    setCurrentDict: (dictName) => { set({ currentDictName: dictName }); api.saveCurrentDict(dictName).catch(() => {}); },

    // Добавление слов в текущий словарь через ИИ (генерация на сервере + общий пул).
    addWords: async (prompt) => {
        const dictId = get()._currentDictId();
        if (!dictId) return { added: 0, errors: [] };
        const res = await api.addWords(dictId, prompt);
        await get().loadData(true);
        return res;
    },

    // Добавить слово из общего пула (автокомплит) — мгновенно, без ИИ.
    // Возвращает id добавленного слова в текущем словаре (для отмены), либо null.
    addFromPool: async (norwegian) => {
        const dictId = get()._currentDictId();
        if (!dictId) return null;
        await api.addPoolWord(dictId, norwegian);
        await get().loadData(true);
        const dict = get().dictList.find((d) => d.id === dictId);
        const key = (norwegian || "").trim().toLowerCase();
        const w = dict?.words?.find((x) => (x.translate?.no?.[0] || "").trim().toLowerCase() === key);
        return w?.id ?? null;
    },

    // Удалить одно слово из текущего словаря (по id).
    removeFromDict: async (wordId) => {
        await api.deleteWord(wordId);
        await get().loadData(true);
    },

    addNewDict: async (name) => {
        await api.createDict(name);
        await get().loadData(true);
        set({ currentDictName: name });
        api.saveCurrentDict(name).catch(() => {});
    },

    removeDict: async (dictName) => {
        const d = get().dictList.find((x) => x.dictName === dictName);
        if (!d) return;
        await api.deleteDict(d.id);
        await get().loadData(true);
    },

    // Создать словарь из всех слов пула, подходящих под фильтр.
    createDictFromPool: async ({ name, q, topics, level }) => {
        const res = await api.createDictFromPool({ name, q, topics, level });
        await get().loadData(true);
        if (res?.name) set({ currentDictName: res.name });
        return res;
    },

    importDict: async (dictJson) => {
        await api.importDict(dictJson);
        await get().loadData(true);
        if (dictJson?.dictName) set({ currentDictName: dictJson.dictName });
    },

    deleteChosedWords: async () => {
        const dict = get().dictList.find((x) => x.dictName === get().currentDictName);
        if (!dict) return;
        const ids = dict.words.filter((w) => w?.techData?.isSelected).map((w) => w.id);
        await Promise.all(ids.map((id) => api.deleteWord(id)));
        await get().loadData(true);
    },

    // Уточнить перевод выбранных слов через ИИ (для слов с одинаковым/неточным
    // переводом) — правит общий пул на язык lang. Нужно ≥2 слова.
    refineChosenWords: async (lang) => {
        const dict = get().dictList.find((x) => x.dictName === get().currentDictName);
        if (!dict) return;
        const ids = dict.words.filter((w) => w?.techData?.isSelected).map((w) => w.id);
        if (ids.length < 2) return;
        await api.refineWords(ids, lang);
        await get().loadData(true);
    },

    // Перенести выбранные слова текущего словаря в другой (по имени словаря).
    moveChosenWords: async (targetDictName) => {
        const dict = get().dictList.find((x) => x.dictName === get().currentDictName);
        const target = get().dictList.find((x) => x.dictName === targetDictName);
        if (!dict || !target || target.dictName === dict.dictName) return;
        const ids = dict.words.filter((w) => w?.techData?.isSelected).map((w) => w.id);
        if (!ids.length) return;
        await api.moveWords(ids, target.id);
        await get().loadData(true);
    },

    // Создать новый словарь и перенести в него выбранные слова (текущий словарь не меняем).
    moveChosenToNew: async (name) => {
        const dict = get().dictList.find((x) => x.dictName === get().currentDictName);
        if (!dict) return;
        const ids = dict.words.filter((w) => w?.techData?.isSelected).map((w) => w.id);
        if (!ids.length) return;
        let targetId;
        try { targetId = (await api.createDict(name))?.id; }
        catch { /* имя занято — перенесём в существующий с таким именем */ }
        if (!targetId) {
            await get().loadData(true);
            targetId = get().dictList.find((d) => d.dictName === name)?.id;
        }
        if (!targetId) return;
        await api.moveWords(ids, targetId);
        await get().loadData(true);
    },

    editWord: async (wordId, override) => {
        // override: { translate?, part_of_speech? }
        await api.editWord(wordId, override);
        await get().loadData(true);
    },

    // Пометить слово неправильным: удалить из общего пула и перегенерировать.
    reportWord: async (wordId) => {
        await api.reportWord(wordId);
        await get().loadData(true);
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
    recordGameResult: (wordId, isCorrect, mode = null) => {
        if (typeof wordId === "string" && wordId.startsWith("ai-")) return; // AI-набор — статистику не пишем
        get()._setWord(wordId, (w) => {
            if (isCorrect) w.gameData.correctFirstTry = (w.gameData.correctFirstTry || 0) + 1;
            else w.gameData.incorrectFirstTry = (w.gameData.incorrectFirstTry || 0) + 1;
        });
        // mode (choice/input) кормит SRS «Учёбы» серией «без ошибок» по виду игры
        api.recordResult(wordId, isCorrect, mode).catch(() => { /* офлайн — не критично */ });
    },

    // Точечное обновление слова по id во всех словарях.
    _setWord: (wordId, mutator) => set(produce((state) => {
        for (const dict of state.dictList) {
            const w = dict.words.find((w) => w.id === wordId);
            if (w) { mutator(w); break; }
        }
    })),
}));
