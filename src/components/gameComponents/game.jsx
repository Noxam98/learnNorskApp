import { useState, useReducer, useEffect, useMemo, useRef } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import {theme} from "./theme.js";

// --- Утилитарные функции (без изменений) ---
const filterChoosetWords = (dictList) => {
    return dictList.flatMap(dictItem =>
        dictItem.words.filter(word => word?.gameData?.isChoosedToGame)
    );
};

const getRandomWord = (wordsToGame, guessedWords = []) => {
    const unguessedWords = wordsToGame.filter(word => !guessedWords.some(guessed => guessed.id === word.id));
    if (unguessedWords.length === 0) {
        return null;
    }
    return unguessedWords[Math.floor(Math.random() * unguessedWords.length)];
};


const getStatusColor = (status, theme) => {
    switch (status) {
        case 'CORRECT':
            return theme.colors.correct;
        case 'INCORRECT':
            return theme.colors.incorrect;
        default:
            return theme.colors.background;
    }
};

const GameWrapper = styled.section`
    // ... без изменений
    width: 100%;
    //max-width: 500px;
    height: 100%;
    box-sizing: border-box;
    padding: 20px;
    border-radius: 20px;
    background-color: ${({ status, theme }) => getStatusColor(status, theme)};
    color: ${({ theme }) => theme.colors.text};
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
    transition: background-color 0.5s ease;
    box-shadow: ${({ theme }) => theme.shadow};
`;

const CurrentWordTranslate = styled.h2`
    // ... без изменений
    margin: 0;
    padding: 15px 30px;
    border-radius: 15px;
    font-size: 38px;
    background-color: ${({ theme }) => theme.colors.card};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 500;
    text-align: center;
`;

const GameForm = styled.form`
    // ... без изменений
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    width: 100%;
`;

const WordInput = styled.input`
    // ... без изменений
    font-size: 22px;
    padding: 10px 15px;
    border: 2px solid transparent;
    border-radius: 10px;
    width: 80%;
    text-align: center;
    background-color: ${({ theme }) => theme.colors.inputBg};
    color: ${({ theme }) => theme.colors.inputText};
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

// ИЗМЕНЕНИЕ 1: Добавлено `white-space: pre-wrap` для корректного переноса строк
const HelperTextWrapper = styled.p`
    margin: 0;
    min-height: 24px;
    font-size: 16px;
    padding: 5px 15px;
    border-radius: 10px;
    color: ${({ theme }) => theme.colors.text};
    opacity: ${({ show }) => show ? 1 : 0};
    transition: opacity 0.3s ease;
    text-align: center;
    white-space: pre-wrap; /* Это свойство позволит \n создавать новую строку */
`;

const StatsDisplay = styled.div`
    // ... без изменений
    font-size: 16px;
    color: ${({ theme }) => theme.colors.text};
    opacity: 0.8;
`;

const GameButton = styled.button`
    // ... без изменений
    font-size: 20px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primaryText};
    padding: 10px 25px;
    border: none;
    cursor: pointer;
    border-radius: 15px;
    font-weight: bold;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
