// @ts-check
import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import { posLabel, posMeta, chipPrefix, posFormsLine, posFormsRows } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { playSound } from "../tools/sound.js";
import { useScrollLock, ProgressSegments, semisOf, filterChosenWords, shuffle, FORM_LABEL, FORM_EXPLAIN } from "./gameShared.jsx";
import { langGuard } from "../../interface/i18nGuard.js";
const HINTS = langGuard({
    ru: { reveal: "нажми — перевод", revealForm: "нажми — форма", next: "нажми — дальше", studied: "Просмотрено", forms: "Формы" },
    ukr: { reveal: "натисни — переклад", revealForm: "натисни — форма", next: "натисни — далі", studied: "Переглянуто", forms: "Форми" },
    en: { reveal: "tap to reveal", revealForm: "tap — the form", next: "tap for next", studied: "Reviewed", forms: "Forms" },
    pl: { reveal: "dotknij — tłumaczenie", revealForm: "dotknij — forma", next: "dotknij — dalej", studied: "Przejrzano", forms: "Formy" },
    lt: { reveal: "bakstelėk — vertimas", revealForm: "bakstelėk — forma", next: "bakstelėk — toliau", studied: "Peržiūrėta", forms: "Formos" },
    lv: { reveal: "pieskaries — tulkojums", revealForm: "pieskaries — forma", next: "pieskaries — tālāk", studied: "Apskatīts", forms: "Formas" },
    ar: { reveal: "انقر للكشف", revealForm: "انقر — الصيغة", next: "انقر للتالي", studied: "تمت المراجعة", forms: "الصيغ" },
}, "StudyGame.HINTS");

// Подписи мини-меню «Не учить» (две причины): «Не актуально» (убрать у себя) / «Ошибка в слове» (модерация).
const SKIP = langGuard({
    ru: { notRelevant: "Не актуально", wordError: "Ошибка в слове" },
    ukr: { notRelevant: "Не актуально", wordError: "Помилка у слові" },
    en: { notRelevant: "Not relevant", wordError: "Word is wrong" },
    pl: { notRelevant: "Nieistotne", wordError: "Błąd w słowie" },
    lt: { notRelevant: "Neaktualu", wordError: "Klaida žodyje" },
    lv: { notRelevant: "Neaktuāli", wordError: "Kļūda vārdā" },
    ar: { notRelevant: "غير مناسبة", wordError: "كلمة خاطئة" },
}, "StudyGame.SKIP");

// words/onExit передаёт «Учёба» (переиспользует игру). Карточки — пассивный режим, в SRS не пишет.
/**
 * @param {{ setGameState?: any, mode?: string, sound?: boolean, words?: any[], onExit?: any,
 *   onFinish?: any, onReport?: (() => void) | null, onSkip?: (() => void) | null,
 *   onKnow?: (() => void) | null, stepNo?: number, stepTotal?: number, segs?: any, rank?: number }} props
 */
