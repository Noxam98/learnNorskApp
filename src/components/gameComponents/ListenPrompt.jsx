// @ts-check
// Аудио-подсказка для задания «на слух» (стадия choice_no2int): норвежское слово ПРОИГРЫВАЕТСЯ,
// текст скрыт — игрок узнаёт на слух и выбирает перевод. Кнопка ▶ с кольцом прогресса (плавно
// заполняется по ходу аудио), автоплей, кнопка «не слышно?» со слоёной диагностикой и эскейпы
// «показать текст» / «всегда текстом». Звук — через ЕДИНЫЙ канал tts.js (speakProgress), чтобы
// воспроизведения НЕ пересекались с озвучкой ответа (общий stopAudio гасит предыдущее).
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { speakProgress } from "../ui/tts.js";
import { useSystemStore } from "../../store/systemStore.jsx";

const T = {
    ru:  { hint: "Послушай и выбери перевод", cantHear: "Не слышно?", showText: "Показать текст",
           replay: "Ещё раз", turnOn: "Включить звук", alwaysText: "Всегда текстом",
           diagVol: "Звук выключен в приложении. Включи — и слово зазвучит.",
           diagBlocked: "Браузер не дал звуку заиграть сам. Нажми ▶, чтобы услышать.",
           diagDevice: "Проверь громкость и «беззвучный режим» на устройстве. Или ответь по тексту." },
    ukr: { hint: "Послухай і обери переклад", cantHear: "Не чути?", showText: "Показати текст",
           replay: "Ще раз", turnOn: "Увімкнути звук", alwaysText: "Завжди текстом",
           diagVol: "Звук вимкнено в застосунку. Увімкни — і слово зазвучить.",
           diagBlocked: "Браузер не дав звуку заграти сам. Натисни ▶, щоб почути.",
           diagDevice: "Перевір гучність і «беззвучний режим» на пристрої. Або відповідай за текстом." },
    en:  { hint: "Listen and pick the translation", cantHear: "Can't hear?", showText: "Show text",
           replay: "Again", turnOn: "Turn on sound", alwaysText: "Always text",
           diagVol: "Sound is off in the app. Turn it on to hear the word.",
           diagBlocked: "The browser blocked autoplay. Tap ▶ to hear it.",
           diagDevice: "Check your device volume and silent mode. Or answer by text." },
    pl:  { hint: "Posłuchaj i wybierz tłumaczenie", cantHear: "Nie słychać?", showText: "Pokaż tekst",
           replay: "Jeszcze raz", turnOn: "Włącz dźwięk", alwaysText: "Zawsze tekst",
           diagVol: "Dźwięk jest wyłączony w aplikacji. Włącz, aby usłyszeć słowo.",
           diagBlocked: "Przeglądarka zablokowała autoodtwarzanie. Naciśnij ▶, aby usłyszeć.",
           diagDevice: "Sprawdź głośność i tryb cichy w urządzeniu. Albo odpowiedz tekstem." },
    lt:  { hint: "Klausyk ir pasirink vertimą", cantHear: "Negirdi?", showText: "Rodyti tekstą",
           replay: "Dar kartą", turnOn: "Įjungti garsą", alwaysText: "Visada tekstu",
           diagVol: "Garsas išjungtas programėlėje. Įjunk, kad išgirstum žodį.",
           diagBlocked: "Naršyklė užblokavo automatinį grojimą. Paspausk ▶, kad išgirstum.",
           diagDevice: "Patikrink garsą ir „tylųjį režimą“ įrenginyje. Arba atsakyk tekstu." },
};

/**
 * @param {{ word: string, ttsLang?: string, uiLang?: string, asking?: boolean,
 *   onShowText?: () => void, onDisableAlways?: () => void }} p
 */
export function ListenPrompt({ word, ttsLang, uiLang = "ru", asking = true, onShowText, onDisableAlways }) {
    const t = T[uiLang] || T.en;
    const soundVolume = useSystemStore((s) => s.soundVolume);
    const [prog, setProg] = useState(0);          // 0..1 ход проигрывания
    const [state, setState] = useState("idle");   // idle | playing | ended | blocked
    const [diag, setDiag] = useState(false);
    // Воспроизведение через единый канал tts.js: прогресс по onTick, координация со всей озвучкой.
    const play = () => {
        setProg(0); setState("playing"); setDiag(false);
        speakProgress(word, ttsLang, setProg)
            .then(() => setState("ended"))
            .catch((e) => { const m = String(e?.message || e); setState(m.includes("interrupt") ? "idle" : "blocked"); });
    };

    // автоплей при появлении нового слова (на ответ слово гасит/доигрывает уже сам loop — единый канал)
    useEffect(() => { play(); }, [word]); // eslint-disable-line

    // слоёная диагностика «не слышно»: точное → гадательное
    const advice = soundVolume === 0 ? "vol" : state === "blocked" ? "blocked" : "device";
    const adviceText = advice === "vol" ? t.diagVol : advice === "blocked" ? t.diagBlocked : t.diagDevice;

    return (
        <div className="listen">
            <button type="button" className={"listen__play" + (state === "playing" ? " is-playing" : "")}
                style={/** @type {any} */({ "--p": Math.round(prog * 100) })} onClick={play} aria-label={t.replay}>
                <Icon n="volume" />
            </button>
            {asking && <div className="listen__hint">{t.hint}</div>}
            {asking && (
                <div className="listen__links">
                    <button type="button" className="listen__link" onClick={() => setDiag((v) => !v)}>{t.cantHear}</button>
                    <span className="listen__dot">·</span>
                    <button type="button" className="listen__link" onClick={onShowText}>{t.showText}</button>
                </div>
            )}
            {diag && (
                <div className="listen__diag">
                    <div className="listen__diagtext">{adviceText}</div>
                    <div className="listen__diagacts">
                        {advice === "vol" && (
                            <button type="button" className="gbtn gbtn--accent"
                                onClick={() => { useSystemStore.getState().setSoundVolume(0.8); setDiag(false); play(); }}>
                                <Icon n="volume" sm /> {t.turnOn}
                            </button>
                        )}
                        {advice === "blocked" && (
                            <button type="button" className="gbtn gbtn--accent" onClick={() => { setDiag(false); play(); }}>
                                <Icon n="volume" sm /> {t.replay}
                            </button>
                        )}
                        <button type="button" className="gbtn" onClick={onShowText}>{t.showText}</button>
                        <button type="button" className="gbtn" onClick={onDisableAlways}>{t.alwaysText}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ListenPrompt;
