import { useEffect } from "react";
import { useWordsStore } from "../../store/wordStore"; 
import { DictItem } from "./dictItem";
import styled, { keyframes } from "styled-components";

const Wrapper = styled.section`
  display: flex;
  justify-content: end;
  flex-direction: column;
  gap: 10px;
`

let boxShadow = 300;
setInterval(()=>boxShadow+=Math.round(Math.random()*5-2.5), 500)

const buttonAnimation = keyframes`
 50% {
    background: skyblue;
    box-shadow: ${boxShadow}px -${boxShadow}px ${boxShadow}px -${boxShadow}px orange inset;
    color: #e8f405;
  }

`

const StartGameButton = styled.button`
  width: min-content(70%, 200px);
  padding: 6px 10px;
  font-size: 20px;
  
  border: none;
  cursor: pointer;
  background: gold;
  box-shadow: 0 -25px 45px -50px crimson inset;
  animation: ${buttonAnimation} 3s infinite alternate;
  &:disabled{
    background-color: #8d8d8d;
    cursor: not-allowed;
    color: #5e5e5e;
    
  box-shadow: none;
  animation: none;
  }
  &:hover{
    background: gold;
    box-shadow: 0 -25px 45px -50px crimson inset;
    animation: none;
  }
   
  background-color: #a49558;
  border-radius: 16px;
  font-weight: 700;
  color: white;
`


const filterChoosetWords = (dictList) => {
  const filteredList = []
  for (const dictItem of dictList){
    for (const word of dictItem.words){
      if (word.gameData.isChoosedToGame){
        filteredList.push(word)
      }
    }
  }
  return filteredList
}

export const GameWordChooser = ({setGameState}) => {
  const dictList = useWordsStore((state) => state.dictList);
  const choosedToGameWords = filterChoosetWords(dictList)

  return (
    <Wrapper>
      <StartGameButton onClick={()=>setGameState('playing')} disabled={(choosedToGameWords.length < 10)}>Начать играть</StartGameButton>
      {`Выберите минимум 10 слов. Выбрано сейчас: ${choosedToGameWords.length}. `}
      {dictList.map((dictItem) =>(
          <>
            <DictItem dictName={dictItem.dictName} wordList={dictItem.words}/>
          </>
    )
      )}
    </Wrapper>
  );
};
