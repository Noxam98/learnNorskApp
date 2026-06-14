import { useState } from "react";
import { GameWordChooser } from "../components/gameComponents/GameWordChooser.jsx";
import { Game } from "../components/gameComponents/game";

export const GamePage = () => {
    const [gameState, setGameState] = useState("chooseWords"); // chooseWords | playing
    const [mode, setMode] = useState("no2int"); // no2int | int2no
    const [quiz, setQuiz] = useState(false);    // false = ввод, true = выбор вариантов
    return gameState === "chooseWords"
        ? <GameWordChooser setGameState={setGameState} mode={mode} setMode={setMode} quiz={quiz} setQuiz={setQuiz} />
        : <Game setGameState={setGameState} mode={mode} quiz={quiz} />;
};
