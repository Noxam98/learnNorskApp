// Игра «Собери из букв»: дано родное слово — собрать норвежское из перемешанных плиток-букв.
// Ступень рампы «продукция со страховкой» (между Выбором и Переводом). Направление — только
// родной→норв (собираем норвежское). Пропс-совместима с остальными играми.
import { useState, useEffect, useMemo, useRef } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { speakText, prefetchTts } from "../ui/tts.js";
import { ENDONYM, DUNNO, PLAY_STYLE, filterChosenWords, pickWord, PlayTopBar, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";
import { playSound, playWin } from "../tools/sound.js";

const GMODE = "build";
const norm = (s) => (s || "").trim().toLowerCase();
// Норвежская раскладка QWERTY (нижний регистр). Доп. символы слова (пробел/дефис) — отдельным рядом.
const KBD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "å"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ø", "æ"],
    ["z", "x", "c", "v", "b", "n", "m"],
];
const KBD_SET = new Set(KBD_ROWS.flat());

// words/onResult/onExit/onFinish передаёт «Учёба». Без них — обычный режим «Игры».
export const BuildGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const recordGameResult = useWordsStore((s) => s.recordGameResult);
    const t = interfaceTranslate[currentLanguage];
    const record = (w, ok) => { if (onResult) onResult(w, ok, GMODE); else recordGameResult(w.id, ok, GMODE); };

    const wordsToGame = useMemo(() => wordsProp || aiPlay || filterChosenWords(dictList), []);
    const total = wordsToGame.length;

    const [status, setStatus] = useState("ASKING");   // ASKING | CORRECT | INCORRECT | FINISHED
    const [current, setCurrent] = useState(() => pickWord(wordsToGame, []));
    const [guessed, setGuessed] = useState([]);
    const [missed, setMissed] = useState([]);
    const [typed, setTyped] = useState([]);            // введённые буквы по порядку (с клавиатуры)
    const [pop, setPop] = useState(null);              // буква поп-ап превью (как в Gboard)
    const pressingRef = useRef(null);                  // какую клавишу сейчас держим (ввод — на отпускании)

    const knownFirstTry = guessed.filter((id) => !missed.includes(id)).length;

    const target = current?.translate?.no?.[0] || "";
    // подсказка — родной перевод; фолбэк на ru/en, но НИКОГДА на норвежский ответ (target)
    const trArr = (current?.translate?.[currentLanguage]?.length ? current.translate[currentLanguage]
        : (current?.translate?.ru?.length ? current.translate.ru : (current?.translate?.en || []))).filter(Boolean);
    const prompt = trArr.join(", ") || "—";
    const targetChars = useMemo(() => [...norm(target)], [current]); // символы цели по порядку
    // сколько каждой буквы нужно (для активации клавиш и счётчика-бейджа)
    const needed = useMemo(() => {
        const m = {}; for (const c of targetChars) m[c] = (m[c] || 0) + 1; return m;
    }, [current]); // eslint-disable-line
    const extras = useMemo(() => Object.keys(needed).filter((c) => !KBD_SET.has(c)), [current]); // eslint-disable-line
    const remainingOf = (c) => (needed[c] || 0) - typed.filter((x) => x === c).length;
    const built = typed.join("");
    const qLang = hyLang(currentLanguage, false);  // язык подсказки — родной
    const aLang = hyLang(currentLanguage, true);   // ответ — норвежский

    // Озвучка норвежского ответа при показе (прогрев) и после ответа.
    useEffect(() => {
        if (!sound || status !== "ASKING") return;
        if (target) prefetchTts(target, aLang);
    }, [current, sound]); // eslint-disable-line
    useEffect(() => {
        if (sound && (status === "CORRECT" || status === "INCORRECT") && target) speakText(target, aLang).catch(() => {});
    }, [status]); // eslint-disable-line
    useEffect(() => {  // верный ответ — авто-переход
        if (status === "CORRECT") { const tm = setTimeout(goNext, 1100); return () => clearTimeout(tm); }
    }, [status]); // eslint-disable-line

    const canType = status === "ASKING" || status === "INCORRECT"; // в INCORRECT — повтор после показа ответа
    const tapKey = (c) => {
        if (!canType || remainingOf(c) <= 0) return;
        const next = [...typed, c];
        setTyped(next);
        if (next.length === targetChars.length) submit(next);
    };

    // Клавиша «по-gboard»: на нажатии — поп-ап превью + хаптик; ВВОД символа — на ОТПУСКАНИИ
    // (pointerup) над той же клавишей. Уход пальца/отмена — без ввода.
    const keyDown = (c, e) => {
        e?.preventDefault();
        if (!canType || remainingOf(c) <= 0) return;
        pressingRef.current = c;
        setPop(c);
        try { navigator.vibrate?.(8); } catch { /* нет вибро — ок */ }
    };
    const keyUp = (c) => {
        if (pressingRef.current === c) {
            tapKey(c);
            try { navigator.vibrate?.(8); } catch { /* нет вибро — ок */ }
        }
        pressingRef.current = null;
        setPop(null);
    };
    const keyCancel = (c) => {
        if (pressingRef.current === c) { pressingRef.current = null; setPop(null); }
    };
    const undo = () => { if (canType) setTyped(typed.slice(0, -1)); };

    // Переход дальше после УСПЕШНОГО повтора (слово зачтено пройденным в gList).
    const advanceWith = (gList) => {
        let next = pickWord(wordsToGame, [...gList, current?.id]);
        if (!next) next = pickWord(wordsToGame, gList);
        if (!next) { setStatus("FINISHED"); playWin(); return; }
        setCurrent(next); setTyped([]); setStatus("ASKING");
    };

    const submit = (sel = typed) => {
        if (status === "CORRECT" || status === "FINISHED") return;
        const answer = sel.join("");
        const ok = norm(answer) === norm(target);
        playSound(ok ? "correct" : "wrong");
        // повтор после ошибки: ответ показан — дальше только когда собрал правильно
        if (status === "INCORRECT") {
            if (ok) {
                const ng = [...guessed, current.id]; setGuessed(ng);   // зачесть без повторной записи в SRS
                if (ng.length === total) { setStatus("FINISHED"); playWin(); } else advanceWith(ng);
            } else {
                setTyped([]); // снова неверно — очистить, пусть пробует ещё
            }
            return;
        }
        // первая попытка
        if (ok) {
            if (!missed.includes(current.id)) record(current, true);
            const ng = [...guessed, current.id]; setGuessed(ng);
            if (ng.length === total) { setStatus("FINISHED"); playWin(); } else setStatus("CORRECT");
        } else {
            if (!missed.includes(current.id)) { setMissed([...missed, current.id]); record(current, false); }
            setTyped([]);              // очистить ввод — сразу можно собирать заново
            setStatus("INCORRECT");
        }
    };

    // Честный «Не знаю»: как неверный — пометит missed, покажет верное слово.
    const dontKnow = () => {
        if (status !== "ASKING") return;
        playSound("wrong");
        if (!missed.includes(current.id)) { setMissed([...missed, current.id]); record(current, false); }
        setTyped([]);              // очистить — после показа ответа можно собрать его заново
        setStatus("INCORRECT");
    };

    const goNext = () => {
        let next = pickWord(wordsToGame, [...guessed, current?.id]);
        if (!next) next = pickWord(wordsToGame, guessed);
        if (!next) { setStatus("FINISHED"); return; }
        setCurrent(next); setTyped([]); setStatus("ASKING");
    };

    const restart = () => { setGuessed([]); setMissed([]); setTyped([]); setCurrent(pickWord(wordsToGame, [])); setStatus("ASKING"); };

    const backToSelection = () => {
        if (onExit) { onExit(); return; }
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    useEffect(() => {  // «Учёба» показывает свой итог — отдаём результат наружу
        if (status === "FINISHED" && onFinish) onFinish({ total, correct: knownFirstTry });
    }, [status]); // eslint-disable-line

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;
    const qIndex = stepTotal ? stepNo : Math.min(guessed.length + 1, total);
    const qTotal = stepTotal || total;
    const segs = segsOverride || Array.from({ length: total }, (_, i) => {
        if (i < guessed.length) return missed.includes(guessed[i]) ? "err" : "ok";
        if (i === guessed.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play play--build" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={guessed.length} wrongCount={missed.length} onExit={backToSelection} t={t} />
            <ProgressSegments segs={segs} />

            <div className="pstage">
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {qTotal}</div>
                    <div className="qprompt">{t.collectFromLetters || "Собери слово · Norsk"}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(prompt, qLang)}</h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {/* собранное слово */}
                    <div className="build-line" lang={aLang}>
                        {built || <span className="build-line__ph">_ _ _</span>}
                    </div>

                    {/* QWERTY-клавиатура (как Gboard): мгновенный ввод по pointerdown, поп-ап превью буквы,
                        хаптик; на мобилке прижата к низу; ⌫ в конце ряда z…m, пробел и ✓ — в ряду действий.
                        Только в ASKING. */}
                    {canType && (
                        <div className="kbd" onContextMenu={(e) => e.preventDefault()}>
                            {KBD_ROWS.map((row, ri) => (
                                <div className={"kbd__row" + (ri === KBD_ROWS.length - 1 ? " kbd__row--last" : "")} key={ri}>
                                    {row.map((c) => {
                                        const need = needed[c] || 0;
                                        const rem = remainingOf(c);
                                        return (
                                            <button key={c} className={"kbd__key" + (need ? "" : " is-off") + (need && rem <= 0 ? " is-spent" : "")}
                                                disabled={!need || rem <= 0}
                                                onPointerDown={(e) => keyDown(c, e)} onPointerUp={() => keyUp(c)} onPointerLeave={() => keyCancel(c)} onPointerCancel={() => keyCancel(c)} lang={aLang}>
                                                {c}
                                                {need > 1 && <span className="kbd__count">{rem}</span>}
                                                {pop === c && <span className="kbd__pop" aria-hidden="true">{c}</span>}
                                            </button>
                                        );
                                    })}
                                    {/* ⌫ как в Gboard — в конце последнего буквенного ряда (рядом с «m») */}
                                    {ri === KBD_ROWS.length - 1 && (
                                        <button className="kbd__key kbd__key--act" onPointerDown={(e) => { e.preventDefault(); try { navigator.vibrate?.(8); } catch { /* нет вибро */ } undo(); }}
                                            disabled={!typed.length} aria-label="backspace"><Icon n="arrow-left" /></button>
                                    )}
                                </div>
                            ))}
                            <div className="kbd__row kbd__row--act">
                                {/* спец-символы слова (дефис и т.п.), кроме пробела — отдельными клавишами */}
                                {extras.filter((c) => c !== " ").map((c) => {
                                    const rem = remainingOf(c);
                                    return (
                                        <button key={c} className={"kbd__key" + (rem <= 0 ? " is-spent" : "")}
                                            disabled={rem <= 0} onPointerDown={(e) => keyDown(c, e)} onPointerUp={() => keyUp(c)} onPointerLeave={() => keyCancel(c)} onPointerCancel={() => keyCancel(c)} lang={aLang}>
                                            {c}
                                            {(needed[c] || 0) > 1 && <span className="kbd__count">{rem}</span>}
                                            {pop === c && <span className="kbd__pop" aria-hidden="true">{c}</span>}
                                        </button>
                                    );
                                })}
                                {/* пробел — всегда в клавиатуре; активен только если в слове есть пробел */}
                                {(() => {
                                    const need = needed[" "] || 0; const rem = remainingOf(" ");
                                    return (
                                        <button className={"kbd__key kbd__key--space" + (need ? "" : " is-off") + (need && rem <= 0 ? " is-spent" : "")}
                                            disabled={!need || rem <= 0} onPointerDown={(e) => keyDown(" ", e)} onPointerUp={() => keyUp(" ")} onPointerLeave={() => keyCancel(" ")} onPointerCancel={() => keyCancel(" ")} aria-label="space">
                                            {need > 1 && <span className="kbd__count">{rem}</span>}
                                            {pop === " " && <span className="kbd__pop" aria-hidden="true">␣</span>}
                                        </button>
                                    );
                                })()}
                                <button className="kbd__key kbd__key--go" onPointerDown={(e) => { e.preventDefault(); submit(); }}
                                    disabled={!typed.length} aria-label="check"><Icon n="check" /></button>
                            </div>
                        </div>
                    )}

                    {status === "INCORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <div className="fb-line">{t.mistake} <b lang={aLang}>{hyphenate(target, aLang)}</b></div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    <div className="pcta">
                        {canType && (
                            <>
                                <button className="gbtn gbtn--ghost" onClick={undo} disabled={!typed.length}><Icon n="arrow-left" sm /> {t.undo || "Стереть"}</button>
                                <button className="gbtn gbtn--accent" onClick={() => submit()} disabled={!typed.length}><Icon n="check" sm /> {t.check}</button>
                            </>
                        )}
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

export default BuildGame;
