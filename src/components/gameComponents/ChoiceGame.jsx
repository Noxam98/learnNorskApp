// Игра «Выбор»: 4 варианта, каждое слово ровно один раз, переход по второму
// клику по экрану. Озвучка (если включена) — видимого слова и правильного ответа.
import { useState, useEffect, useMemo } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandLoader } from "../ui/Spinner.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { speakText, prefetchTts } from "../ui/tts.js";
import api from "../tools/api.js";
import { ENDONYM, PLAY_STYLE, filterChosenWords, shuffle, uniq, PlayTopBar, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";

export const ChoiceGame = ({ setGameState, mode = "no2int", sound = false }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const recordGameResult = useWordsStore((s) => s.recordGameResult);
    const t = interfaceTranslate[currentLanguage];

    const wordsToGame = useMemo(() => aiPlay || filterChosenWords(dictList), []);
    const total = wordsToGame.length;
    const isNo2Int = mode !== "int2no";

    const [status, setStatus] = useState("ASKING"); // ASKING | CORRECT | INCORRECT | FINISHED
    const [order, setOrder] = useState(() => shuffle(wordsToGame)); // фикс. порядок, каждое слово 1 раз
    const [qpos, setQpos] = useState(0);
    const [results, setResults] = useState([]); // [{ id, ok }] в порядке ответов
    const [options, setOptions] = useState(null);
    const [chosen, setChosen] = useState(null);

    const current = order[qpos] || null;
    const correctCount = results.filter((r) => r.ok).length;
    const wrongCount = results.filter((r) => !r.ok).length;
    const knownFirstTry = correctCount;

    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    const accepted = (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    const correctPrimary = (isNo2Int ? translations[0] : no) || "";
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);    // язык вопроса
    const aLang = hyLang(currentLanguage, !isNo2Int);   // язык ответа/вариантов

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

    // Подгрузка вариантов.
    useEffect(() => {
        if (status !== "ASKING" || !current) return;
        let cancelled = false;
        setOptions(null);
        setChosen(null);
        api.getDistractors(current.id, { n: 3, mode, lang: currentLanguage })
            .then((res) => { if (!cancelled) setOptions(shuffle(uniq([correctPrimary, ...(res.distractors || [])]))); })
            .catch(() => {
                if (cancelled) return;
                const others = wordsToGame.filter((w) => w.id !== current.id)
                    .map((w) => (isNo2Int ? w.translate?.[currentLanguage]?.[0] : w.translate?.no?.[0]));
                setOptions(shuffle(uniq([correctPrimary, ...shuffle(others).slice(0, 3)])));
            });
        return () => { cancelled = true; };
    }, [status, current, currentLanguage, mode]); // eslint-disable-line

    const goNext = () => {
        if (qpos + 1 >= total) { setStatus("FINISHED"); return; }
        setQpos(qpos + 1);
        setChosen(null);
        setStatus("ASKING");
    };

    const choose = (opt) => {
        if (status !== "ASKING") return;
        const ok = opt === correctPrimary;
        setChosen(opt);
        recordGameResult(current.id, ok);
        setResults((rs) => [...rs, { id: current.id, ok }]);
        setStatus(ok ? "CORRECT" : "INCORRECT");
    };

    // Второй клик по экрану (после ответа) — следующее слово.
    const onStageClick = () => {
        if (status === "CORRECT" || status === "INCORRECT") goNext();
    };

    const restart = () => {
        setResults([]); setQpos(0); setOrder(shuffle(wordsToGame)); setChosen(null); setStatus("ASKING");
    };

    const backToSelection = () => {
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    if (total === 0 || !current) return <NoWords t={t} onBack={() => setGameState("chooseWords")} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;
    const qIndex = Math.min(qpos + 1, total);
    const segs = Array.from({ length: total }, (_, i) => {
        if (i < results.length) return results[i].ok ? "ok" : "err";
        if (i === results.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={correctCount} wrongCount={wrongCount} onExit={backToSelection} t={t} />
            <ProgressSegments segs={segs} />

            <div className="pstage" onClick={onStageClick}
                style={(status === "CORRECT" || status === "INCORRECT") ? { cursor: "pointer" } : undefined}>
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {total}</div>
                    <div className="qprompt">{t.translateTo} {promptTarget}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(question, qLang)}</h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    <div className="choices">
                        {(options || []).map((opt) => {
                            const reveal = status === "CORRECT" || status === "INCORRECT";
                            const cls = reveal ? (opt === correctPrimary ? " is-correct" : (opt === chosen ? " is-wrong" : "")) : "";
                            return (
                                <button key={opt} className={`choice${cls}`} lang={aLang} disabled={status !== "ASKING"} onClick={() => choose(opt)}>
                                    {hyphenate(opt, aLang)}
                                </button>
                            );
                        })}
                        {!options && <div style={{ gridColumn: "1 / -1" }}><BrandLoader dark /></div>}
                    </div>

                    {status === "INCORRECT" && descriptionText && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-line muted">{descriptionText}</div>
                        </div>
                    )}

                    <div className="pcta">
                        {(status === "CORRECT" || status === "INCORRECT") &&
                            <span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span>}
                    </div>
                </div>

                {status === "FINISHED" && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={wrongCount} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default ChoiceGame;
