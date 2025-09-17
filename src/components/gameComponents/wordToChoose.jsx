// ============== wordToChoose.jsx ==============
import React, { useCallback } from "react";
import styled from "styled-components";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";

const WordWrapper = styled.div`
    padding: 4px 8px;
    border-radius: 8px;
    background-color: ${({ isChoosed, theme }) => isChoosed ? theme.colors.wordSelectedBg : theme.colors.wordBg};
    color: ${({ theme }) => theme.colors.text};
    border: 4px solid ${({ isChoosed, theme }) => isChoosed ? theme.colors.wordSelectedAccent : 'transparent'};
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    user-select: none; /* Запрещаем выделение текста */

    &:hover {
        background-color: ${({ theme }) => theme.colors.wordSelectedBg};
    }
`;

const TranslateWrapper = styled.span`
    opacity: 0.8;
`;

// Используем React.memo для оптимизации. Компонент будет перерисовываться
// только если изменятся его пропсы (wordItem). Это очень важно для длинных списков.
export const WordItem = React.memo(({ wordItem }) => {
    const toggleChooseToGame = useWordsStore((state) => state.ToggleChooseToGame);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);

    const handleToggle = useCallback(() => {
        toggleChooseToGame(wordItem.id);
    }, [wordItem.id, toggleChooseToGame]);

    return (
        <WordWrapper onClick={handleToggle} isChoosed={wordItem?.gameData?.isChoosedToGame} theme={theme}>
            {wordItem.translate?.no?.[0]}
            {" - "}
            <TranslateWrapper>
                {wordItem.translate[currentLanguage]?.join(', ')}
            </TranslateWrapper>
        </WordWrapper>
    );
});


// ============== dictItem.jsx ==============
import { useState } from "react";
// import { WordItem } from "./wordToChoose"; // Уже импортировано выше
// import { useWordsStore } from "../../store/wordStore";
// import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import {theme} from "./theme.js";

const DictWrapper = styled.div`
    background-color: ${({ theme }) => theme.colors.card};
    border-radius: ${({ theme }) => theme.borderRadius};
    box-shadow: ${({ theme }) => theme.shadow};
    overflow: hidden; /* Важно для анимации высоты */
`;

const DictTitle = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    font-weight: bold;
    font-size: 20px;
    color: ${({ theme }) => theme.colors.text};
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: #5a6678;
    }
`;

const ChevronIcon = styled.span`
    font-size: 24px;
    transition: transform 0.3s ease;
    transform: ${({ isOpened }) => (isOpened ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const Toolbar = styled.div`
    display: flex;
    gap: 8px;
`;

const ToolButton = styled.button`
    font-size: 14px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primaryText};
    padding: 4px 10px;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    font-weight: bold;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: #ffde99;
    }
`;

const WordsContainer = styled.div`
    max-height: ${({ isOpened, contentHeight }) => (isOpened ? `${contentHeight}px` : '0')};
    overflow: hidden;
    transition: max-height 0.4s ease-in-out;
`;

const WordsGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 16px;
    background-color: #3e4a59; /* Немного другой фон для слов */
`;

export const DictItem = ({ dictName, wordList }) => {
    const [isOpened, setIsOpened] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const selectFullDictToGame = useWordsStore(state => state.selectFullDictToGame);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);

    const wordsWrapperRef = React.useRef(null);

    // Вычисляем высоту контента для плавной анимации
    React.useEffect(() => {
        if (wordsWrapperRef.current) {
            setContentHeight(wordsWrapperRef.current.scrollHeight);
        }
    }, [wordList]);

    const handleToggleOpen = useCallback(() => setIsOpened(prev => !prev), []);

    const handleSelectAll = useCallback((e) => {
        e.stopPropagation();
        selectFullDictToGame(dictName, true);
    }, [dictName, selectFullDictToGame]);

    const handleDeselectAll = useCallback((e) => {
        e.stopPropagation();
        selectFullDictToGame(dictName, false);
    }, [dictName, selectFullDictToGame]);

    if (wordList.length === 0) return null;

    return (
        <DictWrapper theme={theme}>
            <DictTitle onClick={handleToggleOpen} theme={theme}>
                <span>{dictName}</span>
                <Toolbar>
                    {isOpened && (
                        <>
                            <ToolButton onClick={handleSelectAll} theme={theme}>{interfaceTranslate[currentLanguage].chooseAll}</ToolButton>
                            <ToolButton onClick={handleDeselectAll} theme={theme}>{interfaceTranslate[currentLanguage].cancelChoosingAll}</ToolButton>
                        </>
                    )}
                    <ChevronIcon isOpened={isOpened}>▼</ChevronIcon>
                </Toolbar>
            </DictTitle>
            <WordsContainer isOpened={isOpened} contentHeight={contentHeight}>
                <WordsGrid ref={wordsWrapperRef}>
                    {wordList.map((wordItem) => (
                        <WordItem key={wordItem.id} wordItem={wordItem} />
                    ))}
                </WordsGrid>
            </WordsContainer>
        </DictWrapper>
    );
};