import { useState } from "react";
import { GameWordChooser } from "../components/gameComponents/wordChooser";
import { Game } from "../components/gameComponents/game";
import styled from "styled-components";

const GamePageWrapper = styled.section`
  
  display: flex;
  justify-content: center;

`

const GamePageContent = styled.section`
  
  max-width: 800px;
  /* min-width: ; */
  width: 100%;
  border: 3px dotted black;
  padding: 10px;
  border-radius: 10px;

`

export const GamePage = ({}) => {
  const [GameState, setGameState] = useState('chooseWords') // chooseWords || playing
  return (
    <GamePageWrapper>
      <GamePageContent>
      {GameState === 'chooseWords' && 
        <GameWordChooser setGameState={setGameState}/>
      }
       {GameState === 'playing' && 
        <Game setGameState={setGameState}/>
      }
      
      </GamePageContent>
    </GamePageWrapper>
  );
};
