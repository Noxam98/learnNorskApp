import React from 'react';
import styled from "styled-components";
import {useSystemStore} from "../../store/systemStore.jsx";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";

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
    z-index: 3;
    padding: 10px;  
    box-sizing: border-box;
    display: flex;
    flex-direction: column; 
`

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
`

const ContentWrapper = styled.div`
    flex: 1; 
    padding: 10px;
`

const ButtonsWrapper = styled.div`
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 10px;
`

const ModalWindow = ({ onConfirm, onCancel, children, confirmation = true }) => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);

    return (

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
                    <Button onClick={onCancel}>{interfaceTranslate[currentLanguage].cancel}</Button>
            }

        </ModalWindowWrapper>
    );
};

export default ModalWindow;