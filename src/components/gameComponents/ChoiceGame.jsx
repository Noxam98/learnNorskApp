// Игра «Выбор»: 4 варианта, каждое слово ровно один раз, переход по второму
// клику по экрану. Озвучка (если включена) — видимого слова и правильного ответа.
import { useState, useEffect, useMemo } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyLang } from "../ui/hyphenate.js";
import { ChoiceQuestion } from "./ChoiceQuestion.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import api from "../tools/api.js";
import { ENDONYM, DUNNO, PLAY_STYLE, filterChosenWords, shuffle, uniq, PlayTopBar, ProgressSegments, NoWords, FinishScreen } from "./gameShared.jsx";
import { playSound, playWin } from "../tools/sound.js";

const GMODE = "choice";
// подсказка после ошибки: выбрать подсвеченный правильный вариант, чтобы продолжить
const PICK_RIGHT = { ru: "Выбери правильный вариант", en: "Pick the correct option", ukr: "Обери правильний варіант", pl: "Wybierz poprawną opcję", lt: "Pasirink teisingą variantą" };

// words/onResult/onExit передаёт «Учёба» (переиспользует игру). Без них — обычный режим «Игры».
export const ChoiceGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
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
    const [order, setOrder] = useState(() => shuffle(wordsToGame)); // фикс. порядок, каждое слово 1 раз
    const [qpos, setQpos] = useState(0);
    const [results, setResults] = useState([]); // [{ id, ok }] в порядке ответов
    const [options, setOptions] = useState(null);
    const [subOf, setSubOf] = useState({}); // вариант → второй перевод (вторая строка кнопки)
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
    // «Учёба» показывает свой итог сессии — отдаём результат наружу вместо своего финиша.
    useEffect(() => {
        if (status === "FINISHED" && onFinish) onFinish({ total, correct: results.filter((r) => r.ok).length });
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

    const goNext = () => {
        if (qpos + 1 >= total) { setStatus("FINISHED"); playWin(); return; }
        setQpos(qpos + 1);
        setChosen(null);
        setStatus("ASKING");
    };

    const choose = (opt) => {
        // после ошибки: правильный вариант подсвечен — выбрать его, чтобы идти дальше (без «Дальше»)
        if (status === "INCORRECT") {
            if (opt === correctPrimary) { playSound("correct"); goNext(); }
            return;
        }
        if (status !== "ASKING") return;
        const ok = opt === correctPrimary;
        playSound(ok ? "correct" : "wrong");
        setChosen(opt);
        record(current, ok);                 // SRS — только первая попытка
        setResults((rs) => [...rs, { id: current.id, ok }]);
        setStatus(ok ? "CORRECT" : "INCORRECT");
    };

    // Честный «Не знаю»: подсвечиваем верный, но засчитываем как НЕ угадано (рампа сбросит клетку).
    const dontKnow = () => {
        if (status !== "ASKING") return;
        playSound("wrong");
        setChosen(null);                 // ничего не выбрано — подсветится только верный
        record(current, false);
        setResults((rs) => [...rs, { id: current.id, ok: false }]);
        setStatus("INCORRECT");
    };

    // Клик по экрану продвигает только после ВЕРНОГО ответа. После ошибки — нужно выбрать
    // подсвеченный правильный вариант (тогда дальше), а не «тыкать дальше».
    const onStageClick = () => {
        if (status === "CORRECT") goNext();
    };

    const restart = () => {
        setResults([]); setQpos(0); setOrder(shuffle(wordsToGame)); setChosen(null); setStatus("ASKING");
    };

    const backToSelection = () => {
        if (onExit) { onExit(); return; }
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;
    // в системной сессии счётчик/полоса показывают прогресс ВСЕЙ сессии (а не одно слово)
    const qIndex = stepTotal ? stepNo : Math.min(qpos + 1, total);
    const qTotal = stepTotal || total;
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
                style={status === "CORRECT" ? { cursor: "pointer" } : undefined}>
                <ChoiceQuestion
                    prompt={question}
                    promptLang={qLang}
                    options={options}
                    optionSub={subOf}
                    optionLang={aLang}
                    picked={chosen}
                    correct={correctPrimary}
                    reveal={status === "CORRECT" || status === "INCORRECT"}
                    allowRetry={status === "INCORRECT"}
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
                        {status === "CORRECT" && <span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span>}
                        {status === "INCORRECT" && <span className="qhint">{PICK_RIGHT[currentLanguage] || PICK_RIGHT.ru} <Icon n="arrow-up" sm /></span>}
                    </div>
                    {status === "ASKING" && options && (
                        <div className="dunno-wrap">
                            <button className="dunno-link" onClick={(e) => { e.stopPropagation(); dontKnow(); }}>
                                {DUNNO[currentLanguage]}
                            </button>
                        </div>
                    )}
                </ChoiceQuestion>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={wrongCount} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default ChoiceGame;
