import { useState } from "react";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { speakText, speakSequence } from "./tts.js";

// Кнопка озвучки со спиннером ожидания: пока звук грузится/догенерится на
// сервере — крутится спиннер.
// Одиночный режим (text + lang/hasTts): lang не задан → норвежское слово
// (нужен hasTts — аудио из пула); lang задан (перевод) → генерится по требованию.
// Режим очереди (segments: [{ text, lang, hasTts }]) — фрагменты играются подряд
// (например норвежский → перевод). Норвежский фрагмент требует hasTts.
export const SpeakButton = ({ text, hasTts, lang, segments, className = "iconbtn", lg = false, title, titlePreparing, ariaLabel }) => {
    const [loading, setLoading] = useState(false);

    // Можно ли озвучить фрагмент: перевод (lang) — если есть текст; норвежский — если есть hasTts.
    const segEnabled = (s) => (s.lang ? !!(s.text || "").trim() : !!s.hasTts);
    const playable = segments ? segments.filter(segEnabled) : null;
    const enabled = segments ? playable.length > 0 : (lang ? !!text : hasTts);

    const onClick = async (e) => {
        e?.stopPropagation();
        if (!enabled || loading) return;
        setLoading(true);
        try {
            if (segments) await speakSequence(playable);
            else await speakText(text, lang);
        } catch { /* нет звука — молчим */ }
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
