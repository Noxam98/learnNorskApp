// @ts-check
// Игра «Порядок слов» (устойчивые выражения): дан родной перевод фразы — собрать норвежскую
// фразу, тапая плитки-слова. К словам фразы подмешаны 2-3 дистрактора (лишние слова). Финальная
// ступень рампы «фразы» (продукция последовательности). Направление — только родной→норв.
// Механика цикла (стейт-машина, SRS, ретрай, авто-переход, финиш) — в useGameLoop; здесь плитки,
// проверка точного порядка, озвучка и рендер.
import { useState, useMemo, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import { DUNNO, PLAY_STYLE, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen, shuffle } from "./gameShared.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { langGuard } from "../../interface/i18nGuard.js";

const norm = (s) => (s || "").trim().toLowerCase();
const L = langGuard({
    ru:  { build: "Составь фразу · Norsk", tap: "Нажимай слова по порядку", phrase: "Фраза", fix: "Собери верно, чтобы продолжить" },
    en:  { build: "Build the phrase · Norsk", tap: "Tap the words in order", phrase: "Phrase", fix: "Build it correctly to continue" },
    ukr: { build: "Склади фразу · Norsk", tap: "Натискай слова по порядку", phrase: "Фраза", fix: "Склади правильно, щоб продовжити" },
    pl:  { build: "Ułóż frazę · Norsk", tap: "Klikaj słowa po kolei", phrase: "Fraza", fix: "Ułóż poprawnie, aby kontynuować" },
    lt:  { build: "Sudėk frazę · Norsk", tap: "Spausk žodžius iš eilės", phrase: "Frazė", fix: "Sudėk teisingai, kad tęstum" },
    lv:  { build: "Saliec frāzi · Norsk", tap: "Spied vārdus pēc kārtas", phrase: "Frāze", fix: "Saliec pareizi, lai turpinātu" },
    ar:  { build: "كوّن العبارة · Norsk", tap: "اضغط الكلمات بالترتيب", phrase: "عبارة", fix: "كوّنها بشكل صحيح للمتابعة" },
}, "OrderGame.L");

export const OrderGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const [placed, setPlaced] = useState(/** @type {string[]} */([]));   // id плиток в порядке ответа

    const loop = useGameLoop({
        gmode: "order", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        speakAnswer: () => (sound && target) ? speakTextEnd(target, aLang) : null,
        onAdvance: () => setPlaced([]),   // новое слово — чистая сборка
        onWrong: () => setPlaced([]),     // после ошибки — собрать заново
    });
    const { t, currentLanguage, total, current, status, missedIds, knownFirstTry, score, qIndex, qTotal, segs, answer, restart, backToSelection } = loop;

    const target = current?.translate?.no?.[0] || current?.no || "";
    const tokens = useMemo(() => norm(target).split(/\s+/).filter(Boolean), [current]); // eslint-disable-line
    // плитки: слова фразы + дистракторы (лишние), стабильные id, порядок перемешан
    const tiles = useMemo(() => {
        const ts = tokens.map((w, i) => ({ id: "t" + i, w }));
        const ds = ((current?.distractors) || []).map((w, i) => ({ id: "d" + i, w: norm(w) }));
        return shuffle([...ts, ...ds]);
    }, [current]); // eslint-disable-line
    const byId = useMemo(() => Object.fromEntries(tiles.map((x) => [x.id, x.w])), [tiles]);

    const qLang = hyLang(currentLanguage, false);  // подсказка — родной
    const aLang = hyLang(currentLanguage, true);    // ответ — норвежский
    const trArr = (current?.translate?.[currentLanguage]?.length ? current.translate[currentLanguage]
        : (current?.translate?.ru?.length ? current.translate.ru : (current?.translate?.en || []))).filter(Boolean);
    const prompt = trArr.join(", ") || "—";
    const lx = L[currentLanguage] || L.ru;

    // при показе озвучиваем запрашиваемое (родной перевод) + прогреваем норвежский ответ
    useEffect(() => {
        if (!sound || status !== "ASKING") return;
        if (trArr[0]) speakText(trArr[0], qLang).catch(() => {});
        if (target) prefetchTts(target, aLang);
    }, [current, sound]); // eslint-disable-line
    // после ошибки озвучиваем верную фразу (после верного — useGameLoop через speakAnswer)
    useEffect(() => {
        if (sound && status === "INCORRECT" && target) speakText(target, aLang).catch(() => {});
    }, [status]); // eslint-disable-line

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const canPlay = status === "ASKING" || status === "INCORRECT";   // в INCORRECT — пересборка после показа
    const placedSet = new Set(placed);
    const bank = tiles.filter((x) => !placedSet.has(x.id));
    const isRight = norm(placed.map((id) => byId[id]).join(" ")) === norm(tokens.join(" "));
    const posText = posLabel(current.part_of_speech, t);

    const add = (id) => { if (canPlay) setPlaced((p) => [...p, id]); };
    const removeAt = (i) => { if (canPlay) setPlaced((p) => p.filter((_, j) => j !== i)); };
    const submit = () => { if (canPlay && placed.length) answer(isRight); };   // верно→дальше; неверно→показ+пересборка
    const dontKnow = () => { if (status === "ASKING") answer(false); };

    return (
        <div className="play play--order" data-state={status.toLowerCase()} style={PLAY_STYLE}>
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

                    {/* строка ответа: собранные плитки (тап — убрать обратно в банк) */}
                    <div className="order-answer" lang={aLang}>
                        {placed.length
                            ? placed.map((id, i) => (
                                <button key={id + "-" + i} className="otile otile--placed" onClick={() => removeAt(i)} disabled={!canPlay}>{byId[id]}</button>
                            ))
                            : <span className="order-answer__ph">{lx.tap}</span>}
                    </div>

                    {/* банк слов (тап — добавить в конец ответа) */}
                    {canPlay && (
                        <div className="order-bank" lang={aLang}>
                            {bank.map((x) => (
                                <button key={x.id} className="otile" onClick={() => add(x.id)}>{x.w}</button>
                            ))}
                        </div>
                    )}

                    {status === "CORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(98,192,131,.16)", color: "var(--game-correct)" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-correct)" }}>{t.correctly}</div>
                        </div>
                    )}
                    {status === "INCORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(tokens.join(" "), aLang)}</div>
                            <div className="fb-line fb-line--cta"><Icon n="edit" sm /> {lx.fix}</div>
                        </div>
                    )}

                    <div className="pcta">
                        {canPlay && (
                            <>
                                <button className="gbtn gbtn--ghost" onClick={dontKnow} disabled={status !== "ASKING"}>{DUNNO[currentLanguage]}</button>
                                <button className="gbtn gbtn--accent" onClick={submit} disabled={!placed.length}><Icon n="check" sm /> {t.check}</button>
                            </>
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

export default OrderGame;
