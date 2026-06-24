// @ts-check
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import { posLabel, posMeta, chipPrefix } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { playSound } from "../tools/sound.js";
import { useScrollLock, ProgressSegments } from "./gameShared.jsx";

const ENDONYM = { ru: "русский", ukr: "українську", en: "English", pl: "polski", lt: "lietuvių" };
const HINTS = {
    ru: { reveal: "нажми — перевод", next: "нажми — дальше", studied: "Просмотрено" },
    ukr: { reveal: "натисни — переклад", next: "натисни — далі", studied: "Переглянуто" },
    en: { reveal: "tap to reveal", next: "tap for next", studied: "Reviewed" },
    pl: { reveal: "dotknij — tłumaczenie", next: "dotknij — dalej", studied: "Przejrzano" },
    lt: { reveal: "bakstelėk — vertimas", next: "bakstelėk — toliau", studied: "Peržiūrėta" },
};

const filterChosenWords = (dictList) =>
    dictList.flatMap((d) => d.words.filter((w) => w?.gameData?.isChoosedToGame));

const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// words/onExit передаёт «Учёба» (переиспользует игру). Карточки — пассивный режим, в SRS не пишет.
export const StudyGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onExit, onFinish, onReport = null, stepNo = 0, stepTotal = 0, segs: segsOverride = null }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const t = interfaceTranslate[currentLanguage];
    const h = HINTS[currentLanguage] || HINTS.en;

    const words = useMemo(() => shuffle(wordsProp || aiPlay || filterChosenWords(dictList)), []);
    const total = words.length;
    const isNo2Int = mode !== "int2no";

    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    useScrollLock();   // блокируем скролл фона на время карточек (общий ref-counted замок)

    // Озвучка по направлению: видимое слово — при показе карточки, ответ — при перевороте.
    const _sides = (i) => {
        const w = words[i];
        const no = w?.translate?.no?.[0] || "";
        const tr = (w?.translate?.[currentLanguage] || []).filter(Boolean).join(", ");
        return isNo2Int ? { front: no, back: tr } : { front: tr, back: no };
    };
    useEffect(() => {  // видимое игроку слово (+ прогрев ответа для мгновенного переворота)
        if (!sound) return;
        const { front, back } = _sides(idx);
        if (front) speakText(front, hyLang(currentLanguage, isNo2Int)).catch(() => {});
        if (back) prefetchTts(back, hyLang(currentLanguage, !isNo2Int));
    }, [idx]); // eslint-disable-line
    useEffect(() => {  // правильный ответ при перевороте
        if (!sound || !flipped) return;
        const { back } = _sides(idx);
        if (back) speakText(back, hyLang(currentLanguage, !isNo2Int)).catch(() => {});
    }, [flipped]); // eslint-disable-line

    /** @type {import('react').CSSProperties} */
    const playStyle = { position: "fixed", inset: 0, zIndex: 90, overflow: "hidden" };

    const backToSelection = () => {
        if (onExit) { onExit(); return; }
        words.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    if (total === 0) {
        return (
            <div className="play" data-state="asking" style={playStyle}>
                <div className="pstage">
                    <p className="qprompt">{t.noWordsToPlay}</p>
                    <button className="gbtn gbtn--accent" onClick={backToSelection}>
                        <Icon n="arrow-left" sm /> {t.backToWordSelection}
                    </button>
                </div>
            </div>
        );
    }

    const finished = idx >= total;
    const advance = () => {
        if (!flipped) { setFlipped(true); playSound("flip"); return; }
        if (idx + 1 < total) { setIdx(idx + 1); setFlipped(false); }
        else { setIdx(total); playSound("finish"); if (onFinish) onFinish({ total, correct: total }); } // финиш
    };
    const restart = () => { setIdx(0); setFlipped(false); };

    const cur = finished ? null : words[idx];
    const no = cur ? (cur.translate?.no?.[0] || "") : "";
    const tr = cur ? (cur.translate?.[currentLanguage] || []).filter(Boolean).join(", ") : "";
    // Артикль/«å» — только на видимой норвежской стороне (озвучка читает лемму без них).
    const prefix = cur ? chipPrefix(posMeta(cur.part_of_speech).key, cur.forms, { articles: showArticles, verbAa: showVerbAa }) : "";
    const noDisp = prefix ? `${prefix} ${no}` : no;
    const front = isNo2Int ? noDisp : tr;
    const back = isNo2Int ? tr : noDisp;
    const frontLang = hyLang(currentLanguage, isNo2Int);   // лицевая: норвежская при no2int
    const backLang = hyLang(currentLanguage, !isNo2Int);
    const posText = cur ? posLabel(cur.part_of_speech, t) : "";
    const noVisible = isNo2Int ? true : flipped; // когда видно норвежское — показываем озвучку
    // в системной сессии счётчик/полоса = прогресс ВСЕЙ сессии (а не одна карточка)
    const useStep = stepTotal > 0;
    const dispNo = useStep ? stepNo : (idx + 1);
    const dispTotal = useStep ? stepTotal : total;
    const barFrac = useStep ? (stepNo - 1) / stepTotal : (total ? idx / total : 0);

    return (
        <div className="play" data-state={finished ? "finished" : "asking"} style={playStyle}>
            <div className="ptop">
                <a className="ptop__brand" onClick={backToSelection} style={{ cursor: "pointer" }}>
                    <BrandMark />
                    <span className="brand__name">Lære<b>·</b>Norsk</span>
                </a>
                <div className="pstats">
                    <span className="stat"><Icon n="layers" sm /> {useStep ? dispNo : Math.min(idx + (finished ? 0 : 1), total)} / {dispTotal}</span>
                </div>
                <a className="pexit" onClick={backToSelection} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
            </div>

            {/* системная сессия — единые сегменты-стадии (как в играх; карточка = текущий сегмент,
                мигает «будущим» зелёным). Автономная «Учёба» (без сессии) — обычная полоса-заливка. */}
            {segsOverride
                ? <ProgressSegments segs={segsOverride} />
                : <div className="pbar" aria-hidden="true"><span className="pbar__fill" style={{ width: `${barFrac * 100}%` }} /></div>}

            <div className="pstage">
                {finished && onFinish ? null : finished ? (
                    <div className="finish" style={{ display: "block" }}>
                        <div className="qcount">{t.gameFinished}</div>
                        <div className="finish__score">{total}</div>
                        <div className="finish__sub">{h.studied}</div>
                        <div className="pcta">
                            <button className="gbtn gbtn--accent" onClick={restart}><Icon n="play" sm /> {t.playAgain}</button>
                            <button className="gbtn gbtn--ghost" onClick={backToSelection}><Icon n="arrow-left" sm /> {t.backToWordSelection}</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* «Не учить» — НАД карточкой слова (не в хедере, не на самой карточке —
                            чтобы не задеть при тапе по карточке). Жалоба на мусорное слово. */}
                        {onReport && (
                            <button type="button" className="dontlearn-above" onClick={onReport}>
                                <Icon n="x-circle" sm /> {t.dontLearn || "Не учить"}
                            </button>
                        )}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div key={idx} className="qcard flashcard" onClick={advance} style={{ cursor: "pointer" }}
                                initial={{ opacity: 0, x: 60, rotate: 1 }}
                                animate={{ opacity: 1, x: 0, rotate: 0 }}
                                exit={{ opacity: 0, x: -60, rotate: -1 }}
                                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
                                <div className="qcount">{t.word} {dispNo} / {dispTotal}</div>
                                <h1 className="qword" lang={frontLang}>
                                    {hyphenate(front, frontLang)}
                                    {noVisible && (
                                        <SpeakButton text={no} hasTts={cur.hasTts} className="qspeak" lg
                                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                                    )}
                                </h1>
                                {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                                <div className={`flashcard__back${flipped ? " is-shown" : ""}`}>
                                    <AnimatePresence mode="wait" initial={false}>
                                        {flipped
                                            ? <motion.span key="a" className="flashcard__answer" lang={backLang} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{hyphenate(back, backLang)}</motion.span>
                                            : <motion.span key="h" className="flashcard__hint" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}>{h.reveal}</motion.span>}
                                    </AnimatePresence>
                                </div>
                                {flipped && cur.example?.no && (
                                    <div className="flashcard__example">
                                        <b lang={hyLang(currentLanguage, true)}>{cur.example.no}</b>
                                        {(cur.example[currentLanguage] || cur.example.ru) && <span className="muted"> — {cur.example[currentLanguage] || cur.example.ru}</span>}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="pcta">
                            <button className="gbtn gbtn--accent" onClick={advance}>
                                {flipped ? <>{t.next} <Icon n="arrow-right" sm /></> : <>{h.reveal} <Icon n="chevron-down" sm /></>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudyGame;
