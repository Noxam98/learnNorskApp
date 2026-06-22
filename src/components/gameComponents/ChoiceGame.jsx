// Игра «Выбор»: 4 варианта, каждое слово ровно один раз, переход по тапу после верного ответа.
// Механика цикла (стейт-машина, SRS, ретрай, переход, финиш) — в useGameLoop; здесь деривация
// слова, загрузка вариантов, озвучка и рендер.
import { useState, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyLang } from "../ui/hyphenate.js";
import { ChoiceQuestion } from "./ChoiceQuestion.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import api from "../tools/api.js";
import { ENDONYM, DUNNO, PLAY_STYLE, shuffle, uniq, PlayTopBar, ProgressSegments, NoWords, FinishScreen, noWithPrefix } from "./gameShared.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { useSystemStore } from "../../store/systemStore.jsx";

export const ChoiceGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
    const isNo2Int = mode !== "int2no";
    const [chosen, setChosen] = useState(null);
    const [options, setOptions] = useState(null);
    const [subOf, setSubOf] = useState({}); // вариант → второй перевод (вторая строка кнопки)

    const loop = useGameLoop({
        gmode: "choice", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, // после верного — показать «верно» ~1с, затем авто-переход
        onAdvance: () => setChosen(null),
    });
    const { t, currentLanguage, total, current, status, words: wordsToGame, results, knownFirstTry, score, qIndex, qTotal, answer, advance, restart, backToSelection } = loop;

    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const question = isNo2Int ? no : (translations.join(", ") || no);
    // для показа норвежского слова-вопроса — с артиклем/«å» по настройке (озвучка читает лемму)
    const promptDisp = isNo2Int ? noWithPrefix(no, current, { articles: showArticles, verbAa: showVerbAa }) : question;
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
        setOptions(null); setSubOf({});
        setChosen(null);
        // второй перевод правильного слова — на вторую строку его кнопки
        const correctSub = (isNo2Int && translations[1]) ? translations[1] : null;
        const applyRich = (rich) => {
            setOptions(shuffle(uniq([correctPrimary, ...rich.map((d) => d.w)])));
            const sub = correctSub ? { [correctPrimary]: correctSub } : {};
            rich.forEach((d) => { if (d.w && d.alt) sub[d.w] = d.alt; });
            setSubOf(sub);
        };
        const localOptions = () => {
            const others = wordsToGame.filter((w) => w.id !== current.id)
                .map((w) => (isNo2Int ? w.translate?.[currentLanguage]?.[0] : w.translate?.no?.[0]));
            setOptions(shuffle(uniq([correctPrimary, ...shuffle(others).slice(0, 3)])));
            setSubOf(correctSub ? { [correctPrimary]: correctSub } : {});
        };
        // Варианты приходят ВМЕСТЕ с сессией (inline) — используем без запроса.
        const pre = current.options?.length ? current.options
            : (current.distractors?.length ? current.distractors.map((w) => ({ w, alt: null })) : null);
        if (pre) { applyRich(pre); return; }
        // Фолбэк (легаси-путь «Игры» / нет inline): дистракторы с бэка, семантически близкие.
        const req = current.pool_id != null
            ? api.getPoolDistractors(current.pool_id, { n: 3, mode, lang: currentLanguage })
            : api.getDistractors(current.id, { n: 3, mode, lang: currentLanguage });
        req
            .then((res) => { if (!cancelled) applyRich(res.options || (res.distractors || []).map((w) => ({ w, alt: null }))); })
            .catch(() => { if (!cancelled) localOptions(); });
        return () => { cancelled = true; };
    }, [status, current, currentLanguage, mode]); // eslint-disable-line

    const choose = (opt) => {
        if (status !== "ASKING") return;
        setChosen(opt);
        answer(opt === correctPrimary);
    };
    // Честный «Не знаю»: ничего не выбрано — подсветится только верный, засчитывается как НЕ угадано.
    const dontKnow = () => { if (status !== "ASKING") return; setChosen(null); answer(false); };
    // После ошибки правильный вариант показан — продолжить можно тапом по ЛЮБОМУ месту.
    const onStageClick = () => { if (status === "INCORRECT") advance(); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const correctCount = results.filter((r) => r.ok).length;
    const wrongCount = results.filter((r) => !r.ok).length;
    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const segs = segsOverride || Array.from({ length: total }, (_, i) => {
        if (i < results.length) return results[i].ok ? "ok" : "err";
        if (i === results.length && status !== "FINISHED") return "now";
        return "";
    });

    return (
        <div className="play" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={correctCount} wrongCount={wrongCount} onExit={backToSelection} t={t} />
            <ProgressSegments segs={segs} />

            <div className="pstage" onClick={onStageClick}
                style={status === "INCORRECT" ? { cursor: "pointer" } : undefined}>
                <ChoiceQuestion
                    prompt={promptDisp}
                    promptLang={qLang}
                    options={options}
                    optionSub={subOf}
                    optionLang={aLang}
                    picked={chosen}
                    correct={correctPrimary}
                    reveal={status === "CORRECT" || status === "INCORRECT"}
                    onPick={choose}
                    posText={posText}
                    hint={`${t.translateTo} ${promptTarget}`}
                    countText={`${t.word} ${qIndex} / ${qTotal}`}
                    disabled={status !== "ASKING"}
                    loading={!options}
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

                {status === "ASKING" && options && (
                    <button className="dunno-corner" onClick={(e) => { e.stopPropagation(); dontKnow(); }}>
                        {DUNNO[currentLanguage]}
                    </button>
                )}

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={wrongCount} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default ChoiceGame;
