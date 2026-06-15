import { useState, useEffect, useRef } from "react";
import { GameWordChooser } from "../components/gameComponents/GameWordChooser.jsx";
import { InputGame } from "../components/gameComponents/InputGame.jsx";
import { ChoiceGame } from "../components/gameComponents/ChoiceGame.jsx";
import { StudyGame } from "../components/gameComponents/StudyGame.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import api from "../components/tools/api.js";

export const GamePage = () => {
    const prefs = useAuthStore((s) => s.user?.gamePrefs) || {};
    const [gameState, setGameState] = useState("chooseWords"); // chooseWords | playing
    const [mode, setMode] = useState(prefs.dir === "int2no" ? "int2no" : "no2int");     // no2int | int2no
    const [gameType, setGameType] = useState(["study", "input", "choice"].includes(prefs.type) ? prefs.type : "study");
    const [sound, setSound] = useState(!!prefs.sound);          // озвучивать слова

    // Запоминаем последние настройки игры на бэкенде (кроме самого первого рендера).
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        api.setGamePrefs({ type: gameType, dir: mode, sound }).catch(() => {});
    }, [gameType, mode, sound]);

    if (gameState === "chooseWords") {
        return <GameWordChooser setGameState={setGameState} mode={mode} setMode={setMode}
            gameType={gameType} setGameType={setGameType} sound={sound} setSound={setSound} />;
    }
    if (gameType === "study") return <StudyGame setGameState={setGameState} mode={mode} sound={sound} />;
    if (gameType === "choice") return <ChoiceGame setGameState={setGameState} mode={mode} sound={sound} />;
    return <InputGame setGameState={setGameState} mode={mode} sound={sound} />;
};
