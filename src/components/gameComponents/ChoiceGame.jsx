// @ts-check
// Игра «Выбор»: 4 варианта, каждое слово ровно один раз, переход по тапу после верного ответа.
// Механика цикла (стейт-машина, SRS, ретрай, переход, финиш) — в useGameLoop; здесь деривация
// слова, загрузка вариантов, озвучка и рендер.
import { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyLang } from "../ui/hyphenate.js";
import { ChoiceQuestion } from "./ChoiceQuestion.jsx";
import { ListenPrompt } from "./ListenPrompt.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import api from "../tools/api.js";
import { ENDONYM, DUNNO, PLAY_STYLE, shuffle, uniq, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen, noWithPrefix } from "./gameShared.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";

// Десктоп-подсказка (системный тост) «можно выбирать цифрами» — ОТДЕЛЬНЫЙ флаг от клавиатурной.
const CHOICE_HINT = {
    ru: "Можно выбирать ответ цифрами на клавиатуре", en: "You can pick the answer with number keys",
    ukr: "Можна обирати відповідь цифрами на клавіатурі", pl: "Odpowiedź można wybrać cyframi na klawiaturze",
    lt: "Atsakymą galima rinktis skaičių klavišais",
};
const CHOICE_HINT_KEY = "choice_num_hint_seen";
let _choiceHintShown = false;   // максимум раз за сессию
let _listenNudgeOff = false;    // нудж «вернуть на слух» закрыт на эту сессию (модульный, переживает ремоунты игр)

