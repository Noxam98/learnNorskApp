import React, { useState } from 'react';
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import LANG_ICON from "../assets/language_icon.svg";
import { useSystemStore } from "../store/systemStore.jsx";
import { device } from "../interface/screenSizes.js";

const languages = {
    ukr: "Українська",
    ru: "Русский",
    pl: "Polski",
    lt: "Lietuvių",
    en: "English",
};

const LanguagesBlock = styled.div`
    position: relative;
    min-width: 60px;
`;

const LanguageItem = styled.div`
    display: flex;
    background-color: #95a3a6;
    padding: 6px 6px;
    min-width: max-content;
    cursor: pointer;
`;

const CurrentLanguage = styled(LanguageItem)`
    display: flex;
    gap: 3px;
    justify-content: center;
    align-items: center;
    border-radius: ${({ isOpen }) => isOpen ? '16px 0 0 0' : "16px 0 0 16px"};
    border-right: 3px solid #cacaca;
    transition: .3s;
    color: white;
    padding: 4px 6px;
    height: 100%;
    box-sizing: border-box;
`;


const LanguagesWrapper = styled(motion.div)`
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
    border-radius: 0 0 6px 6px;
    border: 1px solid darkgray;
`;

const LanguageChooser = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [setCurrentLanguage, currentLanguage] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);

    return (
        <LanguagesBlock>
            <AnimatePresence>
                {isOpen && (
                    <LanguagesWrapper
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsOpen(false)}
                    >
                        {Object.entries(languages).map(([code, name]) => (
                            <LanguageItem key={code} onClick={() => setCurrentLanguage(code)}>
                                {code.toUpperCase()} | {name}
                            </LanguageItem>
                        ))}
                    </LanguagesWrapper>
                )}
            </AnimatePresence>

            <CurrentLanguage isOpen={isOpen} onClick={() => setIsOpen(prev => !prev)}>
                <img src={LANG_ICON} style={{ padding: '2px' }} width={'20px'} />
                {currentLanguage.toUpperCase()}
            </CurrentLanguage>

        </LanguagesBlock>
    );
};

export default LanguageChooser;
