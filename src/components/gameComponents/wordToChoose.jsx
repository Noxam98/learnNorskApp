import styled from "styled-components";
import { useWordsStore } from "../../store/wordStore";
const WordWrapper = styled.div`
  width: max-content;
  background-color: #5a889b;
  color: white;
  border-radius: 6px;
  padding: 3px 4px;
  cursor: pointer;
  position: relative;
  &::after{
    ${({isChoosed}) => isChoosed? 'content: ""' : ''};
    position: absolute;
    width: 100%;
    bottom: 0;
    height: 6px;
    left: 0px;
    background-color: #ffd502;
    opacity: .5;
    border-radius:  0 0 6px 6px;
  }
`;

const TranslateWrapper = styled.span`
`;

export const WordItem = ({ wordItem }) => {
  const ToggleChooseToGame = useWordsStore((state) => state.ToggleChooseToGame);

  
  return (
    <WordWrapper onClick={()=>ToggleChooseToGame(wordItem.id)} isChoosed={wordItem.gameData.isChoosedToGame}>
      {wordItem.word}
      {" - "}
      <TranslateWrapper>
        {wordItem.translate.ru.join(', ')}.
      </TranslateWrapper>
    </WordWrapper>
  );
};