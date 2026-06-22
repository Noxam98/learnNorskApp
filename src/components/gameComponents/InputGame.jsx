// Игра «Ввод»: игрок печатает перевод. Для НОРВЕЖСКОГО ответа (int2no) — наша экранная клавиатура
// (свободный режим, без подсказок-букв), как в «Сборке». Для родного языка (no2int) — штатный
// инпут (нашей раскладкой кириллицу/др. не набрать, да и смысла печатать родной нет).
// На верном — авто-переход; на ошибке — показ ответа, ввод сбрасывается, дальше — когда введёт верно.
// Механика цикла (стейт-машина, SRS, ретрай, авто-переход, финиш) — в useGameLoop.
import { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import { ENDONYM, DUNNO, PLAY_STYLE, foldLoose, PlayTopBar, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";
import { GameKeyboard } from "./GameKeyboard.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { useSystemStore } from "../../store/systemStore.jsx";

export const InputGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
    const isNo2Int = mode !== "int2no";
    const nativeKeyboard = useSystemStore((s) => s.nativeKeyboard);
    // печатаем норвежское → наша клавиатура; для родного и при выборе «системная клавиатура» — штатный инпут
    const useKbd = !isNo2Int && !nativeKeyboard;
    const [input, setInput] = useState("");
    const inputRef = useRef(null);
    // Очистить поле и (для штатного инпута) вернуть фокус — чтобы после ошибки сразу вводить заново.
    const resetInput = () => { setInput(""); setTimeout(() => inputRef.current?.focus(), 0); };

    const loop = useGameLoop({
        gmode: "input", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100,
        onAdvance: () => setInput(""),   // новое слово — чистое поле
        onWrong: resetInput,             // после ошибки — сбросить (и сфокусировать штатный инпут)
    });
    const { t, currentLanguage, total, current, status, missedIds, doneCount, knownFirstTry, score, qIndex, qTotal, segs, answer, restart, backToSelection } = loop;

    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    const accepted = (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    const correctPrimary = (isNo2Int ? translations[0] : no) || "";
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);
    const aLang = hyLang(currentLanguage, !isNo2Int);
    const canType = status === "ASKING" || status === "INCORRECT";

    useEffect(() => {
        // фокус штатного инпута при показе и при повторе после ошибки
        if (!useKbd && (status === "ASKING" || status === "INCORRECT") && inputRef.current) inputRef.current.focus();
    }, [status, current]); // eslint-disable-line

    // Озвучка видимого слова при показе (+ прогрев правильного ответа заранее).
    useEffect(() => {
        if (!sound || status !== "ASKING") return;
        if (question) speakText(question, qLang).catch(() => {});
        if (correctPrimary) prefetchTts(correctPrimary, aLang);
    }, [current, sound]); // eslint-disable-line
    // Озвучка правильного ответа после ответа.
    useEffect(() => {
        if (sound && (status === "CORRECT" || status === "INCORRECT") && correctPrimary) speakText(correctPrimary, aLang).catch(() => {});
    }, [status]); // eslint-disable-line

    const submit = (e) => { e?.preventDefault?.(); answer(accepted.some((a) => foldLoose(a) === foldLoose(input))); };
    const dontKnow = () => { if (status === "ASKING") answer(false); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const otherAccepted = accepted.filter((a) => foldLoose(a) !== foldLoose(input));

    return (
        <div className={"play" + (useKbd ? " play--kbd" : "")} data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={doneCount} wrongCount={missedIds.size} onExit={backToSelection} t={t} />
            <ProgressSegments segs={segs} />

            <div className="pstage">
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {qTotal}</div>
                    <div className="qprompt">{t.translateTo} {promptTarget}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(question, qLang)}
                        <SpeakButton text={question} lang={qLang} className="qspeak" lg
                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                    </h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {useKbd ? (
                        <div className="build-line" lang={aLang}>{input || <span className="build-line__ph">_ _ _</span>}</div>
                    ) : (
                        <form className="answer" onSubmit={submit}>
                            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                                placeholder={t.yourAnswer} autoComplete="off" spellCheck="false"
                                disabled={status === "CORRECT"} />
                        </form>
                    )}

                    {status === "CORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(98,192,131,.16)", color: "var(--game-correct)" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-correct)" }}>{t.correctly}</div>
                            {otherAccepted.length > 0 && <div className="fb-line">{t.alsoAccepted} <b lang={aLang}>{hyphenate(otherAccepted.join(", "), aLang)}</b></div>}
                        </div>
                    )}
                    {status === "INCORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <div className="fb-line">{t.mistake}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(accepted.join(", "), aLang)}</div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    {/* наша клавиатура (свободный режим — без подсказок-букв), только для норвежского ответа */}
                    {useKbd && canType && (
                        <GameKeyboard
                            lang={aLang} extras={["-"]} leftFiller
                            canSubmit={input.length > 0} canBackspace={input.length > 0}
                            onType={(c) => setInput(input + c)} onBackspace={() => setInput(input.slice(0, -1))} onSubmit={() => submit()} />
                    )}

                    <div className="pcta">
                        {status !== "CORRECT" &&
                            <button className="gbtn gbtn--accent" onClick={submit}><Icon n="check" sm /> {t.check}</button>}
                    </div>
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missedIds.size} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>

            {/* «Не знаю» — неприметная угловая кнопка (прямой ребёнок .play, чтобы её не подрезал
                overflow:hidden у .pstage в режиме клавиатуры). С клавиатурой низ занят — уводим наверх. */}
            {status === "ASKING" && (
                <button className={"dunno-corner" + (useKbd ? " dunno-corner--top" : "")} onClick={dontKnow}>{DUNNO[currentLanguage]}</button>
            )}
        </div>
    );
};

export default InputGame;
