import { create } from "zustand";
import { produce } from "immer";
import { createJSONStorage, persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export const useWordsStore = create(persist(
  (set) => ({
    dictList: [{ dictName: "default", words: [] }],
    currentDictName: "default",
    dictNames: ["default"],

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
              word.gameData = {
                correctFirstTry: 0,
                incorrectFirstTry: 0,
                isChoosedToGame: false,
              };
            }
          });
        });
      })
    ),

    addWords: (dictName, words) =>
      set(
        produce((state) => {
          const currentDictItem = state.dictList
            .filter((dict) => dict.dictName == dictName)[0];
          const filteredWords = [];
          for (const word of words) {
            if (!currentDictItem.words.map(word => word.word).includes(word.word))
              filteredWords.push({ ...word, id: uuidv4() }); // добавляем уникальный ID к каждому слову
          }
          currentDictItem.words.push(...filteredWords.map(item => {
            item.techData = {};
            item.techData.isSelected = false;
            item.gameData = {}
            item.gameData = {
              correctFirstTry: 0,
              incorrectFirstTry: 0,
              isChoosedToGame: false
            };
            return item;
          }));
        })
      ),
      incCorrectTry: (wordId) =>
        set(
          produce((state) => {
            for (const wordList of state.dictList){
              const currentWord = wordList.words.find(word => word.id == wordId);
              if (currentWord){
                currentWord.gameData.correctFirstTry = parseInt(currentWord.gameData.correctFirstTry) + 1
              }
            }
          })
        ),
      incIncorrectTry: (wordId) =>
        set(
          produce((state) => {
          for (const wordList of state.dictList){
            const currentWord = wordList.words.find(word => word.id == wordId);
            if (currentWord){
              currentWord.gameData.incorrectFirstTry = parseInt(currentWord.gameData.incorrectFirstTry) + 1
            }
          }
        })),
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
            
    deleteChosedWords: () => set(produce((state) => {
      let currentDictItem = state.dictList
        .filter((dict) => dict.dictName === state.currentDictName)[0];
      currentDictItem.words = currentDictItem.words.filter(word => !word.techData.isSelected);
    })),
    choseWord: (wordId) => set(produce((state) => {
      let currentDictItem = state.dictList
        .filter((dict) => dict.dictName === state.currentDictName)[0];
      const currentWord = currentDictItem.words.find(word => word.id == wordId);
      if (currentWord) {
        currentWord.techData.isSelected = !currentWord.techData.isSelected;
      }
    })),
    editWord: (wordId, newWordItem) => set(produce((state) => {
      let currentDictItem = state.dictList.find(dict => dict.dictName === state.currentDictName);

      if (currentDictItem) {
        let wordIndex = currentDictItem.words.findIndex(wordItem => wordItem.id === wordId);
        if (wordIndex !== -1) {
          currentDictItem.words[wordIndex] = { ...newWordItem, id: wordId }; // сохраняем тот же ID
        }
      }
    })),
    addNewDict: (dictName) =>
      set(
        produce((state) => {
          if (
            state.dictNames
              .map((item) => item.toLowerCase())
              .includes(dictName.toLowerCase()) === false
          ) {
            state.dictNames.push(dictName);
            state.dictList.push({ dictName, words: [] });
          }
          state.currentDictName = dictName;
        })
      ),
      importDict: (dictJson) =>
        set(
          produce((state) => {
            if (
              state.dictNames
                .map((item) => item.toLowerCase())
                .includes(dictJson.dictName.toLowerCase()) === false
            ) {
              state.dictNames.push(dictJson.dictName);
              state.dictList.push(dictJson);
            }
            state.currentDictName = dictJson.dictName;
          })
        ),

    setCurrentDict: (dictName) =>
      set(
        produce((state) => {
          state.currentDictName = dictName;
        })
      ),
    removeDict: (dictName) =>
      set(
        produce((state) => {
          console.log(dictName);
          if (state.dictNames.length > 1)
            if (dictName == !state.currentDictName) {
              state.dictNames = state.dictNames.filter(
                (item) => item !== dictName
              );
              state.dictList = state.dictList.filter(
                (item) => item.dictName !== dictName
              );
            } else {
              const filteredDictNames = state.dictNames.filter(
                (item) => item !== dictName
              );
              state.currentDictName = filteredDictNames[0];
              state.dictList = state.dictList.filter(
                (item) => item.dictName !== dictName
              );
              state.dictNames = filteredDictNames;
            }
        })
      ),
  }),
  {
    name: 'words-storage',
    storage: createJSONStorage(() => localStorage),
  }
));



useWordsStore.getState().initializeIds();
useWordsStore.getState().initializeGameData();