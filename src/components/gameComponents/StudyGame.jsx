import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakNorwegian } from "../ui/tts.js";
import { posLabel } from "../ui/pos.js";

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

export const StudyGame = ({ setGameState, mode = "no2int", sound = false }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const dictList = useWordsStore((s) => s.dictList);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const t = interfaceTranslate[currentLanguage];
    const h = HINTS[currentLanguage] || HINTS.en;

    const words = useMemo(() => shuffle(filterChosenWords(dictList)), []);
    const total = words.length;
    const isNo2Int = mode !== "int2no";

    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    // Озвучка: норвежское слово проигрываем, когда оно на экране.
    const _no = (i) => words[i]?.translate?.no?.[0] || "";
    useEffect(() => {  // лицевая сторона норвежская — играем сразу при показе карточки
        if (sound && isNo2Int && _no(idx)) speakNorwegian(_no(idx)).catch(() => {});
    }, [idx]); // eslint-disable-line
    useEffect(() => {  // норвежское на обороте — играем при перевороте
        if (sound && !isNo2Int && flipped && _no(idx)) speakNorwegian(_no(idx)).catch(() => {});
    }, [flipped]); // eslint-disable-line

    const playStyle = { position: "fixed", inset: 0, zIndex: 90, overflowY: "auto" };

    const backToSelection = () => {
        words.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState("chooseWords");
    };

    if (total === 0) {
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

    const finished = idx >= total;
    const advance = () => {
        if (!flipped) { setFlipped(true); return; }
        if (idx + 1 < total) { setIdx(idx + 1); setFlipped(false); }
        else setIdx(total); // финиш
    };
    const restart = () => { setIdx(0); setFlipped(false); };

    const cur = finished ? null : words[idx];
    const no = cur ? (cur.translate?.no?.[0] || "") : "";
    const tr = cur ? (cur.translate?.[currentLanguage] || []).filter(Boolean).join(", ") : "";
    const front = isNo2Int ? no : tr;
    const back = isNo2Int ? tr : no;
    const posText = cur ? posLabel(cur.part_of_speech, t) : "";
    const noVisible = isNo2Int ? true : flipped; // когда видно норвежское — показываем озвучку

    return (
        <div className="play" data-state={finished ? "finished" : "asking"} style={playStyle}>
            <div className="ptop">
                <a className="ptop__brand" onClick={backToSelection} style={{ cursor: "pointer" }}>
                    <BrandMark />
                    <span className="brand__name">Lære<b>·</b>Norsk</span>
                </a>
                <div className="pstats">
                    <span className="stat"><Icon n="layers" sm /> {Math.min(idx + (finished ? 0 : 1), total)} / {total}</span>
                </div>
                <a className="pexit" onClick={backToSelection} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
            </div>

            <div className="pdots">
                {Array.from({ length: total }).map((_, i) => (
                    <span key={i} className={`pdot${i < idx ? " is-ok" : i === idx ? " is-now" : ""}`} />
                ))}
            </div>

            <div className="pstage">
                {finished ? (
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
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div key={idx} className="qcard flashcard" onClick={advance} style={{ cursor: "pointer" }}
                                initial={{ opacity: 0, x: 60, rotate: 1 }}
                                animate={{ opacity: 1, x: 0, rotate: 0 }}
                                exit={{ opacity: 0, x: -60, rotate: -1 }}
                                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
                                <div className="qcount">{t.word} {idx + 1} / {total}</div>
                                <h1 className="qword">
                                    {front}
                                    {noVisible && (
                                        <SpeakButton text={no} hasTts={cur.hasTts} className="qspeak" lg
                                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                                    )}
                                </h1>
                                {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                                <div className={`flashcard__back${flipped ? " is-shown" : ""}`}>
                                    <AnimatePresence mode="wait" initial={false}>
                                        {flipped
                                            ? <motion.span key="a" className="flashcard__answer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{back}</motion.span>
                                            : <motion.span key="h" className="flashcard__hint" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}>{h.reveal}</motion.span>}
                                    </AnimatePresence>
                                </div>
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
