import styled, { keyframes } from "styled-components";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useState } from "react";
import { WordEditWindow } from "./editWordWindow";
// ИЗМЕНЕНО: Импортируем ваш универсальный ModalWindow
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import ModalWindow from "../tools/modalWindow.jsx";

// --- Стили --- (PartOfSpeech, WordCard, StatusIndicator, Loader, ButtonsContainer, BaseButton, EditButton, DescriptionButton без изменений)

export const PartOfSpeech = styled.div`
    position: absolute;
    bottom: 2px;
    font-size: 10px;
    left: 5px;
    border-radius: 5px;
    padding: 0px 5px;
    color: black;
    background-color: ${(
            { pos }
    ) =>
            pos === "phrase"
                    ? "#c0ebf2"
                    : pos === "substantiv"
                            ? "#c0f2ca"
                            : pos === "verb"
                                    ? "#eec97a"
                                    : pos === "adjective"
                                            ? "#a8aaf7"
                                            : "#f7ffad"};
`;

export const WordCard = styled.div`
    display: flex;
    color: #ffffff;
    background-color: #628eaf;
    flex-direction: row;
    white-space: nowrap;
    gap: 5px;
    border-radius: 4px;
    width: max-content;
    padding: 3px 25px 14px 10px;
    user-select: none;
    position: relative;
    cursor: pointer;

    &::before {
        position: absolute;
        right: 0px;
        bottom: 0px;
        border-radius: 0 0 4px 4px;
        width: 100%;
        height: 8px;
        background-color: #eaa340;
        ${({isSelected}) => isSelected && 'content: "";'}
    }

    &:hover {
        &::after {
            position: absolute;
            right: 0px;
            bottom: 0px;
            border-radius: 0 0 4px 4px;
            width: 100%;
            height: 8px;
            background-color: #eaa34026;
            content: "";
        }
    }

    @media (max-width: 730px) {
        font-size: 12px;
        white-space: normal;
    }
`;

const StatusIndicator = styled.div`
    position: absolute;
    //top: 2px;
    top: 50%;
    transform: translateY(-50%);
    right: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;

    ${({ status }) => status === 'error' && `
    background-color: #e74c3c;
    color: white;
    font-size: 12px;
    font-weight: bold;
    cursor: help;
  `}
`;

const rotate = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const Loader = styled.div`
    border: 5px solid rgba(255, 255, 255, 0.3);
    border-top: 5px solid #fff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: ${rotate} 0.8s linear infinite;
`;

const ButtonsContainer = styled.div`
    position: absolute;
    display: flex;
    gap: 4px;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
`;

const BaseButton = styled.button`
    width: 25px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    border-radius: 4px;
    color: #979696;
    cursor: pointer;
    font-size: 15px;
    
    &:disabled {
        background-color: #b0b8bf;
        color: #7d8da1;
        cursor: not-allowed;
    }
`;

const EditButton = styled(BaseButton)`
    background-color: #fbe288;
    &:hover {
        background-color: #f3b20d;
        color: white;
    }
    &::after {
        content: "✎";
    }
`;

const DescriptionButton = styled(BaseButton)`
    background-color: #a8d8ea;
    &:hover:enabled {
        background-color: #3d8f9e;
        color: white;
    }
    &::after {
        content: "📖";
    }
`;

// --- НОВЫЕ СТИЛИ для содержимого модального окна ---
const DescriptionWrapper = styled.div`
    text-align: left;
    color: #343a40;
`;
const DescriptionTitle = styled.h3`
    text-align: center;
    margin-top: 0;
    margin-bottom: 20px;
`;



// --- Основной компонент ---
export const Card = ({ wordItem, languageTranslate }) => {
    const choseWord = useWordsStore((state) => state.choseWord);
    const [isHovered, setIsHovered] = useState(false);
    const [isWordEditing, setIsWordEdititng] = useState(false);
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const translations = interfaceTranslate[currentLanguage];

    const isDescriptionAvailable = wordItem.descriptionState === 'loaded';

    // НОВОЕ: Формируем JSX для описания, который передадим в модальное окно
    const descriptionContent = (
        <DescriptionWrapper>
            <DescriptionTitle>{wordItem.translate?.no?.[0]}</DescriptionTitle>

            {wordItem.description?.description && wordItem.description?.description[currentLanguage]}
        </DescriptionWrapper>
    );

    return (
        <>
            <WordCard
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                isSelected={wordItem?.techData?.isSelected ? 1 : 0}
                key={wordItem?.id}
                onClick={() => choseWord(wordItem?.id)}
            >
                {/* ... индикаторы загрузки и ошибки без изменений ... */}
                {wordItem.descriptionState === 'loading' && (
                    <StatusIndicator>
                        <Loader />
                    </StatusIndicator>
                )}


                <PartOfSpeech pos={wordItem?.part_of_speech}>
                    {wordItem?.part_of_speech}
                </PartOfSpeech>

                <div>{wordItem?.translate?.no?.[0]?.toLowerCase()}</div>-
                <div>{wordItem?.translate[languageTranslate]?.join(", ")}</div>

                {isHovered && (
                    <ButtonsContainer>
                        <DescriptionButton
                            disabled={!isDescriptionAvailable}
                            title={isDescriptionAvailable ? (translations.showDescription || "Show description") : (translations.noDescription || "No description")}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDescriptionVisible(true);
                            }}
                        />
                        <EditButton
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsWordEdititng(true);
                            }}
                        />
                    </ButtonsContainer>
                )}
            </WordCard>

            {isWordEditing && (
                <WordEditWindow
                    wordItem={wordItem}
                    languageTranslate={languageTranslate}
                    setIsWordEdititng={setIsWordEdititng}
                />
            )}

            {/* ИЗМЕНЕНО: Используем ваш ModalWindow */}
            {isDescriptionVisible && (
                <ModalWindow
                    onCancel={() => setIsDescriptionVisible(false)}
                    confirmation={false} // Указываем, что нужна только одна кнопка "Отмена/Закрыть"
                >
                    {descriptionContent}
                </ModalWindow>
            )}
        </>
    );
};