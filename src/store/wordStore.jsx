import {create} from "zustand";
import {produce} from "immer";
import {createJSONStorage, persist} from 'zustand/middleware'
import {v4 as uuidv4} from 'uuid'
import api from "../components/tools/api.js";
import {useSystemStore} from "./systemStore.jsx"; // Убедитесь, что путь до вашего api.js верный

const fetchDescriptionFromAPI = async (word) => {
    const wordText = word.translate?.no?.[0];
    if (!wordText) {
        throw new Error("Слово для запроса отсутствует.");
    }
    console.log(`Запрашиваю описание для: "${wordText}"...`);
    return await api.getWordDescription(wordText);
};

export const useWordsStore = create(persist(
    (set, get) => ({
        // --- СОСТОЯНИЕ (State) ---
        dictList: [{ dictName: "default", words: [] }],
        currentDictName: "default",
        dictNames: ["default"],
        descriptionQueue: [],
        isFetchingDescription: false,

        // --- ДЕЙСТВИЯ (Actions) ---

        // --- Логика очереди загрузки описаний ---
        _addWordsToQueueAndStart: (wordIds) => {
            if (!wordIds || wordIds.length === 0) return;
            set(state => ({
                descriptionQueue: [...new Set([...state.descriptionQueue, ...wordIds])]
            }));
            get()._startQueueProcessor();
        },

        _startQueueProcessor: async () => {
            if (get().isFetchingDescription) return;
            set({ isFetchingDescription: true });

            while (get().descriptionQueue.length > 0) {
                const wordId = get().descriptionQueue[0];
                await get()._processOneFromQueue(wordId);
                set(state => ({
                    descriptionQueue: state.descriptionQueue.slice(1)
                }));
            }
            set({ isFetchingDescription: false });
        },

        _processOneFromQueue: async (wordId) => {
            let wordToFetch = null;
            for (const dict of get().dictList) {
                wordToFetch = dict.words.find(w => w.id === wordId);
                if (wordToFetch) break;
            }

            if (wordToFetch) {
                try {
                    get().setWordDescriptionState(wordId, 'loading');
                    const descriptionData = await fetchDescriptionFromAPI(wordToFetch);
                    get().editWord(wordId, { description: descriptionData });
                } catch (error) {
                    console.error(`Ошибка загрузки описания для слова с ID ${wordId}:`, error.message);
                    get().setWordDescriptionState(wordId, 'error');
                }
            }
        },

        // --- Инициализация и проверка ---
        initializeIds: () => set(
            produce((state) => {
                state.dictList.forEach(dict => {
                    dict.words.forEach(word => {
                        if (!word.id) {
                            word.id = uuidv4();
                        }
                    });
                });
            })
        ),

        initializeGameData: () => set(
            produce((state) => {
                state.dictList.forEach(dict => {
                    dict.words.forEach(word => {
                        if (!word.gameData) {
                            word.gameData = { correctFirstTry: 0, incorrectFirstTry: 0, isChoosedToGame: false };
                        }
                    });
                });
            })
        ),

        initializeDescriptions: () => set(
            produce((state) => {
                state.dictList.forEach(dict => {
                    dict.words.forEach(word => {
                        if (!word.description) {
                            word.description = { ru: "", lt: "", ukr: "", pl: "", en: "" };
                        }

                        // НОВОЕ: Сбрасываем статус 'loading' на 'empty' при инициализации
                        if (word.descriptionState === 'loading') {
                            console.log(`[INIT] Сброс статуса 'loading' для слова "${word.translate?.no?.[0]}" на 'empty'.`);
                            word.descriptionState = 'empty';
                        }
                        // Если статус еще не установлен (т.е. 'undefined'), определяем его
                        else if (!word.descriptionState) {
                            const hasAnyDescription = Object.values(word.description).some(text => typeof text === 'string' && text.trim() !== "");
                            word.descriptionState = hasAnyDescription ? 'loaded' : 'empty';
                        }
                    });
                });
            })
        ),

        checkAndLoadAllDescriptions: () => {
            console.log("Проверка наличия описаний для всех слов...");
            // Получаем текущий язык прямо из systemStore
            const currentLanguage = useSystemStore.getState().currentLanguage;
            console.log(currentLanguage)
            console.log(`[CHECK] Проверка будет проводиться для языка: "${currentLanguage}"`);

            const wordsToLoad = [];
            const { dictList } = get();

            for (const dict of dictList) {
                for (const word of dict.words) {
                    // Новое, более умное условие
                    console.log(word.description[currentLanguage])
                    const descriptionForLang = word.description.description ? word.description.description[currentLanguage] : undefined;
                    const hasValidDescription = typeof descriptionForLang === 'string' && descriptionForLang.trim() !== '';
                    // console.log(descriptionForLang, hasValidDescription);
                    // Добавляем в очередь, если нет валидного описания И слово не находится в процессе загрузки
                    if (!hasValidDescription && word.descriptionState !== 'loading') {
                        wordsToLoad.push(word.id);
                    }
                }
            }

            if (wordsToLoad.length > 0) {
                console.log(`[CHECK] Найдено ${wordsToLoad.length} слов без описания для языка "${currentLanguage}".`);
            } else {
                console.log(`[CHECK] Все слова уже имеют описание для языка "${currentLanguage}".`);
            }

            get()._addWordsToQueueAndStart(wordsToLoad);
        },


        // --- Основные действия со словами и словарями ---
        addWords: (dictName, words) => {
            const newWordIds = [];
            set(produce(draft => {
                const currentDictItem = draft.dictList.find((dict) => dict.dictName === dictName);
                if (!currentDictItem) return;

                for (const word of words) {
                    if (!currentDictItem.words.some(w => w.translate?.no?.[0] === word.translate?.no?.[0])) {
                        const newWord = {
                            ...word,
                            id: uuidv4(),
                            description: { ru: "", lt: "", ukr: "", pl: "", en: "" },
                            descriptionState: 'empty',
                            techData: { isSelected: false },
                            gameData: { correctFirstTry: 0, incorrectFirstTry: 0, isChoosedToGame: false }
                        };
                        currentDictItem.words.push(newWord);
                        newWordIds.push(newWord.id);
                    }
                }
            }));
            get()._addWordsToQueueAndStart(newWordIds);
        },

        editWord: (wordId, newWordItem) => set(produce((state) => {
            let currentDictItem = null;
            for(const dict of state.dictList) {
                const wordIndex = dict.words.findIndex(w => w.id === wordId);
                if (wordIndex !== -1) {
                    dict.words[wordIndex] = {...dict.words[wordIndex], ...newWordItem, id: wordId };
                    if (newWordItem.description) {
                        const hasText = Object.values(newWordItem.description).some(text => text && text.trim() !== "");
                        dict.words[wordIndex].descriptionState = hasText ? 'loaded' : 'empty';
                    }
                    return; // Выходим из функции после обновления
                }
            }
        })),

        setWordDescriptionState: (wordId, newDescriptionState) => set(produce((state) => {
            for (const dict of state.dictList) {
                const word = dict.words.find(w => w.id === wordId);
                if (word) {
                    word.descriptionState = newDescriptionState;
                    break;
                }
            }
        })),

        deleteChosedWords: () => set(produce((state) => {
            const currentDictItem = state.dictList.find((dict) => dict.dictName === state.currentDictName);
            if (currentDictItem) {
                currentDictItem.words = currentDictItem.words.filter(word => !word.techData.isSelected);
            }
        })),

        choseWord: (wordId) => set(produce((state) => {
            const currentDictItem = state.dictList.find((dict) => dict.dictName === state.currentDictName);
            const currentWord = currentDictItem?.words.find(word => word.id == wordId);
            if (currentWord) {
                currentWord.techData.isSelected = !currentWord.techData.isSelected;
            }
        })),

        addNewDict: (dictName) => set(produce((state) => {
            if (!state.dictNames.map((item) => item.toLowerCase()).includes(dictName.toLowerCase())) {
                state.dictNames.push(dictName);
                state.dictList.push({ dictName, words: [] });
            }
            state.currentDictName = dictName;
        })),
// НОВЫЙ МЕТОД
        resetAllDescriptions: () => set(produce((state) => {
            console.log('[RESET] Сброс всех описаний...');
            state.dictList.forEach(dict => {
                dict.words.forEach(word => {
                    word.description = { ru: "", lt: "", ukr: "", pl: "", en: "" };
                    word.descriptionState = 'empty';
                });
            });
            console.log('[RESET] Все описания сброшены. Можно запускать checkAndLoadAllDescriptions для перезагрузки.');
        })),

        importDict: (dictJson) => set(produce((state) => {
            if (!state.dictNames.map((item) => item.toLowerCase()).includes(dictJson.dictName.toLowerCase())) {
                state.dictNames.push(dictJson.dictName);
                state.dictList.push(dictJson);
            }
            state.currentDictName = dictJson.dictName;
        })),

        setCurrentDict: (dictName) => set({ currentDictName: dictName }),

        removeDict: (dictName) => set(produce((state) => {
            if (state.dictNames.length <= 1) return; // Не удалять последний словарь

            const dictExists = state.dictNames.includes(dictName);
            if (!dictExists) return;

            state.dictNames = state.dictNames.filter(name => name !== dictName);
            state.dictList = state.dictList.filter(dict => dict.dictName !== dictName);

            if (state.currentDictName === dictName) {
                state.currentDictName = state.dictNames[0];
            }
        })),
        // Действия, связанные с игрой
        ToggleChooseToGame: (wordId) =>
            set(
                produce((state) => {
                    for (const wordList of state.dictList){
                        const currentWord = wordList.words.find(word => word.id == wordId);
                        if (currentWord){
                            console.log(currentWord.gameData.isChoosedToGame);

                            if (currentWord.gameData.isChoosedToGame)
                                currentWord.gameData.isChoosedToGame = false
                            else
                                currentWord.gameData.isChoosedToGame = true
                        }
                    }
                })),
        selectFullDictToGame: (dictName, isChoosed) =>
            set(
                produce((state) => {

                    const currentDict = state.dictList.find(dict => dict.dictName === dictName)
                    if(currentDict){
                        for(let word of currentDict.words)
                            word.gameData.isChoosedToGame = isChoosed
                    }

                })),


    }),
    {
        name: 'words-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) =>
            Object.fromEntries(
                Object.entries(state).filter(([key]) => !['descriptionQueue', 'isFetchingDescription'].includes(key))
            ),
    }
));

// Инициализация и проверка при запуске приложения
useWordsStore.getState().initializeIds();
useWordsStore.getState().initializeGameData();
useWordsStore.getState().initializeDescriptions();

setTimeout(() => {
    useWordsStore.getState().checkAndLoadAllDescriptions();
}, 500);