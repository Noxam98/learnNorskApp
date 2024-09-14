import styled from "styled-components";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useState } from "react";
import { WordTools } from "./wordTools";
import { useWordsStore } from "../../store/wordStore";
import exportFromJSON from 'export-from-json'
const ComponentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  /* margin-bottom: 10px; */
  border: 1px solid #878787;
  padding: 2px;
  border-radius: 6px;
  width: max-content;

  align-items: center;
  ${({ expand }) =>
    expand &&
  `
        &::before{
            content: "";
            z-index: 1;
            width: 100vw;
            height: 100vh;
            position: fixed;
            cursor: pointer;
            top: 0;
            left: 0;
            background-color: #7272727f; 
        }
    `}
`;

const CurrentDictItemWrapper = styled.div`
  padding: 4px;
  background-color: #899495;
  cursor: pointer;
  width: max-content;
  border: 2px solid #4e5151;
  border-radius: 6px;
  position: relative;
  user-select: none;
`;

const DictItemWrapper = styled.div`
  padding: 4px;
  background-color: #899495;
  cursor: pointer;
  border-radius: 6px;
  position: relative;
  user-select: none;
`;

const DeleteButton = styled.div`
    &::after{
        content: '+';
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background-color: #a45454;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        rotate: 45deg;
        top: 50%;
        right: -5px;
        transform: translate(-75%);
        font-size: 20px;
        position: absolute;
    }
`

const DictVariantsWrapper = styled.div`
  padding: 4px;
  z-index: 1;
  border: 2px solid #4e5151;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  min-width: 250px;
  gap: 3px;
  position: absolute;
  left: 50%;
  transform: translateX(-70%);
  max-height: 200px;
  overflow-y: auto;
  cursor: auto;
  background-color: #c8f4f4;
  top: calc(100% + 10px);
`;

const Relative = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  height: auto;
  gap: 5px;
` 

const Input = styled.input`
  border-radius: 6px;
  border-color: #a0aaae;
  background-color: #c9e1ea;
  padding: 3px;
  font-weight: 500;
  width: auto;
  /* margin-right: 60px; */
  border: 1 px solid white;
`;

const ButtonSave = styled.button`
    width: 100%;
    border-radius: 6px;
    border: 1 px solid white;
    cursor: pointer;

`

export const DictChooser = () => {
  const currentDictName = useWordsStore((state) => state.currentDictName);
  const dictNames = useWordsStore((state) => state.dictNames);
  const addNewDict = useWordsStore((state) => state.addNewDict);
  const setCurrentDict = useWordsStore((state) => state.setCurrentDict);
  const removeDict = useWordsStore((state) => state.removeDict);
  
  const [newDictInput, setNewDictInput] = useState("");
  const [error, setError] = useState("");
  const [dictListOpened, setDictListOpened] = useState(false);
  return (
    <ComponentWrapper
      expand={dictListOpened ? 1 : 0}
      onClick={() => setDictListOpened((prev) => !prev)}
    >
      {interfaceTranslate.ru.currentDict}:
      <CurrentDictItemWrapper>
        {currentDictName === "default" ? "Общий словарь" : currentDictName}
        {dictListOpened && (
          <DictVariantsWrapper onClick={(e) => e.stopPropagation()}>
            {dictNames.map((dictName) => (
              <DictItemWrapper key={dictName} onClick={()=>setCurrentDict(dictName)}>
                {dictName === "default" ? "Общий словарь" : dictName}
                <DeleteButton onClick={e => e.stopPropagation()} onDoubleClick={()=>removeDict(dictName)}/>
              </DictItemWrapper>
            ))}
            <Relative>

            <Input
              type="text"
              value={newDictInput}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  if(newDictInput.trim()){
                    addNewDict(newDictInput.trim());
                    setDictListOpened(false);
                    setNewDictInput("");
                  }
                }
              }}
              onChange={(e) => setNewDictInput(e.target.value)}
              placeholder={interfaceTranslate.ru.newDict}
              />
              <ButtonSave onClick={
                (e) => {
                  if(newDictInput.trim()){
                    addNewDict(newDictInput.trim());
                    setDictListOpened(false);
                    setNewDictInput("");
                  }
                }
              }>Добавить</ButtonSave>
              </Relative>
          </DictVariantsWrapper>
        )}
      </CurrentDictItemWrapper>

    </ComponentWrapper>
  );
};
