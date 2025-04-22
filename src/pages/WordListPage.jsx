import { useRef, useState } from "react";

import { TextArea, FetchButton } from "../styled";
import { interfaceTranslate } from "../interface/interfaceTranslation";
import { fetchWord } from "../freegptFetcher.jsx";
import { Card } from "../components/wordListComponents/WordCard";
import styled from "styled-components";
import { DictChooser } from "../components/wordListComponents/DictChooser";
import exportFromJSON from 'export-from-json'

import { Loader } from "../components/tools/loadingComponent.jsx";
import { useWordsStore } from "../store/wordStore";
import { WordTools } from "../components/wordListComponents/wordTools";
import Error from "../components/tools/error.jsx";
import {useSystemStore} from "../store/systemStore.jsx";

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
    const [setLanguageTranslate, languageTranslate] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);

    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef();
    return (
        <>
          
          {isLoading && <Loader text={interfaceTranslate[languageTranslate].fetching}/>}
          <ToolsWrapper>
            <DictChooser/>
            <WordTools/>
          </ToolsWrapper>
          {/* {JSON.stringify(error)} */}
          <CardsWrapper>
            {
              wordList.length
                ? wordList?.map((wordItem) => {
                    return <Card key={wordItem.id} languageTranslate={languageTranslate} wordItem={wordItem}></Card>;
                  })
                : interfaceTranslate[languageTranslate].addWordsHere
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
          ></TextArea>
          <FetchButton
            onClick={async () => {
                setIsLoading(true)
                try {
                    const fetchingResult = await fetchWord(prompt);
                    console.log(fetchingResult)

                    if (fetchingResult.response){
                        // setError(fetchingResult.response.error)
                        const errors = fetchingResult.response.filter(item => item.error)
                        if (errors.length > 0){
                            console.log(errors)
                            setError(errors.map(error => error.error).join('\n'));
                        }
                        if (fetchingResult.response.filter(item => !item.error).length > 0){
                            addWords(dictName, fetchingResult.response.filter(item => !item.error))
                            inputRef.current.innerText=''
                        }

                    } else{
                        setPrompt('')


                    }

                }
                catch {

                }
                inputRef.current.focus()

                setIsLoading(false)

            }}
          >
            {interfaceTranslate[languageTranslate].addWord}
          </FetchButton>
            <Error text={error} setText={setError} />

        </>
      );
}