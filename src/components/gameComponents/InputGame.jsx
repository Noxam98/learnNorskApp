// Игра «Ввод»: игрок печатает перевод. Слово повторяется, пока не угадано;
// на верном — авто-переход, на ошибке — кнопка «Дальше» с показом ответа.
// Озвучка (если включена) — видимого слова и правильного ответа.
import { useState, useEffect, useMemo, useRef } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import { ENDONYM, DUNNO, PLAY_STYLE, filterChosenWords, pickWord, shuffle, foldLoose, PlayTopBar, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";
import { playSound, playWin } from "../tools/sound.js";

const GMODE = "input";

// words/onResult/onExit передаёт «Учёба» (переиспользует игру). Без них — обычный режим «Игры».
export const InputGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const recordGameResult = useWordsStore((s) => s.recordGameResult);
    const t = interfaceTranslate[currentLanguage];
    const record = (w, ok) => { if (onResult) onResult(w, ok, GMODE); else recordGameResult(w.id, ok, GMODE); };

    const wordsToGame = useMemo(() => wordsProp || aiPlay || filterChosenWords(dictList), []);
    const total = wordsToGame.length;
    const isNo2Int = mode !== "int2no";

    const [status, setStatus] = useState("ASKING"); // ASKING | CORRECT | INCORRECT | FINISHED
    const [current, setCurrent] = useState(() => pickWord(wordsToGame, []));
    const [guessed, setGuessed] = useState([]);
    const [missed, setMissed] = useState([]);
    const [input, setInput] = useState("");
    const inputRef = useRef(null);

    const knownFirstTry = guessed.filter((id) => !missed.includes(id)).length;

    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    const accepted = (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    const correctPrimary = (isNo2Int ? translations[0] : no) || "";
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);
    const aLang = hyLang(currentLanguage, !isNo2Int);

    useEffect(() => {
        // фокус и при повторе после ошибки — чтобы сразу вводить заново
        if ((status === "ASKING" || status === "INCORRECT") && inputRef.current) inputRef.current.focus();
    }, [status, current]);

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

    // Верный ответ — авто-переход.
    useEffect(() => {
        if (status === "CORRECT") {
            const timer = setTimeout(() => goNext(), 1100);
            return () => clearTimeout(timer);
        }
    }, [status]); // eslint-disable-line
    // «Учёба» показывает свой итог сессии — отдаём результат наружу вместо своего финиша.
    useEffect(() => {
        if (status === "FINISHED" && onFinish) onFinish({ total, correct: guessed.filter((id) => !missed.includes(id)).length });
    }, [status]); // eslint-disable-line

    const applyResult = (ok) => {
        playSound(ok ? "correct" : "wrong");
        if (ok) {
            if (!missed.includes(current.id)) record(current, true);
            const ng = [...guessed, current.id];
            setGuessed(ng);
            if (ng.length === total) { setStatus("FINISHED"); playWin(); }
            else setStatus("CORRECT");
        } else {
            if (!missed.includes(current.id)) {
                setMissed([...missed, current.id]);
                record(current, false);
            }
            setStatus("INCORRECT");
        }
    };

    const goNext = () => {
        let next = pickWord(wordsToGame, [...guessed, current?.id]);
        if (!next) next = pickWord(wordsToGame, guessed);
        if (!next) { setStatus("FINISHED"); return; }
        setCurrent(next);
        setInput("");
        setStatus("ASKING");
    };

    // Переход дальше после УСПЕШНОГО повтора (слово уже зачтено как пройденное в gList).
    const advanceWith = (gList) => {
        let next = pickWord(wordsToGame, [...gList, current?.id]);
        if (!next) next = pickWord(wordsToGame, gList);
        if (!next) { setStatus("FINISHED"); playWin(); return; }
        setCurrent(next); setInput(""); setStatus("ASKING");
    };

    const submit = (e) => {
        e?.preventDefault();
        if (status === "CORRECT" || status === "FINISHED") return;
        const answer = foldLoose(input);
        const ok = accepted.some((a) => foldLoose(a) === answer);
        // повтор после ошибки: ответ уже показан — дальше только когда ввёл правильно
        if (status === "INCORRECT") {
            if (ok) {
                playSound("correct");
                const ng = [...guessed, current.id];   // зачесть как пройденное (без повторной записи в SRS)
                setGuessed(ng);
                if (ng.length === total) { setStatus("FINISHED"); playWin(); }
                else advanceWith(ng);
            }
            return;
        }
        applyResult(ok);
    };

    // Честный «Не знаю»: как неверный — пометит missed, покажет верное написание.
    const dontKnow = () => {
        if (status !== "ASKING") return;
        applyResult(false);
    };

    const restart = () => {
        setGuessed([]); setMissed([]); setInput("");
        setCurrent(pickWord(wordsToGame, []));
        setStatus("ASKING");
    };

    const backToSelection = () => {
        if (onExit) { onExit(); return; }
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const otherAccepted = accepted.filter((a) => foldLoose(a) !== foldLoose(input));
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;
    const qIndex = stepTotal ? stepNo : Math.min(guessed.length + 1, total);
    const qTotal = stepTotal || total;
    const segs = segsOverride || Array.from({ length: total }, (_, i) => {
        if (i < guessed.length) return missed.includes(guessed[i]) ? "err" : "ok";
        if (i === guessed.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={guessed.length} wrongCount={missed.length} onExit={backToSelection} t={t} />
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

                    <form className="answer" onSubmit={submit}>
                        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                            placeholder={t.yourAnswer} autoComplete="off" spellCheck="false"
                            disabled={status === "CORRECT"} />
                    </form>

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
                            <div className="fb-line">{t.mistake} <b lang={aLang}>{hyphenate(accepted.join(", "), aLang)}</b></div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    <div className="pcta">
                        {status !== "CORRECT" &&
                            <button className="gbtn gbtn--accent" onClick={submit}><Icon n="check" sm /> {t.check}</button>}
                    </div>
                    {status === "ASKING" && (
                        <div className="dunno-wrap">
                            <button className="dunno-link" onClick={dontKnow}>{DUNNO[currentLanguage]}</button>
                        </div>
                    )}
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missed.length} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default InputGame;
