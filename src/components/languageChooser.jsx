import React, {useState} from 'react';
import styled from "styled-components";
import LANG_ICON from "../assets/language_icon.svg"
import {useSystemStore} from "../store/systemStore.jsx";
const languages = {
    ukr: "Українська",
    ru: "Русский",
    pl: "Polski",
    lt: "Lietuvių",
    en: "English",
}

const LanguagesBlock = styled.div`
    position: relative;
    min-width: 150px;
`

const LanguageItem = styled.div`
    display: flex;
    background-color: #95a3a6;
    padding: 6px 6px;
    cursor: pointer;
`

const CurrentLanguage = styled(LanguageItem)`
    display: flex; 
    gap: 3px;
    justify-content: center;
    align-items: center;
    border-radius: ${({isOpen}) => isOpen ? '16px 0 0 0' : "16px 0 0 16px"};
    border-right: 3px solid #cacaca;
    color: white;
    padding: 4px 6px;
    height: 100%;
    box-sizing: border-box;
`

const LanguagesWrapper = styled.div`
    min-width: 100%;
    top: 100%;
    box-sizing: border-box;
    position: absolute;
    left: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 3px 2px;
    background-color: #cacaca;
    border-radius:0 0 6px 6px;
    border: 1px solid darkgray;
`

const LanguageChooser = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [setCurrentLanguage, currentLanguage] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);

    // const [currentLanguage, setCurrentLanguage] = React.useState('ukr');
    return (
        <LanguagesBlock>
        {
            isOpen &&
                <>

                    <LanguagesWrapper onClick={() => setIsOpen(prevState => !prevState)}>

                        {Object.entries(languages).map((i, langEntry)=>{
                            return <LanguageItem onClick={()=>{setCurrentLanguage(i[0])}} key={i[0]}>{i[0].toUpperCase()} | {i[1]}</LanguageItem>
                        })}

                    </LanguagesWrapper>
                </>
        }
            {
                <CurrentLanguage isOpen={isOpen} onClick={() => setIsOpen(prevState => !prevState)}>
                    <img src={LANG_ICON} style={{padding:'2px'}} width={'20px'}/>
                    {currentLanguage.toUpperCase()} | {languages[currentLanguage]}
                </CurrentLanguage>
            }
        </LanguagesBlock>

    );
};

export default LanguageChooser;