export const ChoiceGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0, listen = false, listenMuted = false }) => {
    const isNo2Int = mode !== "int2no";
    const listenMode = listen && isNo2Int;   // «на слух»: слово проигрывается, текст скрыт (только no2int)
    const [revealText, setRevealText] = useState(false);   // в listen-режиме показали текст (после ответа / по кнопке)
    // нудж «вернуть на слух» на стадии, которая ДОЛЖНА быть на слух, но аудирование выключено.
    const [nudgeOpen, setNudgeOpen] = useState(() => !_listenNudgeOff);
    const enableListen = () => { _listenNudgeOff = true; setNudgeOpen(false); useSystemStore.getState().setListenOffLocal(false); };
    const dismissNudge = () => { _listenNudgeOff = true; setNudgeOpen(false); };
    const [chosen, setChosen] = useState(/** @type {string | null} */(null));
    const [options, setOptions] = useState(/** @type {string[] | null} */(null));
    const [subOf, setSubOf] = useState({}); // вариант → второй перевод (вторая строка кнопки)
    const [armed, setArmed] = useState(false); // анти-ghost-click: свежий вопрос ~350мс не принимает выбор
    // ПК: номера у вариантов + выбор клавишами 1–9 (раскладко-независимо, по e.code Digit/Numpad)
    const [isDesktop] = useState(() => { try { return matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)").matches; } catch { return false; } });
    const keyRef = useRef(/** @type {any} */({}));
    const wordEndRef = useRef(/** @type {{ended: boolean, resolve: ((v?: any) => void) | null}} */({ ended: false, resolve: null }));   // на слух: слово (ListenPrompt) доиграло
    const choiceHintSeenDB = useAuthStore((s) => s.user?.gamePrefs?.choiceHintSeen);   // отдельный флаг (БД)
    const choiceSeenRef = useRef(/** @type {boolean|undefined} */(undefined));
    if (choiceSeenRef.current === undefined) { try { choiceSeenRef.current = !!choiceHintSeenDB || !!localStorage.getItem(CHOICE_HINT_KEY); } catch { choiceSeenRef.current = !!choiceHintSeenDB; } }

    const loop = useGameLoop({
        gmode: "choice", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank, // фолбэк без звука: ~1с, затем авто-переход
        // на слух: если слово ещё играет (ASKING) — даём доиграть (ListenPrompt сигналит onEnded), НЕ
        // обрывая; если уже доиграло к моменту ответа — проигрываем его ЕЩЁ РАЗ, чтобы после выбора была
        // звуковая обратная связь (раньше тут был тихий Promise.resolve → «после ответа звука нет»).
        // Иначе (обычный выбор) — озвучка перевода-ответа до конца.
        speakAnswer: () => {
            if (listenMode) {
                if (wordEndRef.current.ended) return sound ? speakTextEnd(no, qLang) : Promise.resolve();
                return new Promise((res) => { wordEndRef.current.resolve = res; });
            }
            return (sound && correctPrimary) ? speakTextEnd(correctPrimary, aLang) : null;
        },
        onAdvance: () => setChosen(null),
    });
    const { t, currentLanguage, total, current, status, words: wordsToGame, results, knownFirstTry, score, qIndex, qTotal, answer, advance, restart, backToSelection } = loop;

    // Десктоп-подсказка «можно выбирать цифрами» (системный тост, отдельный флаг). Показываем при
    // выборе МЫШЬЮ; выбор цифрой/«Понял» — помечает «видел» (localStorage + БД), один раз за сессию.
    const persistChoiceSeen = () => {
        try { useSystemStore.getState().showToast(""); } catch { /* */ }
        if (choiceSeenRef.current) return;
        choiceSeenRef.current = true;
        try { localStorage.setItem(CHOICE_HINT_KEY, "1"); } catch { /* no-op */ }
        api.setGamePrefs({ choiceHintSeen: true }).catch(() => { /* офлайн */ });
    };
    const maybeShowChoiceHint = () => {
        if (!isDesktop || choiceSeenRef.current || _choiceHintShown) return;
        _choiceHintShown = true;
        try {
            useSystemStore.getState().showToast(CHOICE_HINT[currentLanguage] || CHOICE_HINT.en, "info", {
                persist: true, action: { label: t.choiceGotIt, onClick: persistChoiceSeen },
            });
        } catch { /* */ }
    };

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
    // В режиме «на слух» слово проигрывает ListenPrompt (со своим прогрессом) — тут не дублируем.
    useEffect(() => {
        setRevealText(false);   // новое слово — снова прячем текст (listen-режим)
        if (!sound || status !== "ASKING") return;
        if (question && !listenMode) speakText(question, qLang).catch(() => {});
        if (correctPrimary) prefetchTts(correctPrimary, aLang);
    }, [current, sound]); // eslint-disable-line
    // После ОШИБКИ озвучиваем верный ответ. После ВЕРНОГО озвучкой+паузой управляет useGameLoop
    // (speakAnswer), чтобы авто-переход совпал с длиной аудио.
    useEffect(() => {
        if (sound && status === "INCORRECT" && correctPrimary) speakText(correctPrimary, aLang).catch(() => {});
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

    // «Взвод» выбора: новый вопрос (ASKING) ~350мс не принимает тап. Защищает от долетевшего с
    // прошлого экрана клика/ghost-click при БЫСТРОМ переходе (верный ответ на повторе после ошибки
    // переходит без паузы — иначе вариант мог «выбраться сам»). Сбрасывается на каждый новый вопрос.
    useEffect(() => {
        if (status !== "ASKING") return;
        setArmed(false);
        const tm = setTimeout(() => setArmed(true), 350);
        return () => clearTimeout(tm);
    }, [status, current]);

    // на слух: слово доиграло (ListenPrompt) → отпускаем ожидающий переход (speakAnswer)
    const onWordEnded = () => { wordEndRef.current.ended = true; const r = wordEndRef.current.resolve; wordEndRef.current.resolve = null; if (r) r(); };

    const choose = (opt) => {
        if (status !== "ASKING" || !armed) return;
        setChosen(opt);
        answer(opt === correctPrimary);
    };
    // Честный «Не знаю»: ничего не выбрано — подсветится только верный, засчитывается как НЕ угадано.
    const dontKnow = () => { if (status !== "ASKING") return; setChosen(null); answer(false); };
    // После ошибки правильный вариант показан — продолжить можно тапом по ЛЮБОМУ месту.
    const onStageClick = () => { if (status === "INCORRECT") advance(); };

    // ПК: выбор варианта клавишами 1–9 (по физ-позиции e.code, независимо от раскладки). Слушатель —
    // один раз; свежие options/choose/status читаем через ref.
    keyRef.current = { options, choose, status, armed, persistChoiceSeen, advance };
    useEffect(() => {
        if (!isDesktop) return;
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const k = keyRef.current;
            const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || "");
            // после ОШИБКИ: 1–4 / пробел / энтер — завершить задание (как тап по сцене)
            if (k.status === "INCORRECT" && (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter" || (m && +m[1] <= 4))) {
                e.preventDefault(); k.advance?.(); return;
            }
            if (!m) return;
            if (k.status !== "ASKING" || !k.armed || !k.options) return;
            const idx = +m[1] - 1;
            if (idx < k.options.length) { e.preventDefault(); k.persistChoiceSeen?.(); k.choose(k.options[idx]); }   // цифрами — уже знает, скрыть/не показывать
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isDesktop]);

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
            <PlayTopBar correctCount={baseCorrect + correctCount} wrongCount={baseWrong + wrongCount} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage" onClick={onStageClick}
                style={status === "INCORRECT" ? { cursor: "pointer" } : undefined}>
                {/* нудж: стадия должна быть на слух, но аудирование выключено — мягко предлагаем вернуть */}
                {listenMuted && status === "ASKING" && nudgeOpen && (
                    <div className="listen-nudge" onClick={(e) => e.stopPropagation()}>
                        <Icon n="headphones" sm />
                        <span className="listen-nudge__t">{t.listenBack}</span>
                        <button type="button" className="listen-nudge__btn" onClick={enableListen}>{t.listenBackBtn}</button>
                        <button type="button" className="listen-nudge__x" onClick={dismissNudge} aria-label="close"><Icon n="x" sm /></button>
                    </div>
                )}
                <ChoiceQuestion
                    prompt={promptDisp}
                    promptLang={qLang}
                    options={options}
                    optionSub={subOf}
                    optionLang={aLang}
                    picked={chosen}
                    correct={correctPrimary}
                    reveal={status === "CORRECT" || status === "INCORRECT"}
                    onPick={(opt) => { maybeShowChoiceHint(); choose(opt); }}
                    posText={posText}
                    hint={`${t.translateTo} ${promptTarget}`}
                    countText={`${t.word} ${qIndex} / ${qTotal}`}
                    disabled={status !== "ASKING"}
                    loading={!options}
                    numbered={isDesktop}
                    showWord={!listenMode || revealText || status === "CORRECT" || status === "INCORRECT"}
                    listenSlot={listenMode ? (
                        <ListenPrompt word={no} ttsLang={qLang} uiLang={currentLanguage} asking={status === "ASKING"}
                            onEnded={onWordEnded}
                            onShowText={() => setRevealText(true)}
                            onDisableAlways={() => { useSystemStore.getState().setListenOffLocal(true); setRevealText(true); }} />
                    ) : null}
                >
                    {status === "INCORRECT" && descriptionText && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-line muted">{descriptionText}</div>
                        </div>
                    )}

                    <div className="pcta">
                        {status === "CORRECT" && <span className="qhint qhint--ok"><Icon n="check" sm /> {t.correctly}</span>}
                        {status === "CORRECT" && listenMode && <span className="qhint qhint--listen"><Icon n="headphones" sm /> {t.byEar}</span>}
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
