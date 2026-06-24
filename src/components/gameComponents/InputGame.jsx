// @ts-check
// Игра «Ввод»: игрок печатает перевод. Для НОРВЕЖСКОГО ответа (int2no) — наша экранная клавиатура
// (свободный режим, без подсказок-букв), как в «Сборке». Для родного языка (no2int) — штатный
// инпут (нашей раскладкой кириллицу/др. не набрать, да и смысла печатать родной нет).
// На верном — авто-переход; на ошибке — показ ответа, ввод сбрасывается, дальше — когда введёт верно.
// Механика цикла (стейт-машина, SRS, ретрай, авто-переход, финиш) — в useGameLoop.
import { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel, wordForms } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import { playSound } from "../tools/sound.js";
import { ENDONYM, DUNNO, PLAY_STYLE, foldLoose, withinOneEdit, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen, noWithPrefix, tplSlots } from "./gameShared.jsx";
import { GameKeyboard, keysAdjacent } from "./GameKeyboard.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { useSystemStore } from "../../store/systemStore.jsx";

// «С опечаткой, но засчитано» — снисходительный зачёт (1 правка).
const TYPO_OK = { ru: "С опечаткой — но засчитано:", ukr: "З опискою — але зараховано:", en: "Typo — but accepted:", pl: "Literówka — ale zaliczono:", lt: "Su klaida — bet užskaityta:" };
// Вопрос при близкой опечатке (замена соседних клавиш / перестановка / пропуск-лишняя буква).
const TYPO_ASK = { ru: "Похоже на опечатку. Это она?", ukr: "Схоже на описку. Це вона?", en: "Looks like a typo. Was it?", pl: "Wygląda na literówkę. To ona?", lt: "Panašu į klaidą. Ar taip?" };
const TYPO_YES = { ru: "Да, опечатка", ukr: "Так, описка", en: "Yes, a typo", pl: "Tak, literówka", lt: "Taip, klaida" };
const TYPO_NO = { ru: "Нет, ошибся", ukr: "Ні, помилився", en: "No, I was wrong", pl: "Nie, błąd", lt: "Ne, suklydau" };

