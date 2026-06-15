
import { useState, useEffect, useMemo, useRef } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { BrandLoader } from "../ui/Spinner.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakNorwegian } from "../ui/tts.js";
import api from "../tools/api.js";

const ENDONYM = { ru: "русский", ukr: "українську", en: "English", pl: "polski", lt: "lietuvių" };

const filterChosenWords = (dictList) =>
    dictList.flatMap((d) => d.words.filter((w) => w?.gameData?.isChoosedToGame));

const pickWord = (pool, excludeIds) => {
    const left = pool.filter((w) => !excludeIds.includes(w.id));
    return left.length ? left[Math.floor(Math.random() * left.length)] : null;
};

const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const uniq = (arr) => { const s = new Set(); return arr.filter((x) => x && !s.has(x.toLowerCase()) && s.add(x.toLowerCase())); };

export const Game = ({ setGameState, mode = "no2int", quiz = false, sound = false }) => {
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const dictList = useWordsStore((state) => state.dictList);
    const toggleChooseToGame = useWordsStore((state) => state.ToggleChooseToGame);
    const recordGameResult = useWordsStore((state) => state.recordGameResult);
    const t = interfaceTranslate[currentLanguage];

    const wordsToGame = useMemo(() => filterChosenWords(dictList), []);
    const total = wordsToGame.length;
    const isNo2Int = mode !== "int2no";

    const [status, setStatus] = useState("ASKING"); // ASKING | CORRECT | INCORRECT | FINISHED
    // Режим «выбор»: фиксированный перемешанный порядок, каждое слово ровно один раз,
    // прогресс по индексу (qpos), результаты в порядке ответов (results).
    const [order, setOrder] = useState(() => shuffle(wordsToGame));
    const [qpos, setQpos] = useState(0);
    const [results, setResults] = useState([]); // [{ id, ok }] — для quiz
    const [currentW, setCurrentW] = useState(() => quiz ? null : pickWord(wordsToGame, [])); // текущее в режиме ВВОДА
    const [guessed, setGuessed] = useState([]);
    const [missed, setMissed] = useState([]);
    const [input, setInput] = useState("");
    const [options, setOptions] = useState(null); // варианты для режима «выбор»
    const [chosen, setChosen] = useState(null);
    const inputRef = useRef(null);

    const current = quiz ? (order[qpos] || null) : currentW;
    const knownFirstTry = quiz ? results.filter((r) => r.ok).length : guessed.filter((id) => !missed.includes(id)).length;
    const correctCount = quiz ? results.filter((r) => r.ok).length : guessed.length;
    const wrongCount = quiz ? results.filter((r) => !r.ok).length : missed.length;

    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    const accepted = (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    const correctPrimary = (isNo2Int ? translations[0] : no) || "";
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);    // язык вопроса (слова)
    const aLang = hyLang(currentLanguage, !isNo2Int);   // язык вариантов/ответов

    useEffect(() => {
        if (!quiz && status === "ASKING" && inputRef.current) inputRef.current.focus();
    }, [status, current, quiz]);

    // Озвучка в режиме ВВОДА, если исходное слово норвежское — играем при показе вопроса.
    useEffect(() => {
        if (sound && !quiz && isNo2Int && status === "ASKING" && no) speakNorwegian(no).catch(() => {});
    }, [current, sound]); // eslint-disable-line

    // В режиме ВВОДА верный ответ авто-переходит. В режиме «выбор» — переход по
    // второму клику по экрану (см. onClick у .pstage), таймера нет.
    useEffect(() => {
        if (!quiz && status === "CORRECT") {
            const timer = setTimeout(() => goNext(), 1100);
            return () => clearTimeout(timer);
        }
    }, [status]); // eslint-disable-line

    // Подгрузка вариантов для режима «выбор».
    useEffect(() => {
        if (!quiz || status !== "ASKING" || !current) return;
        let cancelled = false;
        setOptions(null);
        setChosen(null);
        api.getDistractors(current.id, { n: 3, mode, lang: currentLanguage })
            .then((res) => {
                if (cancelled) return;
                setOptions(shuffle(uniq([correctPrimary, ...(res.distractors || [])])));
            })
            .catch(() => {
                if (cancelled) return;
                const others = wordsToGame
                    .filter((w) => w.id !== current.id)
                    .map((w) => (isNo2Int ? w.translate?.[currentLanguage]?.[0] : w.translate?.no?.[0]));
                setOptions(shuffle(uniq([correctPrimary, ...shuffle(others).slice(0, 3)])));
            });
        return () => { cancelled = true; };
    }, [quiz, status, current, currentLanguage, mode]);

    const applyResult = (ok) => {
        if (quiz) {
            // Каждое слово ровно один раз: фиксируем результат и сразу двигаем прогресс.
            recordGameResult(current.id, ok);
            setResults((rs) => [...rs, { id: current.id, ok }]);
            setStatus(ok ? "CORRECT" : "INCORRECT");
            return;
        }
        if (ok) {
            if (!missed.includes(current.id)) recordGameResult(current.id, true);
            const ng = [...guessed, current.id];
            setGuessed(ng);
            setStatus(ng.length === total ? "FINISHED" : "CORRECT");
        } else {
            if (!missed.includes(current.id)) {
                setMissed([...missed, current.id]);
                recordGameResult(current.id, false);
            }
            setStatus("INCORRECT");
        }
    };

    const goNext = () => {
        if (quiz) {
            if (qpos + 1 >= total) { setStatus("FINISHED"); return; }
            setQpos(qpos + 1);
            setChosen(null);
            setStatus("ASKING");
            return;
        }
        let next = pickWord(wordsToGame, [...guessed, current?.id]);
        if (!next) next = pickWord(wordsToGame, guessed);
        if (!next) { setStatus("FINISHED"); return; }
        setCurrentW(next);
        setInput("");
        setChosen(null);
        setStatus("ASKING");
    };

    const submit = (e) => {
        e?.preventDefault();
        if (status === "INCORRECT") { goNext(); return; }
        if (status !== "ASKING") return;
        const answer = input.trim().toLowerCase();
        applyResult(accepted.some((a) => a.toLowerCase() === answer));
    };

    // Режим «выбор»: второй клик по экрану (после ответа) — следующее слово.
    const onStageClick = () => {
        if (quiz && (status === "CORRECT" || status === "INCORRECT")) goNext();
    };

    const choose = (opt) => {
        if (status !== "ASKING") return;
        setChosen(opt);
        if (sound && no) speakNorwegian(no).catch(() => {});  // после выбора — озвучить правильное норвежское
        applyResult(opt === correctPrimary);
    };

    const restart = () => {
        setGuessed([]); setMissed([]); setResults([]); setQpos(0);
        setOrder(shuffle(wordsToGame));
        setInput(""); setChosen(null);
        setCurrentW(quiz ? null : pickWord(wordsToGame, []));
        setStatus("ASKING");
    };

    const backToSelection = () => {
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    const playStyle = { position: "fixed", inset: 0, zIndex: 90, overflow: "hidden" };

    if (total === 0 || !current) {
        return (
            <div className="play" data-state="asking" style={playStyle}>
                <div className="pstage">
                    <p className="qprompt">{t.noWordsToPlay}</p>
                    <button className="gbtn gbtn--accent" onClick={() => setGameState("chooseWords")}>
                        <Icon n="arrow-left" sm /> {t.backToWordSelection}
                    </button>
                </div>
            </div>
        );
    }

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const otherAccepted = accepted.filter((a) => a.toLowerCase() !== input.trim().toLowerCase());
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;
    const qIndex = Math.min((quiz ? qpos : guessed.length) + 1, total);
    // Сегменты прогресс-бара: по слову. Пройденные красятся по результату
    // (красный — ошибка, зелёный — верно), текущее — акцент.
    const segs = Array.from({ length: total }, (_, i) => {
        if (quiz) {
            if (i < results.length) return results[i].ok ? "ok" : "err";
            if (i === results.length && status !== "FINISHED") return "now";
            return "";
        }
        if (i < guessed.length) return missed.includes(guessed[i]) ? "err" : "ok";
        if (i === guessed.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play" data-state={status.toLowerCase()} style={playStyle}>
            <div className="ptop">
                <a className="ptop__brand" onClick={backToSelection} style={{ cursor: "pointer" }}>
                    <BrandMark />
                    <span className="brand__name">Lære<b>·</b>Norsk</span>
                </a>
                <div className="pstats">
                    <span className="stat stat--ok"><Icon n="check" sm /> {correctCount}</span>
                    <span className="stat stat--err"><Icon n="x" sm /> {wrongCount}</span>
                </div>
                <a className="pexit" onClick={backToSelection} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
            </div>

            <div className="pbar pbar--seg" aria-hidden="true">
                {segs.map((s, i) => <span key={i} className={`pseg${s ? " is-" + s : ""}`} />)}
            </div>

            <div className="pstage" onClick={onStageClick}
                style={quiz && (status === "CORRECT" || status === "INCORRECT") ? { cursor: "pointer" } : undefined}>
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {total}</div>
                    <div className="qprompt">{t.translateTo} {promptTarget}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(question, qLang)}
                        {isNo2Int && (
                            <SpeakButton text={no} hasTts={current.hasTts} className="qspeak" lg
                                ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                        )}
                    </h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {quiz ? (
                        <div className="choices">
                            {(options || []).map((opt) => {
                                const reveal = status === "CORRECT" || status === "INCORRECT";
                                const cls = reveal
                                    ? (opt === correctPrimary ? " is-correct" : (opt === chosen ? " is-wrong" : ""))
                                    : "";
                                return (
                                    <button key={opt} className={`choice${cls}`} lang={aLang} disabled={status !== "ASKING"} onClick={() => choose(opt)}>
                                        {hyphenate(opt, aLang)}
                                    </button>
                                );
                            })}
                            {!options && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <BrandLoader dark />
                                </div>
                            )}
                        </div>
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
                            {!quiz && otherAccepted.length > 0 && <div className="fb-line">{t.alsoAccepted} <b lang={aLang}>{hyphenate(otherAccepted.join(", "), aLang)}</b></div>}
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
                        {quiz
                            ? ((status === "CORRECT" || status === "INCORRECT") &&
                                <span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span>)
                            : (status === "INCORRECT"
                                ? <button className="gbtn gbtn--accent" onClick={goNext}>{t.next} <Icon n="arrow-right" sm /></button>
                                : <button className="gbtn gbtn--accent" onClick={submit} disabled={status === "CORRECT"}><Icon n="check" sm /> {t.check}</button>)}
                    </div>
                </div>

                {status === "FINISHED" && (
                    <div className="finish" style={{ display: "block" }}>
                        <div className="qcount">{t.gameFinished}</div>
                        <div className="finish__score">{score}%</div>
                        <div className="finish__sub">{knownFirstTry} / {total}</div>
                        <div className="finish__grid">
                            <div className="fstat"><div className="fstat__n ok">{knownFirstTry}</div><div className="fstat__l">{t.guessedStats?.[0]}</div></div>
                            <div className="fstat"><div className="fstat__n err">{missed.length}</div><div className="fstat__l">{t.mistakesMade}</div></div>
                            <div className="fstat"><div className="fstat__n">{total}</div><div className="fstat__l">{t.word}</div></div>
                        </div>
                        <div className="pcta">
                            <button className="gbtn gbtn--accent" onClick={restart}><Icon n="play" sm /> {t.playAgain}</button>
                            <button className="gbtn gbtn--ghost" onClick={backToSelection}><Icon n="arrow-left" sm /> {t.backToWordSelection}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