export const StudyGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onExit, onFinish, onReport = null, onSkip = null, onKnow = null, stepNo = 0, stepTotal = 0, segs: segsOverride = null, rank = 0 }) => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const t = interfaceTranslate[currentLanguage];
    const h = HINTS[currentLanguage] || HINTS.en;
    const sk = SKIP[currentLanguage] || SKIP.en;

    const words = useMemo(() => shuffle(wordsProp || aiPlay || filterChosenWords(dictList)), []);
    const total = words.length;
    const isNo2Int = mode !== "int2no";

    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [whyOpen, setWhyOpen] = useState(false);   // открыто ли мини-меню «Не учить» (две причины)
    const keysRef = useRef(/** @type {{advance?: (() => void) | null, know?: (() => void) | null, why?: (() => void) | null}} */({}));

    useScrollLock();   // блокируем скролл фона на время карточек (общий ref-counted замок)

    // ПК: пробел/энтер — как тап (перевернуть → следующая); 1 — «Уже знаю», 2 — открыть «Не учить» (причины).
    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = keysRef.current;
            if ((e.code === "Digit1" || e.code === "Numpad1") && k.know) { e.preventDefault(); k.know(); return; }
            if ((e.code === "Digit2" || e.code === "Numpad2") && k.why) { e.preventDefault(); k.why(); return; }
            if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); k.advance?.(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Карточка ФОРМЫ (трек форм, form_track): лицо = лемма + вопрос формы, оборот = сама форма
    // (обе стороны норвежские). Обычная карточка — перевод по направлению.
    const isFormCard = (w) => !!w?.form_track;

    // Озвучка по направлению: видимое слово — при показе карточки, ответ — при перевороте.
    const _sides = (i) => {
        const w = words[i];
        const no = w?.translate?.no?.[0] || "";
        const tr = (w?.translate?.[currentLanguage] || []).filter(Boolean).join(", ");
        if (isFormCard(w)) return { front: no, back: (w?.reveal || w?.target?.value || ""), backNo: true };
        return isNo2Int ? { front: no, back: tr } : { front: tr, back: no };
    };
    useEffect(() => {  // видимое игроку слово (+ прогрев ответа для мгновенного переворота)
        if (!sound) return;
        playSound("enter", { semis: semisOf(rank) });   // звук «вход в задание» по стадии (карточка — базовая)
        const { front, back, backNo } = _sides(idx);
        if (front) speakText(front, hyLang(currentLanguage, isNo2Int)).catch(() => {});
        if (back) prefetchTts(backNo ? formTts(back) : back, hyLang(currentLanguage, backNo ? true : !isNo2Int));
    }, [idx]); // eslint-disable-line
    useEffect(() => {  // правильный ответ при перевороте
        if (!sound || !flipped) return;
        const { back, backNo } = _sides(idx);
        if (back) speakText(backNo ? formTts(back) : back, hyLang(currentLanguage, backNo ? true : !isNo2Int)).catch(() => {});
    }, [flipped]); // eslint-disable-line
    useEffect(() => { setWhyOpen(false); }, [idx]);   // новая карточка → меню «Не учить» закрыто

    // «ei/en klokke» голосом читалась бы со слэшем — озвучиваем канонично «ei klokke»
    const formTts = (v) => String(v).replace(/^ei\/en /, "ei ");
    // Карточка ФОРМЫ: прогрев озвучки ВСЕХ форм парадигмы ЗАРАНЕЕ — тап по строке играет мгновенно
    useEffect(() => {
        const w = words[idx];
        if (!w?.form_track || !w?.forms) return;
        const noW = w?.translate?.no?.[0] || "";
        posFormsRows(noW, { ...w.forms, pos: w.forms.pos || posMeta(w.part_of_speech).key }, currentLanguage)
            .forEach((r) => { if (!r.none) prefetchTts(formTts(r.value), "nb"); });
    }, [idx]); // eslint-disable-line

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
        if (whyOpen) { setWhyOpen(false); return; }   // открыто меню «Не учить» → тап/пробел сначала закрывает его
        if (!flipped) { setFlipped(true); playSound("flip"); return; }
        if (idx + 1 < total) { setIdx(idx + 1); setFlipped(false); }
        else { setIdx(total); playSound("finish"); if (onFinish) onFinish({ total, correct: total }); } // финиш
    };
    // клавиша «2» открывает/закрывает мини-меню «Не учить» (его пункты — клик/тап)
    const canWhy = !!(onReport || onSkip);
    keysRef.current = finished ? {} : { advance, know: onKnow, why: canWhy ? () => setWhyOpen((v) => !v) : null };
    const restart = () => { setIdx(0); setFlipped(false); };

    const cur = finished ? null : words[idx];
    const formCard = cur ? isFormCard(cur) : false;
    const no = cur ? (cur.translate?.no?.[0] || "") : "";
    const tr = cur ? (cur.translate?.[currentLanguage] || []).filter(Boolean).join(", ") : "";
    // Артикль/«å» — только на видимой норвежской стороне (озвучка читает лемму без них).
    // Карточка формы — БЕЗ приставки: артикль слил бы ответ клетки «род».
    const prefix = (cur && !formCard) ? chipPrefix(posMeta(cur.part_of_speech).key, cur.forms, { articles: showArticles, verbAa: showVerbAa }) : "";
    const noDisp = prefix ? `${prefix} ${no}` : no;
    const front = formCard ? no : (isNo2Int ? noDisp : tr);
    const back = formCard ? (cur.reveal || cur.target?.value || "") : (isNo2Int ? tr : noDisp);
    const frontLang = hyLang(currentLanguage, formCard ? true : isNo2Int);   // лицевая: норвежская при no2int
    const backLang = hyLang(currentLanguage, formCard ? true : !isNo2Int);   // оборот формы — тоже норвежский
    // Подписи: часть речи — ВСЕГДА (на карточке формы тоже — юзер должен видеть, что это
    // прилагательное/глагол); у карточки формы дополнительно ВОПРОС о форме (как FormPrompt)
    // и доходчивое объяснение изучаемой формы (FORM_EXPLAIN, по клетке).
    const formQ = formCard ? ((FORM_LABEL[currentLanguage] || FORM_LABEL.en)[cur?.prompt?.formLabel] || "") : "";
    const formWhy = formCard ? ((FORM_EXPLAIN[currentLanguage] || FORM_EXPLAIN.en)[cur?.step] || "") : "";
    const posText = cur ? posLabel(cur.part_of_speech, t) : "";
    // Компактная парадигма форм (en bil · bilen · biler · bilene) — учит формам,
    // которые потом тестируют грамм-упражнения. Показываем на обороте, когда формы есть.
    const formsLine = cur?.forms ? posFormsLine(no, cur.forms, currentLanguage) : "";
    // Карточка ФОРМЫ: на обороте — ПОЛНАЯ парадигма с локализованными подписями
    // («ед. ч. (определ.): bilen»), целевая форма подсвечена. pos в forms может отсутствовать —
    // дотягиваем из part_of_speech элемента.
    const formRows = (formCard && cur?.forms)
        ? posFormsRows(no, { ...cur.forms, pos: cur.forms.pos || posMeta(cur.part_of_speech).key }, currentLanguage)
        : [];
    // клетка трека форм → ключ строки парадигмы (какую подсветить)
    const CELL_ROW = { gender: "sg", indef_pl: "pl", def_sg: "sg_def", def_pl: "pl_def",
                       present: "present", past: "past", perfect: "perfect",
                       neuter: "neuter", plural: "pl", comparative: "comparative", superlative: "superlative" };
    const targetRow = formCard ? CELL_ROW[cur?.step] : null;
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
                        {/* Кнопки НАД карточкой (не на ней — чтобы не задеть при тапе по карточке):
                            «Уже знаю» появляется только ПОСЛЕ показа перевода (флип); «Не учить» — всегда. */}
                        {(canWhy || onKnow) && (
                            <div className="card-skip">
                                {onKnow && (
                                    <button type="button" className="card-skip__btn card-skip__know" onClick={onKnow}>
                                        <span className="card-skip__key">1</span><Icon n="check" sm /> {t.alreadyKnow || "Уже знаю"}
                                    </button>
                                )}
                                {canWhy && (
                                    <div className="card-skip__why">
                                        {/* «Не учить» — текстовый триггер мини-меню с двумя причинами */}
                                        <button type="button" className={"card-skip__btn card-skip__report" + (whyOpen ? " is-open" : "")}
                                            onClick={() => setWhyOpen((v) => !v)} aria-expanded={whyOpen} aria-haspopup="menu">
                                            <span className="card-skip__key">2</span><Icon n="x-circle" sm /> {t.dontLearn || "Не учить"}
                                        </button>
                                        <AnimatePresence>
                                            {whyOpen && (
                                                <>
                                                    <div className="card-skip__backdrop" onClick={() => setWhyOpen(false)} />
                                                    <motion.div className="card-skip__menu" role="menu"
                                                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                                        transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}>
                                                        {onSkip && (
                                                            <button type="button" role="menuitem" className="card-skip__item"
                                                                onClick={() => { setWhyOpen(false); onSkip?.(); }}>
                                                                <Icon n="eye-off" sm /> {sk.notRelevant}
                                                            </button>
                                                        )}
                                                        {onReport && (
                                                            <button type="button" role="menuitem" className="card-skip__item card-skip__item--warn"
                                                                onClick={() => { setWhyOpen(false); onReport?.(); }}>
                                                                <Icon n="alert" sm /> {sk.wordError}
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div key={idx} className="qcard flashcard" onClick={advance} style={{ cursor: "pointer" }}
                                initial={{ opacity: 0, x: 60, rotate: 1 }}
                                animate={{ opacity: 1, x: 0, rotate: 0 }}
                                exit={{ opacity: 0, x: -60, rotate: -1 }}
                                transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
                                <div className="qcount">{t.word} {dispNo} / {dispTotal}</div>
                                {/* карточка формы: перевод-напоминание — блекло, в потоке НАД норвежским словом */}
                                {formCard && tr && <div className="fcard-trans" lang={hyLang(currentLanguage, false)}>{tr}</div>}
                                <h1 className="qword" lang={frontLang}>
                                    {hyphenate(front, frontLang)}
                                    {noVisible && (
                                        <SpeakButton text={no} hasTts={cur.hasTts} className="qspeak" lg
                                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                                    )}
                                </h1>
                                <span className="row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}
                                    {formQ && <span className="qpos"><Icon n="graduation" sm /> {formQ}</span>}
                                </span>
                                {/* «Ага»: составное слово собрано из знакомых основ (barn + hage) */}
                                {cur.compound?.parts?.length >= 2 && (
                                    <div className="fcard-compound" lang={hyLang(currentLanguage, true)}>
                                        <Icon n="layers" sm />
                                        {cur.compound.parts.map((p, i) => (
                                            <span key={i}>{i > 0 && <span className="fcard-compound__plus"> + </span>}<b>{p}</b></span>
                                        ))}
                                    </div>
                                )}

                                <div className={`flashcard__back${flipped ? " is-shown" : ""}`}>
                                    <AnimatePresence mode="wait" initial={false}>
                                        {flipped
                                            ? <motion.span key="a" className="flashcard__answer" lang={backLang} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{hyphenate(back, backLang)}</motion.span>
                                            : <motion.span key="h" className="flashcard__hint" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}>{formCard ? h.revealForm : h.reveal}</motion.span>}
                                    </AnimatePresence>
                                </div>
                                {flipped && cur.example?.no && (
                                    <div className="flashcard__example">
                                        <b lang={hyLang(currentLanguage, true)}>{cur.example.no}</b>
                                        {(cur.example[currentLanguage] || cur.example.ru) && <span className="muted"> — {cur.example[currentLanguage] || cur.example.ru}</span>}
                                    </div>
                                )}
                                {flipped && formCard && formRows.length > 0 ? (
                                    // карточка формы: полная парадигма с подписями, целевая строка подсвечена
                                    <div className="flashcard__forms fparad" lang={hyLang(currentLanguage, true)}>
                                        <span className="flashcard__forms-label">{h.forms}</span>
                                        {formRows.map((r) => (
                                            <div key={r.key}>
                                                <div className={`fparad__row${r.key === targetRow ? " is-target" : ""}${r.none ? "" : " fparad__row--say"}`}
                                                    onClick={r.none ? undefined : (e) => { e.stopPropagation(); speakText(formTts(r.value), "nb").catch(() => {}); }}>
                                                    <span className="fparad__label">{r.label}</span>
                                                    <span className={`fparad__val${r.none ? " fparad__val--none" : ""}`} lang={r.none ? undefined : "no"}>{r.value}</span>
                                                    {!r.none && <Icon n="volume" sm className="fparad__speak" />}
                                                </div>
                                                {/* объяснение ИЗУЧАЕМОЙ формы — что это и когда употребляется */}
                                                {r.key === targetRow && formWhy && (
                                                    <div className="fparad__why">{formWhy}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : flipped && formsLine && (
                                    <div className="flashcard__forms" lang={hyLang(currentLanguage, true)}>
                                        <span className="flashcard__forms-label">{h.forms}</span>
                                        <span className="flashcard__forms-val">{formsLine}</span>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="pcta">
                            <button className="gbtn gbtn--accent" onClick={advance}>
                                {flipped ? <>{t.next} <Icon n="arrow-right" sm /></> : <>{formCard ? h.revealForm : h.reveal} <Icon n="chevron-down" sm /></>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudyGame;
