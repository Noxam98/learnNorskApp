import React, {useState} from 'react';
import styled from "styled-components";
import LANG_ICON from "../assets/language_icon.svg"
import {useSystemStore} from "../store/systemStore.jsx";
const languages = {
    ru: "Русский",
    en: "English",
    ukr: "Українська",
    pl: "Polski",
    lt: "Lietuvių",
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
    border-radius: ${({isOpen}) => isOpen ? '8px 0 0 0' : "8px 0 0 8px"};
    border-right: 2px solid #cacaca;
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
            isOpen?
                <>
                    <CurrentLanguage isOpen={isOpen} onClick={() => setIsOpen(prevState => !prevState)}>
                        <img src={LANG_ICON} style={{padding:'2px'}} width={'20px'}/>

                        {languages[currentLanguage]}
                    </CurrentLanguage>
                    <LanguagesWrapper onClick={() => setIsOpen(prevState => !prevState)}>

                        {Object.entries(languages).map((i, langEntry)=>{
                            return <LanguageItem onClick={()=>{setCurrentLanguage(i[0])}} key={i[0]}>{i[1]}</LanguageItem>
                        })}

                    </LanguagesWrapper>
                </>

                :
                <CurrentLanguage onClick={() => setIsOpen(prevState => !prevState)}>
                    <img src={LANG_ICON} style={{padding:'2px'}} width={'20px'}/>
                    {languages[currentLanguage]}
                </CurrentLanguage>
        }

        </LanguagesBlock>

    );
};

export default LanguageChooser;