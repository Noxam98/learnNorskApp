import React from 'react';
import styled from "styled-components";
import {useSystemStore} from "../../store/systemStore.jsx";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";

// НОВОЕ: Стили для оверлея
const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw; /* На всю ширину viewport */
    height: 100vh; /* На всю высоту viewport */
    background-color: rgba(0, 0, 0, 0.5); /* Полупрозрачный черный */
    z-index: 2; /* Должен быть ниже модального окна, но выше остального контента */
`;

const ModalWindowWrapper = styled.div`
    width: min(400px, 100%);
    min-height: min(300px, 100%);
    background-color: #e9f2fa;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 15px;
    border: 5px solid #a1a1a1;
    z-index: 3; /* z-index выше, чем у оверлея */
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
`;

const Button = styled.button`
    width: 120px;
    height: 40px;
    color: white;
    background-color: #fdaa56;
    cursor: pointer;
    border: none;
    border-radius: 5px;
    font-weight: bold;

    &:hover {
        background-color: #ff9225;
    }
`;

const ContentWrapper = styled.div`
    flex: 1;
    padding: 10px;
`;

const ButtonsWrapper = styled.div`
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 10px;
`;

const ModalWindow = ({ onConfirm, onCancel, children, confirmation = true }) => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);

    return (
        // ИЗМЕНЕНО: Оборачиваем все в React.Fragment
        <>
            {/* НОВОЕ: Добавляем оверлей с функцией закрытия по клику */}
            <Overlay onClick={onCancel} />

            <ModalWindowWrapper>
                <ContentWrapper>
                    {children || "Вы уверены?"}
                </ContentWrapper>
                {
                    confirmation ?
                        <ButtonsWrapper>
                            <Button onClick={onCancel}>{interfaceTranslate[currentLanguage].no}</Button>
                            <Button onClick={onConfirm}>{interfaceTranslate[currentLanguage].yes}</Button>
                        </ButtonsWrapper>
                        :
                        // ИЗМЕНЕНО: Добавляем обертку для одной кнопки для консистентности
                        <ButtonsWrapper>
                            <Button onClick={onCancel}>{interfaceTranslate[currentLanguage].cancel}</Button>
                        </ButtonsWrapper>
                }
            </ModalWindowWrapper>
        </>
    );
};

export default ModalWindow;