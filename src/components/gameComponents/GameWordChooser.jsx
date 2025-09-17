import { useMemo } from "react";
import {theme} from "./theme.js";
import styled, {keyframes} from "styled-components";
import {useWordsStore} from "../../store/wordStore.jsx";
import {useSystemStore} from "../../store/systemStore.jsx";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";
import {DictItem} from "./dictItem.jsx";

const ChooserWrapper = styled.section`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Header = styled.header`
    color: ${({ theme }) => theme.colors.text};
    h1 {
        margin: 0;
        font-size: 28px;
    }
    p {
        margin: 5px 0 0;
        font-size: 16px;
        color: #b0c4de;
    }
`;

const DictList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadow};
`;

const glowAnimation = keyframes`
    0% { box-shadow: 0 0 5px #ffd502; }
    50% { box-shadow: 0 0 20px #ffc880, 0 0 30px #ffd502; }
    100% { box-shadow: 0 0 5px #ffd502; }
`;

const StartGameButton = styled.button`
    padding: 12px 30px;
    font-size: 22px;
    font-weight: bold;
    border: none;
    border-radius: ${({ theme }) => theme.borderRadius};
    cursor: pointer;
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primaryText};
    transition: background-color 0.2s ease, transform 0.2s ease;
    animation: ${glowAnimation} 3s infinite linear;

    &:hover:not(:disabled) {
        transform: scale(1.05);
    }
    
    &:disabled {
        background-color: ${({ theme }) => theme.colors.disabled};
        color: #5e5e5e;
        cursor: not-allowed;
        animation: none;
        transform: scale(1);
    }
`;

const WordCounter = styled.p`
    font-size: 16px;
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
`;

const filterChoosedWords = (dictList) => {
  return dictList.reduce((acc, dictItem) =>
          acc + dictItem.words.filter(word => word?.gameData?.isChoosedToGame).length,
      0);
};

export const GameWordChooser = ({ setGameState }) => {
  const dictList = useWordsStore((state) => state.dictList);
  const currentLanguage = useSystemStore((state) => state.currentLanguage);

  // Используем useMemo для оптимизации: счетчик будет пересчитываться
  // только при изменении dictList, а не при каждом рендере.
  const chosenWordsCount = useMemo(() => filterChoosedWords(dictList), [dictList]);

  return (
      <ChooserWrapper>
        <Header theme={theme}>
          <h1>{interfaceTranslate[currentLanguage].wordSelection}</h1>
          <p>{interfaceTranslate[currentLanguage].selectWordsForGame}</p>
        </Header>
        <Footer theme={theme}>

          <StartGameButton
              onClick={() => setGameState('playing')}
              disabled={chosenWordsCount < 10}
              theme={theme}
          >
            {interfaceTranslate[currentLanguage].startGame}
          </StartGameButton>
          {chosenWordsCount < 10 && (
              <WordCounter theme={theme}>
                {`${interfaceTranslate[currentLanguage].chooseMinWords} ${10 - chosenWordsCount}`}
              </WordCounter>
          )}
        </Footer>
        <DictList>
          {dictList.map((dictItem) => (
              <DictItem key={dictItem.dictName} dictName={dictItem.dictName} wordList={dictItem.words} />
          ))}
        </DictList>


      </ChooserWrapper>
  );
};