export const InputGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const isNo2Int = mode !== "int2no";
    // печатаем норвежское → наша экранная клавиатура; для ввода родного перевода (no2int) — штатный инпут
    const useKbd = !isNo2Int;
    const [input, setInput] = useState("");
    const [typoAsk, setTypoAsk] = useState(/** @type {{typed:string, correct:string}|null} */(null)); // найден near-miss — спросить «опечатка?»
    const [typoOk, setTypoOk] = useState(false);   // ответ принят с одной опечаткой (повтор)
    const [armed, setArmed] = useState(false);     // анти-ghost-click: тап-продолжение активируется не сразу
    const typoRef = useRef(false);                  // тот же флаг для onFinish (без гонок ререндера)
    const inputRef = useRef(/** @type {HTMLInputElement | null} */(null));
    const submitArmedRef = useRef(false);           // дебаунс: ~250мс после нового слова submit не принимается
    //                                                 (чтобы фантомный Enter с прошлого задания не сработал)
    // Очистить поле и (для штатного инпута) вернуть фокус — чтобы после ошибки сразу вводить заново.
    const resetInput = () => { setInput(""); setTimeout(() => inputRef.current?.focus(), 0); };

    const loop = useGameLoop({
        gmode: "input", words: wordsProp, onResult, setGameState,
        // в onFinish прокидываем флаг «принято с опечаткой» — для пункта «Защищено с опечаткой» в итоге
        onFinish: onFinish ? (s) => onFinish({ ...s, typo: typoRef.current }) : null,
        onExit,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        // со звуком пауза перед переходом = длина озвучки ответа + хвост (correctPrimary/aLang ниже).
        // При опечатке (held) переход по тапу — там озвучивает сама игра, см. эффект ниже.
        speakAnswer: () => (sound && correctPrimary) ? speakTextEnd(correctPrimary, aLang) : null,
        onAdvance: () => { setInput(""); setTypoOk(false); setTypoAsk(null); typoRef.current = false; },   // новое слово — чистое поле
        onWrong: () => { resetInput(); setTypoOk(false); setTypoAsk(null); typoRef.current = false; },     // после ошибки — сбросить (и сфокусировать штатный инпут)
    });
    const { t, currentLanguage, total, current, status, held, missedIds, doneCount, knownFirstTry, score, qIndex, qTotal, segs, answer, advance, restart, backToSelection } = loop;

    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    const accepted = (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    // при ВВОДе норвежского (int2no) принимаем и словоформы (hunden/snakker/snakket), не только лемму;
    // для родного (no2int) словоформ нет. Для отображения «также принято» используем accepted (без форм).
    const acceptSet = isNo2Int ? accepted : [...accepted, ...wordForms(no, current?.forms)];
    // показ норв. слова — с артиклем/«å» по настройке: вопрос (no2int) и раскрытый ответ (int2no).
    // Озвучка и сверка ввода — по «голой» лемме (артикль не печатают).
    const promptDisp = isNo2Int ? noWithPrefix(no, current, { articles: showArticles, verbAa: showVerbAa }) : question;
    const answerDisp = isNo2Int ? accepted.join(", ")
        : [noWithPrefix(accepted[0] || no, current, { articles: showArticles, verbAa: showVerbAa }), ...accepted.slice(1)].join(", ");
    const correctPrimary = (isNo2Int ? translations[0] : no) || "";
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);
    const aLang = hyLang(currentLanguage, !isNo2Int);
    const canType = status === "ASKING" || status === "INCORRECT";

    // дебаунс submit: на новом слове блокируем отправку на 250мс (анти-фантомный Enter с прошлого задания)
    useEffect(() => {
        submitArmedRef.current = false;
        const tm = setTimeout(() => { submitArmedRef.current = true; }, 250);
        return () => clearTimeout(tm);
    }, [current]);

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
    // Озвучка верного ответа: после ОШИБКИ, а также при принятой ОПЕЧАТКЕ (held — переход по тапу).
    // После обычного ВЕРНОГО озвучкой+паузой управляет useGameLoop (speakAnswer), чтобы авто-переход
    // совпал с длиной аудио.
    useEffect(() => {
        if (sound && correctPrimary && (status === "INCORRECT" || (status === "CORRECT" && held))) {
            speakText(correctPrimary, aLang).catch(() => {});
        }
    }, [status]); // eslint-disable-line

    const submit = (e) => {
        e?.preventDefault?.();
        if (!submitArmedRef.current || typoAsk) return;   // дебаунс + не отправляем, пока ждём ответа на «опечатка?»
        const fin = foldLoose(input);
        if (acceptSet.some((a) => foldLoose(a) === fin)) { setTypoOk(false); typoRef.current = false; answer(true); return; }
        // Близкая опечатка: ОДНА правка (замена — только соседних по клаве букв / перестановка / пропуск-
        // лишняя), слова от 4 букв (на коротких 1 правка ≈ другое слово). НЕ зачитываем сами — показываем
        // что нашли и спрашиваем пользователя (он сам отвечает за свою учёбу). Только при вводе норвежского
        // (наша раскладка → карта соседства валидна).
        if (useKbd && fin.length >= 4) {
            const hit = acceptSet.find((a) => { const fa = foldLoose(a); return fa.length >= 4 && withinOneEdit(fa, fin, keysAdjacent); });
            if (hit) { setTypoAsk({ typed: input.trim(), correct: hit }); return; }
        }
        // ввод родного (no2int): карты соседства нет — прежнее поведение (тихий зачёт опечатки на повторе)
        if (!useKbd) {
            const typo = repeat && fin.length >= 4 && acceptSet.some((a) => { const fa = foldLoose(a); return fa.length >= 4 && withinOneEdit(fa, fin); });
            if (typo) { setTypoOk(true); typoRef.current = true; playSound("typo"); answer(true, { hold: true, silent: true }); return; }
        }
        setTypoOk(false); typoRef.current = false; answer(false);
    };
    // «Да, опечатка» — засчитываем верно (тег «с опечаткой»), без авто-перехода: дать прочитать верное → тап.
    const confirmTypo = () => { setTypoAsk(null); setTypoOk(true); typoRef.current = true; playSound("typo"); answer(true, { hold: true, silent: true }); };
    // «Нет, ошибся» — обычная ошибка.
    const denyTypo = () => { setTypoAsk(null); setTypoOk(false); typoRef.current = false; answer(false); };
    const dontKnow = () => { if (status === "ASKING") answer(false); };
    // принято с опечаткой: авто-перехода нет — продолжаем тапом по любому месту сцены.
    // «Взвод» (~400мс): иначе тот же тап, что отправил ответ, долетает «ghost click» по сцене
    // (клавиатура исчезла) и мгновенно перескакивает, не дав прочитать верное написание.
    useEffect(() => {
        if (status === "CORRECT" && typoOk) {
            setArmed(false);
            const tm = setTimeout(() => setArmed(true), 400);
            return () => clearTimeout(tm);
        }
        setArmed(false);
    }, [status, typoOk]);
    const onStageClick = () => { if (status === "CORRECT" && typoOk && armed) advance(); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const otherAccepted = accepted.filter((a) => foldLoose(a) !== foldLoose(input));
    // экранный ввод: после ошибки (и при вопросе «опечатка?») показываем ШАБЛОН правильного слова
    // (тусклым) + красным неверные буквы по позициям — это и есть «что мы нашли». До этого — обычный ввод.
    const tplTarget = (typoAsk ? typoAsk.correct : (no || "")).trim().toLowerCase();
    const inputSlots = useKbd ? tplSlots([...input], [...tplTarget], { tpl: status === "INCORRECT" || !!typoAsk, caret: canType && !typoAsk }) : null;

    return (
        <div className={"play" + (useKbd ? " play--kbd" : "")} data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={baseCorrect + knownFirstTry} wrongCount={baseWrong + missedIds.size} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage" onClick={onStageClick}
                style={status === "CORRECT" && typoOk ? { cursor: "pointer" } : undefined}>
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {qTotal}</div>
                    <div className="qprompt">{t.translateTo} {promptTarget}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(promptDisp, qLang)}
                        <SpeakButton text={question} lang={qLang} className="qspeak" lg
                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                    </h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {useKbd ? (
                        <div className="build-line" lang={aLang}>
                            <span className="build-line__row">{inputSlots && inputSlots.length ? inputSlots : <span className="build-line__ph">_ _ _</span>}</span>
                        </div>
                    ) : (
                        <form className="answer" onSubmit={submit}>
                            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                                placeholder={t.yourAnswer} autoComplete="off" spellCheck="false"
                                disabled={status === "CORRECT"} />
                        </form>
                    )}

                    {status === "CORRECT" && typoOk && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(232,170,72,.18)", color: "#d98a2b" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "#d98a2b" }}>{TYPO_OK[currentLanguage] || TYPO_OK.en}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(correctPrimary, aLang)}</div>
                            <div className="pcta"><span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span></div>
                        </div>
                    )}
                    {status === "CORRECT" && !typoOk && (
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
                            <div className="fb-answer" lang={aLang}>{hyphenate(answerDisp, aLang)}</div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    {/* близкая опечатка: показали красным в инпуте, что нашли + верное написание; спрашиваем юзера */}
                    {typoAsk && (
                        <div className="feedback typo-ask" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(232,170,72,.18)", color: "#d98a2b" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "#d98a2b" }}>{TYPO_ASK[currentLanguage] || TYPO_ASK.en}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(typoAsk.correct, aLang)}</div>
                            <div className="typo-ask__btns">
                                <button className="gbtn gbtn--accent" onClick={confirmTypo}><Icon n="check" sm /> {TYPO_YES[currentLanguage] || TYPO_YES.en}</button>
                                <button className="gbtn" onClick={denyTypo}><Icon n="x" sm /> {TYPO_NO[currentLanguage] || TYPO_NO.en}</button>
                            </div>
                        </div>
                    )}

                    {/* наша клавиатура (свободный режим — без подсказок-букв), только для норвежского ответа */}
                    {useKbd && canType && !typoAsk && (
                        <GameKeyboard
                            lang={aLang} extras={["-"]}
                            canSubmit canBackspace={input.length > 0}
                            onType={(c) => setInput(input + c)} onBackspace={() => setInput((s) => s.slice(0, -1))} onSubmit={() => submit()}
                            onDunno={dontKnow} showDunno={status === "ASKING"} dunnoLabel={DUNNO[currentLanguage]} />
                    )}

                    <div className="pcta">
                        {status !== "CORRECT" && !typoAsk &&
                            <button className="gbtn gbtn--accent" onClick={submit}><Icon n="check" sm /> {t.check}</button>}
                    </div>
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missedIds.size} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>

            {/* «Не знаю»: с экранной клавиатурой — её рисует сама GameKeyboard (над панелью, единообразно).
                Без неё (физическая клава / ввод в поле) — неприметная угловая кнопка, прямой ребёнок .play
                (чтобы её не подрезал overflow:hidden у .pstage). */}
            {status === "ASKING" && !useKbd && (
                <button className="dunno-corner" onClick={dontKnow}>{DUNNO[currentLanguage]}</button>
            )}
        </div>
    );
};

export default InputGame;
