// @ts-check
// Игра «Cloze» (вставь пропущенное слово) — для служебных слов A1-A2. Предложение с пропуском «___»
// и варианты-кнопки (правильное служебное слово + дистракторы ДРУГОГО типа связи). Приходят готовыми
// в элементе сессии (`cloze: {blank, answer, options[, optionsTr, sentTr]}`) из выверенного статического
// банка (db.cloze_bank). НА РАЗБОРЕ показываем переводы: значение каждого варианта (optionsTr) и всего
// предложения (sentTr) на родном языке юзера. Механика цикла (рампа/SRS/переход) — в useGameLoop.
import { useState, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { hyLang, hyphenate } from "../ui/hyphenate.js";
import { ChoiceQuestion } from "./ChoiceQuestion.jsx";
import { speakText, speakTextEnd } from "../ui/tts.js";
import { PLAY_STYLE, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen , RampCheer , RampDrop , usePlayDialogRef } from "./gameShared.jsx";
import { useGameLoop } from "./useGameLoop.js";

export const ClozeGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const [chosen, setChosen] = useState(null);
    const [armed, setArmed] = useState(false); // анти-ghost-click: свежий вопрос ~350мс не принимает выбор
    const loop = useGameLoop({
        gmode: "cloze", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        // со звуком пауза = длина озвучки предложения с верным словом + хвост (cloze/correct/aLang ниже)
        speakAnswer: () => (sound && cloze.blank) ? speakTextEnd((cloze.blank || "").replace("___", correct), aLang) : null,
        onAdvance: () => setChosen(null),
    });
    const { t, currentLanguage, total, current, status, results, knownFirstTry, score, qIndex, qTotal, answer, advance, restart, backToSelection } = loop;
    const playRef = usePlayDialogRef();

    const cloze = current?.cloze || {};
    const aLang = hyLang(currentLanguage, true);   // ответ/варианты — норвежские
    const nLang = hyLang(currentLanguage);         // родной язык юзера (BCP) — для переводов на разборе
    const correct = cloze.answer || (current?.translate?.no?.[0] || "");
    const options = cloze.options || [];
    const prompt = (cloze.blank || "").replace("___", "＿＿＿");   // видимый пропуск

    // Переводы НА РАЗБОРЕ (после ответа): значение каждого варианта (ответ — контекстно, дистракторы —
    // общее) + перевод всего предложения. Показываем ТОЛЬКО на reveal — иначе выдали бы ответ.
    const reveal = status === "CORRECT" || status === "INCORRECT";
    const pickNative = (o) => (o && typeof o === "object") ? (o[currentLanguage] || o.ru || "") : "";
    const optionSub = reveal
        ? Object.fromEntries(options.map((o) => [o, pickNative(cloze.optionsTr?.[o])]))
        : {};
    const sentTr = pickNative(cloze.sentTr);
    const filledSentence = (cloze.blank || "").replace("___", correct);

    // После ОШИБКИ озвучиваем полное предложение с верным словом. После ВЕРНОГО озвучкой+паузой
    // управляет useGameLoop (speakAnswer), чтобы авто-переход совпал с длиной аудио.
    useEffect(() => {
        if (sound && status === "INCORRECT" && cloze.blank) {
            speakText((cloze.blank || "").replace("___", correct), aLang).catch(() => {});
        }
    }, [status]); // eslint-disable-line

    // «Взвод» выбора: новый вопрос (ASKING) ~350мс не принимает тап — защита от долетевшего с прошлого
    // экрана клика/ghost-click при быстром переходе (см. ChoiceGame). Сбрасывается на каждый новый вопрос.
    useEffect(() => {
        if (status !== "ASKING") return;
        setArmed(false);
        const tm = setTimeout(() => setArmed(true), 350);
        return () => clearTimeout(tm);
    }, [status, current]);

    const choose = (opt) => { if (status !== "ASKING" || !armed) return; setChosen(opt); answer(opt === correct); };
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
        <div ref={playRef} className="play" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={baseCorrect + correctCount} wrongCount={baseWrong + wrongCount} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage" onClick={onStageClick}
                style={status === "INCORRECT" ? { cursor: "pointer" } : undefined}>
                <ChoiceQuestion
                    prompt={prompt}
                    promptLang={aLang}
                    options={options}
                    optionLang={aLang}
                    optionSub={optionSub}
                    optionSubLang={nLang}
                    picked={chosen}
                    correct={correct}
                    reveal={reveal}
                    onPick={choose}
                    hint={t.clozeFill}
                    countText={`${t.word} ${qIndex} / ${qTotal}`}
                    disabled={status !== "ASKING"}
                    loading={!options.length}
                >
                    {reveal && (sentTr || (status === "INCORRECT" && descriptionText)) && (
                        <div className="feedback" role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {sentTr && (
                                <div className="fb-line">
                                    <span lang={aLang}>{hyphenate(filledSentence, aLang)}</span>
                                    <span className="muted"> — </span>
                                    <span className="muted" lang={nLang}>{hyphenate(sentTr, nLang)}</span>
                                </div>
                            )}
                            {status === "INCORRECT" && descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}
                    <div className="pcta" role="status" aria-live="polite">
                        {status === "CORRECT" && <span className="qhint qhint--ok"><Icon n="check" sm /> {t.correctly}</span>}
                        {status === "CORRECT" && <RampCheer word={current} rank={rank} repeat={repeat} gmode="cloze" />}
                        {status === "INCORRECT" && <RampDrop word={current} rank={rank} />}
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
