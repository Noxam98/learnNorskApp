// @ts-check
// Игра «Cloze» (вставь пропущенное слово) — для служебных слов A1. Предложение с пропуском «___»
// и варианты-кнопки (правильное служебное слово + дистракторы той же части речи). Предложение и
// варианты приходят готовыми в элементе сессии (`cloze: {blank, answer, options}`), сгенерированы
// бэком из УЖЕ ВЫУЧЕННЫХ слов юзера. Механика цикла (рампа/SRS/переход) — в useGameLoop.
import { useState, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { hyLang } from "../ui/hyphenate.js";
import { ChoiceQuestion } from "./ChoiceQuestion.jsx";
import { speakText } from "../ui/tts.js";
import { PLAY_STYLE, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";
import { useGameLoop } from "./useGameLoop.js";

const FILL = { ru: "Вставь пропущенное слово", en: "Fill in the gap", ukr: "Встав пропущене слово", pl: "Uzupełnij lukę", lt: "Įrašyk trūkstamą žodį" };

export const ClozeGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false }) => {
    const [chosen, setChosen] = useState(null);
    const loop = useGameLoop({
        gmode: "cloze", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100,
        onAdvance: () => setChosen(null),
    });
    const { t, currentLanguage, total, current, status, results, knownFirstTry, score, qIndex, qTotal, answer, advance, restart, backToSelection } = loop;

    const cloze = current?.cloze || {};
    const aLang = hyLang(currentLanguage, true);   // ответ/варианты — норвежские
    const correct = cloze.answer || (current?.translate?.no?.[0] || "");
    const options = cloze.options || [];
    const prompt = (cloze.blank || "").replace("___", "＿＿＿");   // видимый пропуск

    // Озвучка полного предложения (с верным словом) после ответа.
    useEffect(() => {
        if (sound && (status === "CORRECT" || status === "INCORRECT") && cloze.blank) {
            speakText((cloze.blank || "").replace("___", correct), aLang).catch(() => {});
        }
    }, [status]); // eslint-disable-line

    const choose = (opt) => { if (status !== "ASKING") return; setChosen(opt); answer(opt === correct); };
    // после ошибки правильный показан — продолжаем тапом по любому месту (как в «Выборе»)
    const onStageClick = () => { if (status === "INCORRECT") advance(); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const correctCount = results.filter((r) => r.ok).length;
    const wrongCount = results.filter((r) => !r.ok).length;
    const g = current.gloss;
    const descriptionText = (g && typeof g === "object") ? (g[currentLanguage] || g.ru || "") : (g || "");
    const segs = segsOverride || Array.from({ length: total }, (_, i) => {
        if (i < results.length) return results[i].ok ? "ok" : "err";
        if (i === results.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={correctCount} wrongCount={wrongCount} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage" onClick={onStageClick}
                style={status === "INCORRECT" ? { cursor: "pointer" } : undefined}>
                <ChoiceQuestion
                    prompt={prompt}
                    promptLang={aLang}
                    options={options}
                    optionLang={aLang}
                    picked={chosen}
                    correct={correct}
                    reveal={status === "CORRECT" || status === "INCORRECT"}
                    onPick={choose}
                    hint={FILL[currentLanguage] || FILL.ru}
                    countText={`${t.word} ${qIndex} / ${qTotal}`}
                    disabled={status !== "ASKING"}
                    loading={!options.length}
                >
                    {status === "INCORRECT" && descriptionText && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-line muted">{descriptionText}</div>
                        </div>
                    )}
                    <div className="pcta">
                        {status === "CORRECT" && <span className="qhint qhint--ok"><Icon n="check" sm /> {t.correctly}</span>}
                        {status === "INCORRECT" && <span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span>}
                    </div>
                </ChoiceQuestion>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={wrongCount} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default ClozeGame;
