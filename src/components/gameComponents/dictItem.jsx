import styled from "styled-components";
import { useEffect, useState } from "react";
import { WordItem } from "./wordToChoose";
import { useWordsStore } from "../../store/wordStore";


const DictTitle = styled.div`
  &:hover {
    background-color: #3c3c3c;
    color: white;
    transition: 0.1s;
  }
  background-color: #cdcdcd;
  border-radius: 10px;
  padding: 5px;
  cursor: pointer;
`;

const ItemWrapper = styled.div`
  border: 1px solid black;
  /* border-width: 0 0 1px; */
  display: flex;
  flex-direction: column;
  /* padding: 5px; */
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
`;

const ToolsWrapper = styled.div`
  gap: 5px;
  display: flex;
  flex-direction: row;
  width: 100%;
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
`
export const DictItem = ({ dictName, wordList }) => {
  const [IsOpened, setIsOpened] = useState(false);
  const selectFullDictToGame = useWordsStore(state => state.selectFullDictToGame)

  return (
    <ItemWrapper>
      <DictTitle onClick={() => setIsOpened((prev) => !prev)}>
        {dictName}
      </DictTitle>

      {IsOpened && (
        <WordsWrapper>
          <ToolsWrapper>
            <ToolsButton onClick={()=>{selectFullDictToGame(dictName, true)}}>Выделить всё</ToolsButton>
            <ToolsButton onClick={()=>{selectFullDictToGame(dictName, false)}}>Снять выделение</ToolsButton>
          </ToolsWrapper>
          {wordList.map((wordItem) => (
            <WordItem key={wordItem.id} wordItem={wordItem} />
          ))}
        </WordsWrapper>
      )}
    </ItemWrapper>
  );
};
