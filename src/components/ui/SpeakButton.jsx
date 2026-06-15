import { useState } from "react";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { speakText } from "./tts.js";

// Кнопка озвучки со спиннером ожидания: пока звук грузится/догенерится на
// сервере — крутится спиннер (speakText резолвится в момент старта).
// lang не задан → норвежское слово (нужен hasTts — аудио из пула).
// lang задан (перевод) → озвучка генерится по требованию, кнопка всегда активна.
export const SpeakButton = ({ text, hasTts, lang, className = "iconbtn", lg = false, title, titlePreparing, ariaLabel }) => {
    const [loading, setLoading] = useState(false);
    const enabled = lang ? !!text : hasTts;
    const onClick = async (e) => {
        e?.stopPropagation();
        if (!enabled || loading) return;
        setLoading(true);
        try { await speakText(text, lang); } catch { /* нет звука — молчим */ }
        setLoading(false);
    };
    return (
        <button className={className} aria-label={ariaLabel} disabled={!enabled || loading}
            title={enabled ? title : titlePreparing}
            style={enabled ? undefined : { opacity: 0.4 }}
            onClick={onClick}>
            {loading ? <BtnSpinner /> : <Icon n="volume" lg={lg} />}
        </button>
    );
};

export default SpeakButton;
