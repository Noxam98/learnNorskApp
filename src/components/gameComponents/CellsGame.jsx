// @ts-check
// Игра «Напечатай фразу» (устойчивые выражения): дан родной перевод — набрать норвежскую фразу
// по буквам. Пустые КЛЕТКИ сгруппированы по словам (видны длины слов и границы) — каркас-подсказка.
// Финальная ступень рампы фраз (продукция по памяти, сложнее «порядка слов»). Клавиатура — только
// буквы фразы (как «собери из букв»). Механика цикла (SRS/ретрай/переход/финиш) — в useGameLoop.
import { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import { DUNNO, PLAY_STYLE, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen , RampCheer , RampDrop , usePlayDialogRef } from "./gameShared.jsx";
import { GameKeyboard, KBD_SET } from "./GameKeyboard.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { langGuard } from "../../interface/i18nGuard.js";

const norm = (s) => (s || "").trim().toLowerCase();
const L = langGuard({
    ru:  { build: "Напечатай фразу · Norsk", phrase: "Фраза", fix: "Набери верно, чтобы продолжить" },
    en:  { build: "Type the phrase · Norsk", phrase: "Phrase", fix: "Type it correctly to continue" },
    ukr: { build: "Надрукуй фразу · Norsk", phrase: "Фраза", fix: "Набери правильно, щоб продовжити" },
    pl:  { build: "Wpisz frazę · Norsk", phrase: "Fraza", fix: "Wpisz poprawnie, aby kontynuować" },
    lt:  { build: "Įvesk frazę · Norsk", phrase: "Frazė", fix: "Įvesk teisingai, kad tęstum" },
    lv:  { build: "Ieraksti frāzi · Norsk", phrase: "Frāze", fix: "Ieraksti pareizi, lai turpinātu" },
    ar:  { build: "اكتب العبارة · Norsk", phrase: "عبارة", fix: "اكتبها بشكل صحيح للمتابعة" },
}, "CellsGame.L");

export const CellsGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const [typed, setTyped] = useState(/** @type {string[]} */([]));   // введённые буквы по порядку (без пробелов)
    const submitArmedRef = useRef(false);   // дебаунс ~250мс после нового слова (анти-фантомный Enter)

    const loop = useGameLoop({
        gmode: "cells", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        speakAnswer: () => (sound && target) ? speakTextEnd(target, aLang) : null,
        onAdvance: () => setTyped([]),   // новое слово — чистый ввод
        onWrong: () => setTyped([]),     // после ошибки — очистить, набрать заново
    });
    const { t, currentLanguage, total, current, status, missedIds, knownFirstTry, score, qIndex, qTotal, segs, answer, restart, backToSelection } = loop;

    const playRef = usePlayDialogRef();
    const target = current?.translate?.no?.[0] || current?.no || "";
    const tokens = useMemo(() => norm(target).split(/\s+/).filter(Boolean), [current]); // eslint-disable-line
    // плоский список клеток в порядке букв (без пробелов): {wi, ch}
    const cells = useMemo(() => {
        const out = [];
        tokens.forEach((tok, wi) => { for (const ch of tok) out.push({ wi, ch }); });
        return out;
    }, [current]); // eslint-disable-line
    const targetChars = useMemo(() => cells.map((c) => c.ch), [cells]);   // целевые буквы по порядку
    const needed = useMemo(() => {
        const m = /** @type {Record<string, number>} */ ({}); for (const c of targetChars) m[c] = (m[c] || 0) + 1; return m;
    }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps
    const extras = useMemo(() => Object.keys(needed).filter((c) => !KBD_SET.has(c)), [cells]); // eslint-disable-line react-hooks/exhaustive-deps
    const remainingOf = (c) => (needed[c] || 0) - typed.filter((x) => x === c).length;

    const qLang = hyLang(currentLanguage, false);  // подсказка — родной
    const aLang = hyLang(currentLanguage, true);    // ответ — норвежский
    const trArr = (current?.translate?.[currentLanguage]?.length ? current.translate[currentLanguage]
        : (current?.translate?.ru?.length ? current.translate.ru : (current?.translate?.en || []))).filter(Boolean);
    const prompt = trArr.join(", ") || "—";
    const lx = L[currentLanguage] || L.ru;

    useEffect(() => {
        if (!sound || status !== "ASKING") return;
        if (trArr[0]) speakText(trArr[0], qLang).catch(() => {});
        if (target) prefetchTts(target, aLang);
    }, [current, sound]); // eslint-disable-line
    useEffect(() => {
        if (sound && status === "INCORRECT" && target) speakText(target, aLang).catch(() => {});
    }, [status]); // eslint-disable-line

    const canType = status === "ASKING" || status === "INCORRECT";   // в INCORRECT — повтор после показа
    const assistKey = targetChars[typed.length] || null;   // ожидаемая по порядку буква → расширить тап-зону

    useEffect(() => {
        submitArmedRef.current = false;
        const tm = setTimeout(() => { submitArmedRef.current = true; }, 250);
        return () => clearTimeout(tm);
    }, [current]);

    const submit = () => { if (!submitArmedRef.current) return; answer(norm(typed.join("")) === norm(targetChars.join(""))); };
    const onType = (c) => setTyped((p) => (p.length < targetChars.length ? [...p, c] : p));   // не больше числа клеток
    const dontKnow = () => { if (status === "ASKING") answer(false); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;
    const posText = posLabel(current.part_of_speech, t);
    const showTpl = status === "INCORRECT";   // после ошибки показываем верные буквы в клетках

    let gi = -1;   // сквозной индекс клетки при отрисовке по словам
    return (
        <div ref={playRef} className="play play--cells" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={baseCorrect + knownFirstTry} wrongCount={baseWrong + missedIds.size} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage">
                <div className="qcard">
                    <div className="qcount">{lx.phrase} {qIndex} / {qTotal}</div>
                    <div className="qprompt">{lx.build}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(prompt, qLang)}
                        {trArr[0] && <SpeakButton text={trArr[0]} lang={qLang} className="qspeak"
                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />}
                    </h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {/* клетки по словам: пустые = длины слов; заполняются по мере ввода. После ошибки —
                        тусклая верная буква + подсветка верных/красных. */}
                    <div className="cells-line" lang={aLang}>
                        {tokens.map((tok, wi) => (
                            <span className="cells-word" key={wi}>
                                {[...tok].map((ch, ci) => {
                                    gi += 1; const tc = typed[gi];
                                    let cls = "cell";
                                    if (showTpl) cls += tc == null ? " cell--tpl" : (norm(tc) === norm(ch) ? " cell--ok" : " cell--bad");
                                    else if (tc != null) cls += " cell--filled";
                                    if (canType && gi === typed.length) cls += " cell--caret";
                                    return <span className={cls} key={ci}>{tc != null ? tc : (showTpl ? ch : "")}</span>;
                                })}
                            </span>
                        ))}
                    </div>

                    {canType && (
                        <GameKeyboard
                            lang={aLang} remainingOf={remainingOf} needed={needed} extras={extras} assistKey={assistKey}
                            canSubmit canBackspace={typed.length > 0}
                            onType={onType} onBackspace={() => setTyped((p) => p.slice(0, -1))} onSubmit={submit}
                            onDunno={dontKnow} dunnoLabel={DUNNO[currentLanguage]} showDunno={status === "ASKING"} />
                    )}

                    {status === "CORRECT" && (
                        <div className="feedback" role="status" aria-live="polite" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(98,192,131,.16)", color: "var(--game-correct)" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-correct)" }}>{t.correctly}</div>
                            <RampCheer word={current} rank={rank} repeat={repeat} gmode="cells" />
                        </div>
                    )}
                    {status === "INCORRECT" && (
                        <div className="feedback" role="status" aria-live="polite" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <RampDrop word={current} rank={rank} />
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(target, aLang)}</div>
                            <div className="fb-line fb-line--cta"><Icon n="edit" sm /> {lx.fix}</div>
                        </div>
                    )}

                    <div className="pcta">
                        {canType && (
                            <button className="gbtn gbtn--accent" onClick={submit}><Icon n="check" sm /> {t.check}</button>
                        )}
                    </div>
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missedIds.size} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default CellsGame;
