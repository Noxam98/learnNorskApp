import { useState } from "react";
import { GameWordChooser } from "../components/gameComponents/GameWordChooser.jsx";
import { Game } from "../components/gameComponents/game";
import { StudyGame } from "../components/gameComponents/StudyGame.jsx";

export const GamePage = () => {
    const [gameState, setGameState] = useState("chooseWords"); // chooseWords | playing
    const [mode, setMode] = useState("no2int");                // no2int | int2no
    const [gameType, setGameType] = useState("study");         // study | input | choice

    if (gameState === "chooseWords") {
        return <GameWordChooser setGameState={setGameState} mode={mode} setMode={setMode}
            gameType={gameType} setGameType={setGameType} />;
    }
    if (gameType === "study") {
        return <StudyGame setGameState={setGameState} mode={mode} />;
    }
    return <Game setGameState={setGameState} mode={mode} quiz={gameType === "choice"} />;
};
