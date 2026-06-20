// Сессия «Учёбы» = переиспользует компоненты игр (Выбор/Ввод/Карточки) на ПЕРЕДАННОМ
// наборе слов. Один режим на сессию. Каждый ответ кормит SRS (/learning/answer с pool_id+mode).
// Карточки (study) — пассивные, в SRS не пишут (см. onResult ниже).
import { useMemo } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";
import ChoiceGame from "../gameComponents/ChoiceGame.jsx";
import InputGame from "../gameComponents/InputGame.jsx";
import StudyGame from "../gameComponents/StudyGame.jsx";

const COMP = { choice: ChoiceGame, input: InputGame, study: StudyGame };

// Направление перевода в «Учёбе». Обсуждаемо: пока единое на сессию.
// Пользователь склоняется к «родной → норвежский» (припоминание) как более эффективному.
const STUDY_DIR = "int2no";

export default function LearningSession({ words = [], mode = "choice", lang = "ru", onClose }) {
    const soundOn = useSystemStore((s) => s.soundOn);
    const Game = COMP[mode] || ChoiceGame;

    // Привести слова «Учёбы» к форме, понятной играм: id = pool_id; translate.no — гарантированно есть.
    const gw = useMemo(() => (words || [])
        .filter((w) => w && (w.pool_id ?? w.id) != null)
        .map((w) => ({
            ...w,
            id: w.pool_id ?? w.id,
            pool_id: w.pool_id ?? w.id,
            translate: {
                ...(w.translate || {}),
                no: w.translate?.no?.length ? w.translate.no : [w.no].filter(Boolean),
            },
        })), [words]);

    const onResult = (w, ok) => {
        api.learningAnswer({ pool_id: w.pool_id ?? w.id, correct: ok, mode }).catch(() => { /* офлайн — не критично */ });
    };
    const onExit = () => onClose?.(true);   // вернуться в «Учёбу» и обновить статистику

    if (!gw.length) { onClose?.(); return null; }

    return (
        <Game
            words={gw}
            mode={STUDY_DIR}
            sound={soundOn}
            onResult={mode === "study" ? undefined : onResult}
            onExit={onExit}
            setGameState={() => onClose?.(true)}
        />
    );
}