`;

const FinishedWrapper = styled.div`
    // ... без изменений
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    text-align: center;
`;

// --- Логика компонента с useReducer ---

const initialState = {
    status: 'ASKING', // ASKING, CORRECT, INCORRECT, FINISHED
    currentWord: null,
    guessedWords: [],
    mistakes: 0,
    helperText: '',
};

function gameReducer(state, action) {
    switch (action.type) {
        case 'INIT_GAME': {
            // ... без изменений
            const firstWord = getRandomWord(action.payload.wordsToGame);
            if (!firstWord) {
                return { ...state, status: 'FINISHED' };
            }
            return {
                ...initialState,
                currentWord: firstWord,
                helperText: action.payload.initialHelpText
            };
        }
        case 'SUBMIT_ANSWER': {
            const { answer, correctTranslation, correctText, mistakeText } = action.payload;
            const isCorrect = answer.toLowerCase().trim() === correctTranslation.toLowerCase().trim();

            if (isCorrect) {
                // ... без изменений
                const newGuessedWords = state.status === 'ASKING'
                    ? [...state.guessedWords, state.currentWord]
                    : state.guessedWords;
                const isGameFinished = newGuessedWords.length === action.payload.totalWords;
                return {
                    ...state,
                    status: isGameFinished ? 'FINISHED' : 'CORRECT',
                    guessedWords: newGuessedWords,
                    helperText: correctText,
                };
            } else {
                // ИЗМЕНЕНИЕ 3: Главная логика добавления описания
                if (state.status === 'ASKING') {
                    // Извлекаем язык из payload, который мы передадим в handleSubmit
                    const { currentLanguage } = action.payload;
                    const wordDescription = state.currentWord?.description;

                    // Проверяем наличие описания для текущего языка.
                    // Based on your store logic, it could be nested. This handles both cases.
                    const descriptionText = wordDescription?.description?.[currentLanguage] || wordDescription?.[currentLanguage] || '';

                    let fullHelperText = `${mistakeText} ${correctTranslation}`;

                    // Если текст описания не пустой, добавляем его к подсказке
                    if (descriptionText.trim() !== '') {
                        fullHelperText += `\n\nОписание: ${descriptionText}`;
                    }

                    return {
                        ...state,
                        status: 'INCORRECT',
                        mistakes: state.mistakes + 1,
                        helperText: fullHelperText, // Используем новую подсказку с описанием
                    };
                }
                return state;
            }
        }
        case 'NEXT_WORD': {
            // ... без изменений
            const nextWord = getRandomWord(action.payload.wordsToGame, state.guessedWords);
            return {
                ...state,
                status: 'ASKING',
                currentWord: nextWord,
                helperText: action.payload.initialHelpText,
            };
        }
        case 'RESET_FOR_NEW_GAME': {
            // ... без изменений
            const firstWord = getRandomWord(action.payload.wordsToGame);
            return {
                ...initialState,
                currentWord: firstWord,
                helperText: action.payload.initialHelpText,
            };
        }
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}


export const Game = ({ setGameState }) => {
    // ... хуки и константы без изменений
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const dictList = useWordsStore((state) => state.dictList);
    const toggleChooseToGame = useWordsStore((state) => state.toggleChooseToGame);
    const wordsToGame = useMemo(() => filterChoosetWords(dictList), [dictList]);
    const [inputValue, setInputValue] = useState('');
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { status, currentWord, guessedWords, mistakes, helperText } = state;
    const inputRef = useRef(null);

    // ... useEffect'ы без изменений
    useEffect(() => {
        if (wordsToGame.length > 0) {
            dispatch({
                type: 'INIT_GAME',
                payload: {
                    wordsToGame,
                    initialHelpText: interfaceTranslate[currentLanguage].enterTranslationBelow,
                }
            });
        }
    }, [wordsToGame, currentLanguage]);

    useEffect(() => {
        if (status === 'CORRECT') {
            const timer = setTimeout(() => {
                dispatch({
                    type: 'NEXT_WORD',
                    payload: {
                        wordsToGame,
                        initialHelpText: interfaceTranslate[currentLanguage].enterTranslationBelow,
                    }
                });
                setInputValue('');
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [status, wordsToGame, currentLanguage]);

    useEffect(() => {
        if (status === 'ASKING' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [status]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!['ASKING', 'INCORRECT'].includes(status)) return;

        dispatch({
            type: 'SUBMIT_ANSWER',
            payload: {
                answer: inputValue,
                correctTranslation: currentWord.translate?.no?.[0] || '',
                totalWords: wordsToGame.length,
                correctText: interfaceTranslate[currentLanguage].correctly,
                mistakeText: interfaceTranslate[currentLanguage].mistake,
                // ИЗМЕНЕНИЕ 2: Передаем currentLanguage в action
                currentLanguage: currentLanguage,
            },
        });

        if (inputValue.toLowerCase().trim() !== (currentWord.translate?.no?.[0] || '').toLowerCase().trim()) {
            setInputValue('');
        }
    };

    // ... остальные функции и JSX без изменений
    const handleRestart = () => {
        dispatch({
            type: 'RESET_FOR_NEW_GAME',
            payload: {
                wordsToGame,
                initialHelpText: interfaceTranslate[currentLanguage].enterTranslationBelow,
            }
        });
    };

    const handleBackToSelection = () => {
        wordsToGame.forEach(word => toggleChooseToGame(word.id));
        setGameState('chooseWords');
    };

    if (wordsToGame.length === 0 || !currentWord) {
        return (
            <ThemeProvider theme={theme}>
                <GameWrapper status="ASKING">
                    <p>{interfaceTranslate[currentLanguage].noWordsToPlay}</p>
                    <GameButton onClick={() => setGameState('chooseWords')}>
                        {interfaceTranslate[currentLanguage].backToWordSelection}
                    </GameButton>
                </GameWrapper>
            </ThemeProvider>
        );
    }

    const displayWord = currentWord.translate[currentLanguage]?.join(', ') || '';
    const capitalizedDisplayWord = displayWord.charAt(0).toUpperCase() + displayWord.slice(1);

    return (
        <ThemeProvider theme={theme}>
            <GameWrapper status={status}>
                {status !== 'FINISHED' ? (
                    <>
                        <HelperTextWrapper show={helperText}>
                            {helperText}
                        </HelperTextWrapper>

                        <CurrentWordTranslate>
                            {capitalizedDisplayWord}
                        </CurrentWordTranslate>

                        <GameForm onSubmit={handleSubmit}>
                            <WordInput
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={interfaceTranslate[currentLanguage].yourAnswer}
                                disabled={status === 'CORRECT'}
                            />
                        </GameForm>

                        <StatsDisplay>
                            {`${interfaceTranslate[currentLanguage].guessedStats[0]} ${guessedWords.length} ${interfaceTranslate[currentLanguage].guessedStats[1]} ${wordsToGame.length}`}
                        </StatsDisplay>

                        <StatsDisplay>
                            {`${interfaceTranslate[currentLanguage].mistakesMade} ${mistakes}.`}
                        </StatsDisplay>
                    </>
                ) : (
                    <FinishedWrapper>
                        <h2>{interfaceTranslate[currentLanguage].gameFinished}</h2>
                        <StatsDisplay>
                            {`${interfaceTranslate[currentLanguage].finalScore} ${guessedWords.length} / ${wordsToGame.length}`}
                        </StatsDisplay>
                        <StatsDisplay>
                            {`${interfaceTranslate[currentLanguage].mistakesMade} ${mistakes}.`}
                        </StatsDisplay>
                        <GameButton onClick={handleRestart}>
                            {interfaceTranslate[currentLanguage].playAgain}
                        </GameButton>
                        <GameButton onClick={handleBackToSelection}>
                            {interfaceTranslate[currentLanguage].backToWordSelection}
                        </GameButton>
                    </FinishedWrapper>
                )}
            </GameWrapper>
        </ThemeProvider>
    );
};