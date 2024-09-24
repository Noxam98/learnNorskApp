import { useRef, useState } from "react";

import { TextArea, FetchButton } from "../styled";
import { interfaceTranslate } from "../interface/interfaceTranslation";
import { fetchWord } from "../openaiFetcher";
import { Card } from "../components/wordListComponents/WordCard";
import styled from "styled-components";
import { DictChooser } from "../components/wordListComponents/DictChooser";
import exportFromJSON from 'export-from-json'

import { Loader } from "../components/loadingComponent";
import { useWordsStore } from "../store/wordStore";
import { WordTools } from "../components/wordListComponents/wordTools";

const CardsWrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 5px;
    
    flex-wrap: wrap;
    border: 3px solid #cacaca;
    padding: 6px;
    box-sizing: border-box;
    margin-bottom: 10px;
    border-radius: 6px;
`

const ToolsWrapper = styled(CardsWrapper)`
  justify-content: space-between;
  align-items: center;
  

`

const FlexWrapper = styled.div`
  display: flex;
  gap: 5px;
  flex-direction: ${({column}) => column? 'column' : 'row'};
`

const ToolsButton = styled.button`
  padding: 4px;
  background-color: #eec28b;
  cursor: pointer;
  width: max-content;
  border: 2px solid #4e5151;
  border-radius: 6px;
  position: relative;
  user-select: none;
  height: min-content;
`      


export const WordListPage = ()=>{
    const dictName = useWordsStore((state) => state.currentDictName)
    const wordList = useWordsStore((state)=> state.dictList.filter(dict => dict.dictName === dictName)[0].words)
    const addWords = useWordsStore((state) => state.addWords)

    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [languageTranslate, setLanguageTranslate] = useState("ru");
    const [error, setError] = useState("");
    const inputRef = useRef();
    return (
        <>
          
          {isLoading && <Loader text={interfaceTranslate[languageTranslate].fetching}/>}
          <ToolsWrapper>
            <DictChooser/>
            <WordTools/>
          </ToolsWrapper>
          {JSON.stringify(error)}
          <CardsWrapper>
            {
              wordList.length
                ? wordList?.map((wordItem) => {
                    return <Card key={wordItem.id} languageTranslate={languageTranslate} wordItem={wordItem}></Card>;
                  })
                : interfaceTranslate.ru.addWordsHere
            }
            
          </CardsWrapper>
          <TextArea
            ref={inputRef}
            contentEditable="plaintext-only"
            placeholder={`${
              prompt ? "" : interfaceTranslate[languageTranslate].inputPlaceholder
            }`}
            value={prompt}
            onInput={(e) => {
              setPrompt(e.currentTarget.textContent);
            }}
            onKeyDown={(e) => {
              console.log(e);
            }}
          ></TextArea>
          <FetchButton
            onClick={async () => {
                setIsLoading(true)
                const fetchingResult = await fetchWord(
                languageTranslate,
                prompt,
                );
                if (fetchingResult.error){
                  console.log('error: --------------------------');
                  
                    setError(error)
                } else{
                    addWords(dictName, fetchingResult.words)
                    setPrompt('')
                    inputRef.current.innerText=''
                    inputRef.current.focus()

                }
                console.log(fetchingResult);
                setIsLoading(false)
            }}
          >
            {interfaceTranslate[languageTranslate].addWord}
          </FetchButton>
        </>
      );
}