import { useState } from "react";
import { GameWordChooser } from "../components/gameComponents/GameWordChooser.jsx";
import { Game } from "../components/gameComponents/game";
import { StudyGame } from "../components/gameComponents/StudyGame.jsx";

export const GamePage = () => {
    const [gameState, setGameState] = useState("chooseWords"); // chooseWords | playing
    const [mode, setMode] = useState("no2int");                // no2int | int2no
    const [gameType, setGameType] = useState("study");         // study | input | choice
    const [sound, setSound] = useState(false);                 // озвучивать норвежские слова

    if (gameState === "chooseWords") {
        return <GameWordChooser setGameState={setGameState} mode={mode} setMode={setMode}
            gameType={gameType} setGameType={setGameType} sound={sound} setSound={setSound} />;
    }
    if (gameType === "study") {
        return <StudyGame setGameState={setGameState} mode={mode} sound={sound} />;
    }
    return <Game setGameState={setGameState} mode={mode} quiz={gameType === "choice"} sound={sound} />;
};
