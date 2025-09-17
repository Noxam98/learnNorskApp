import styled from "styled-components";
import { useEffect, useState } from "react";
import { WordItem } from "./wordToChoose";
import { useWordsStore } from "../../store/wordStore";
import {useSystemStore} from "../../store/systemStore.jsx";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";


const DictTitle = styled.div`
  &:hover {
    background-color: #3c3c3c;
    color: white;
    transition: 0.1s;
  }
    box-sizing: border-box;
    
    display: flex; 
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 20px;
  background-color: #cdcdcd;
  border-radius: 10px;
  padding: 5px;
  cursor: pointer;
`;

const ItemWrapper = styled.div`
  border: 1px solid #b0c4de;
  /* border-width: 0 0 1px; */
  display: flex;
  flex-direction: column;
  /* padding: 5px; */
    box-sizing: border-box;
    
  border-radius: 11px;
  gap: 5px;
  justify-content: center;
`;

const WordsWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 6px;
    flex-wrap: wrap;
    border-radius: 6px;
    background-color: aliceblue;
    padding: 6px 4px;
    box-sizing: border-box;
`;

const ToolsWrapper = styled.div`
    gap: 5px;
    display: flex;
    flex-direction: row;
    background-color: #c6c6c6;
    width: max-content;
    padding: 4px 5px 4px 5px;
    border-radius: 16px;
    box-sizing: border-box;

    justify-content: end;
`

const ToolsButton = styled.button`
    font-size: 14px;
    background-color: #ffc880;
    color: white;
    padding: 3px 8px;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    box-sizing: border-box;

    &:hover {
        background-color: #9aa3a6;
    }
`
export const DictItem = ({ dictName, wordList }) => {
  const [IsOpened, setIsOpened] = useState(false);
  const selectFullDictToGame = useWordsStore(state => state.selectFullDictToGame)
  const [setCurrentLanguage, currentLanguage] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);
  if (wordList.length == 0) return <></>
  return (
    <ItemWrapper>
      <DictTitle onClick={() => setIsOpened((prev) => !prev)}>
        {dictName}
          {
              IsOpened &&
              <ToolsWrapper>
                  <ToolsButton onClick={(e)=>{ e.stopPropagation(); selectFullDictToGame(dictName, true)}}>{interfaceTranslate[currentLanguage].chooseAll}</ToolsButton>
                  <ToolsButton onClick={(e)=>{e.stopPropagation(); selectFullDictToGame(dictName, false)}}>{interfaceTranslate[currentLanguage].cancelChoosingAll}</ToolsButton>
              </ToolsWrapper>
          }

      </DictTitle>

      {IsOpened && wordList.length > 0 &&(
        <WordsWrapper>

          {
              wordList.map((wordItem) => (
            <WordItem key={wordItem.id} wordItem={wordItem} />
          ))  }
        </WordsWrapper>
      )}
    </ItemWrapper>
  );
};
