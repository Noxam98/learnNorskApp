import { useState } from "react";
import { useWordsStore } from "../../store/wordStore";
import styled from "styled-components";
import {useSystemStore} from "../../store/systemStore.jsx";
import {interfaceTranslate} from "../../interface/interfaceTranslation.jsx";

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

const getRandomWord = (wordsToGame, guessedWords, currentWord) =>{
    console.log(wordsToGame, guessedWords);
    
  const unguessedWords = wordsToGame.filter(word => ![...guessedWords, currentWord].includes(word));
  const randomWord = unguessedWords[Math.floor(Math.random()*unguessedWords.length)];
  return randomWord || wordsToGame[0]
}

const CurrentWordTranslate = styled.span`
    padding: 7px 12px;
    border-radius: 20px;
    font-size: 34px;
    display: block;
     background-color: cadetblue;
     color: #f2ff00;
     font-weight: 500;

`

const GameWrapper = styled.section`
    width: 100%;
    gap: 10px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: ${({wordState}) => wordState === 'trueTry'? '#98ca6f': wordState === 'failTry'? '#db6229': 'transparent'};
    border-radius: 20px;
    /* color: ; */
    padding: 10px;
    box-sizing: border-box;
`

const WordInput = styled.input`
    font-size: 20px;
    padding: 7px;
    color: #323d46;
`

const HelperTextWrapper = styled.span`
    background-color: ${({wordState}) => wordState === 'trueTry'? '#627f4b': wordState === 'failTry'? '#853e1d': 'transparent'};
    border-radius: 10px;
    padding: 5px;
    color: ${({wordState}) => wordState === 'trueTry'? '#30b92b': wordState === 'failTry' && '#fbe2d9'};
    /* color: #1f5687; */
`

const GameBoutton = styled.button`
    font-size: 20px;
    background-color: #ffc880;
    color: white;
    padding: 5px 16px;
    border: none;
    cursor: pointer;
    border-radius: 15px;
`

export const Game = ({setGameState}) =>{
    const [setCurrentLanguage, currentLanguage] = useSystemStore((state) => [state.setCurrentLanguage, state.currentLanguage]);

    const [tryBadCount, setTryBadCount] = useState(0)
    const wordsToGame = filterChoosetWords(useWordsStore((state) => state.dictList));
    const ToggleChooseToGame = useWordsStore(state => state.ToggleChooseToGame)
    const [guessedWords, setGuessedWords] = useState([]);
    const [wordState, setWordState] = useState('firstTry'); // firstTry, failTry, finished, trueTry
    const [currentWord, setCurrentWord] = useState(getRandomWord(wordsToGame, guessedWords));
    const [wordInputText, setWordInputText] = useState('');
    const [helpText, setHelpText] = useState(interfaceTranslate[currentLanguage].enterTranslationBelow);
  return (
  <GameWrapper wordState={wordState}>
    {
     wordState !== 'finished' &&
        <>
    <HelperTextWrapper wordState={wordState}>
        {helpText}
    </HelperTextWrapper>
    <CurrentWordTranslate>
        {currentWord.translate[currentLanguage]?.join(', ').charAt(0).toUpperCase() + currentWord.translate[currentLanguage]?.join(', ').slice(1)}
    </CurrentWordTranslate>
 
    <WordInput type="text" inputMode="text" onKeyDown={e=>{
        
        if(e.key === 'Enter'){
            if(wordInputText.toLowerCase().trim() === currentWord.word.toLowerCase().trim()){
                if(wordState === 'firstTry'){
                    setGuessedWords(prev => {
                        return [...prev, currentWord]
                    })
                    
                    if (guessedWords.length === wordsToGame.length){
                        setWordState('finished')
                    }else{
                        setHelpText(interfaceTranslate[currentLanguage].correctly)
                        setWordState('trueTry')
                        
                        setTimeout(()=>{
                            setWordState('firstTry')
                            setCurrentWord(getRandomWord(wordsToGame, guessedWords, currentWord));
                            setWordInputText('');
                            setHelpText(interfaceTranslate[currentLanguage].enterTranslationBelow)
                        }, 1000)
                       
                    
                    }
                    
                    
                }else{
                    setHelpText(interfaceTranslate[currentLanguage].correctly)
                    setWordState('firstTry')
                    setTimeout(()=>{
                        setCurrentWord(getRandomWord(wordsToGame, guessedWords, currentWord));
                        setWordInputText('');
                        
                        setHelpText(interfaceTranslate[currentLanguage].enterTranslationBelow)
                    }, 1000)
                    
                }
            } else{
                if(wordState === 'firstTry'){
                    setWordState('failTry')
                    setTryBadCount(prev => prev+1)

                    setHelpText(`${interfaceTranslate[currentLanguage].mistake} ${currentWord.word}`)
                    setWordInputText('');
                }
            }   
        }
    }} value={wordInputText} onChange={(e)=> setWordInputText(e.target.value)}/>
    <div>
        </div>
        <div>
        {`${interfaceTranslate[currentLanguage].guessedStats[0]} ${guessedWords.length} ${interfaceTranslate[currentLanguage].guessedStats[1]} ${wordsToGame.length}`}
        </div>
        <div>
        {`${interfaceTranslate[currentLanguage].mistakesMade} ${tryBadCount}.`}
        </div>
   
  </>
}
  {
    wordState === 'finished' && 
    <>
        <GameBoutton onClick={()=>{
            setGuessedWords([])
            setTryBadCount(0)
            setWordState('firstTry')
            setCurrentWord(getRandomWord(wordsToGame, []))
            setWordInputText('')
            }}>{interfaceTranslate[currentLanguage].playAgain}</GameBoutton>
        <GameBoutton onClick={()=>{
            setTryBadCount(0)
            setGameState('chooseWords')
            for(const word of wordsToGame){
                ToggleChooseToGame(word.id)
            }
        }}>{interfaceTranslate[currentLanguage].backToWordSelection}</GameBoutton>
    </>
  }
  </GameWrapper>

  )
}