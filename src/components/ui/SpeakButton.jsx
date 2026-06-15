import { useState } from "react";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { speakNorwegian } from "./tts.js";

// Кнопка озвучки со спиннером ожидания: пока звук грузится/догенерится на
// сервере — крутится спиннер (speakNorwegian резолвится в момент старта
// воспроизведения). Нет аудио — кнопка неактивна.
export const SpeakButton = ({ text, hasTts, className = "iconbtn", lg = false, title, titlePreparing, ariaLabel }) => {
    const [loading, setLoading] = useState(false);
    const onClick = async () => {
        if (!hasTts || loading) return;
        setLoading(true);
        try { await speakNorwegian(text); } catch { /* нет звука — молчим */ }
        setLoading(false);
    };
    return (
        <button className={className} aria-label={ariaLabel} disabled={!hasTts || loading}
            title={hasTts ? title : titlePreparing}
            style={hasTts ? undefined : { opacity: 0.4 }}
            onClick={onClick}>
            {loading ? <BtnSpinner /> : <Icon n="volume" lg={lg} />}
        </button>
    );
};

export default SpeakButton;
