// Общий цикл игр-упражнений (Выбор / Сборка / Ввод).
// Хук владеет МЕХАНИКОЙ: стейт-машина ASKING/CORRECT/INCORRECT/FINISHED, порядок слов (каждое
// один раз, случайный порядок), запись в SRS (ТОЛЬКО первая попытка), ретрай-после-ошибки,
// авто/тап-переход, финиш и отдача результата наружу. Деривация слова, озвучка, проверка ответа
// и рендер остаются в самих играх — это и есть мода-специфика. Единая точка ответа — answer(ok).
//
// Поведение каждой игры сохранено 1:1:
//  • Выбор:  autoAdvanceMs=0 → после ВЕРНОГО показываем CORRECT и ждём тапа (advance); топбар/segs
//            игра считает по results (как было).
//  • Сборка/Ввод: autoAdvanceMs>0 → после ВЕРНОГО авто-переход; на ПОСЛЕДНЕМ верном (с первой
//            попытки) сразу FINISHED без паузы; топбар/segs — по doneCount/missedIds (как было).
import { useState, useEffect, useMemo } from "react";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { filterChosenWords, shuffle, useScrollLock, semisOf } from "./gameShared.jsx";
import { playSound, playWin } from "../tools/sound.js";

const ANSWER_LEAD_MS = 300;    // пауза ПЕРЕД озвучкой ответа (даём прошлому звуку улечься / экрану смениться)
const ANSWER_TAIL_MS = 250;    // пауза ПОСЛЕ окончания озвучки ответа, затем авто-переход
const ANSWER_MAX_MS = 6000;    // страховка: если аудио не отрапортует конец — всё равно идём дальше

/**
 * @param {{
 *   gmode: string,
 *   words?: any[] | null,
 *   onResult?: ((w: any, ok: boolean | null, gmode: string, response?: any) => void) | null,
 *   onFinish?: ((s: { total: number, correct: number }) => void) | null,
 *   onExit?: (() => void) | null,
 *   setGameState?: ((s: string) => void) | null,
 *   stepNo?: number, stepTotal?: number,
 *   segs?: import('../../types.js').ProgressSeg[] | null,
 *   autoAdvanceMs?: number,
 *   speakAnswer?: (() => (Promise<any> | null)) | null,
 *   rank?: number,
 *   onAdvance?: (() => void) | null,
 *   onWrong?: (() => void) | null,
 *   reveal?: boolean,
 * }} opts
 */
export function useGameLoop({
    gmode, words: wordsProp,
    onResult, onFinish, onExit, setGameState,
    stepNo = 0, stepTotal = 0, segs: segsOverride = null,
    autoAdvanceMs = 0,   // 0 — переход по тапу (Выбор); >0 — авто-переход (Сборка/Ввод)
    speakAnswer = null,  // () => Promise(конец озвучки ответа) | null. Есть → пауза = длина аудио+хвост;
    //                      вернул null (звук выкл.) → фолбэк на фикс. autoAdvanceMs.
    rank = 0,            // стадия рампы слова (0..4) — высота звуков «вход»/«верно» (системная сессия)
    onAdvance,           // () => сбросить локальный стейт ответа для нового слова
    onWrong,             // () => очистить локальный ввод после неверного (для повтора)
    reveal = true,       // false (экзамен): нейтральный режим — без CORRECT/INCORRECT, без ретрая,
                         // подсветка выбора нейтральная, ответ копится наружу (грейд снаружи/на сервере).
}) {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const autoAdvance = useSystemStore((s) => s.autoAdvance);   // false → после верного ждём тап (ручное листание)
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const recordGameResult = useWordsStore((s) => s.recordGameResult);
    const t = interfaceTranslate[currentLanguage];
    const record = (w, ok) => { if (onResult) onResult(w, ok, gmode); else recordGameResult(w.id, ok, gmode); };

    const wordsToGame = useMemo(() => wordsProp || aiPlay || filterChosenWords(dictList), []); // eslint-disable-line
    const total = wordsToGame.length;

    const [status, setStatus] = useState(/** @type {import('../../types.js').GameStatus} */("ASKING")); // ASKING|CORRECT|INCORRECT|FINISHED
    const [order, setOrder] = useState(() => shuffle(wordsToGame)); // фикс. порядок, каждое слово 1 раз
    const [pos, setPos] = useState(0);
    const [results, setResults] = useState(/** @type {{ id: any, ok: boolean | null }[]} */([])); // по ПЕРВОЙ попытке каждого слова
    const [picked, setPicked] = useState(null); // нейтральный режим (reveal=false): выбранный ответ
    const [held, setHeld] = useState(false);    // верно, но БЕЗ авто-перехода — ждём тап (принято с опечаткой)

    useScrollLock();   // блокируем скролл фона на время игры (общий ref-counted замок)

    const current = order[pos] || null;
    const missedIds = useMemo(() => new Set(results.filter((r) => !r.ok).map((r) => r.id)), [results]);
    const doneCount = pos + (status === "FINISHED" ? 1 : 0); // сколько слов завершено
    const knownFirstTry = results.filter((r) => r.ok).length;
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;

    // Перейти к следующему слову (или к финишу).
    const advance = () => {
        if (held) setHeld(false);
        if (picked != null) setPicked(null);
        if (pos + 1 >= total) { setStatus("FINISHED"); if (reveal) playWin(); return; }
        setPos(pos + 1); setStatus("ASKING"); onAdvance?.();
    };

    // Единая точка ответа. В reveal-режиме (игры) аргумент — булево «верно». В нейтральном
    // (экзамен) — сам выбранный ответ: копим наружу, нейтральная подсветка, пауза, дальше.
    const answer = (response, opts) => {
        if (!reveal) {
            if (status !== "ASKING" || picked != null) return; // один выбор → ждём перехода
            setPicked(response);
            playSound("select");
            onResult?.(current, null, gmode, response);   // стратегия копит выбор (грейд снаружи)
            setResults((rs) => [...rs, { id: current?.id, ok: null }]);
            return;
        }
        const ok = response;
        if (status === "INCORRECT") {
            if (ok) {
                if (opts?.hold) { setStatus("CORRECT"); setHeld(true); }   // принято с опечаткой — ждём тап (звук играет игра)
                else { playSound("correct", { semis: semisOf(rank) }); advance(); }
            } else { playSound("wrong", { semis: semisOf(rank) }); onWrong?.(); }   // падение с высоты рампы
            return;
        }
        if (status !== "ASKING") return; // CORRECT/FINISHED — игнорируем
        // и «верно», и «ошибку» транспонируем по стадии слова (rank): верно — подъём НА высоте,
        // ошибка — падение С высоты. silent: звук играет сама игра.
        if (!opts?.silent) playSound(ok ? "correct" : "wrong", { semis: semisOf(rank) });
        record(current, ok);                                   // SRS — только первая попытка
        setResults((rs) => [...rs, { id: current.id, ok }]);
        if (ok) {
            // hold: верно, но без авто-перехода — ждём тап (принято с опечаткой: дать прочитать верное)
            setStatus("CORRECT"); if (opts?.hold) setHeld(true);
        } else {
            setStatus("INCORRECT"); onWrong?.();
        }
    };

    // Звук «вход в задание»: на появлении НОВОГО слова (монтирование игры / смена pos), тон по стадии
    // рампы (rank). На ретрае после ошибки (статус INCORRECT) не звучит — pos не меняется.
    useEffect(() => {
        if (status === "ASKING") playSound("enter", { semis: semisOf(rank) });
    }, [pos]); // eslint-disable-line

    // Авто-переход после верного. С озвучкой (speakAnswer вернул промис) пауза = длина аудио ответа
    // + ANSWER_TAIL_MS; без звука — фиксированная autoAdvanceMs. held (принято с опечаткой) — авто-
    // перехода НЕТ, ждём тап игрока. Выбор без звука (ms=0) — тоже по тапу.
    useEffect(() => {
        if (status !== "CORRECT" || held) return;
        let tail = null, guard = null, armT = null, done = false, manualOff = null;
        const go = () => { if (done) return; done = true; if (guard) clearTimeout(guard); tail = setTimeout(advance, ANSWER_TAIL_MS); };
        // ПАУЗА перед озвучкой ответа, затем играем и пейсим переход по КОНЦУ аудио (или фикс. без звука)
        const lead = setTimeout(() => {
            const p = speakAnswer ? speakAnswer() : null;   // озвучка ответа играет в любом режиме
            if (!autoAdvance) {
                // РУЧНОЙ режим (автопереход выключен): переход НЕ планируем — ждём тап по карточке /
                // пробел / энтер / →. Небольшая задержка перед арм-ом, чтобы не поймать тот же тап,
                // которым дали верный ответ.
                const adv = () => { if (done) return; done = true; advance(); };
                const onKey = (e) => { if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter" || e.code === "ArrowRight") { e.preventDefault(); adv(); } };
                armT = setTimeout(() => {
                    const stage = typeof document !== "undefined" ? document.querySelector(".pstage") : null;
                    window.addEventListener("keydown", onKey);
                    if (stage) stage.addEventListener("pointerup", adv);   // листаем по ОТПУСКАНИЮ (touch up), не по нажатию
                    manualOff = () => { window.removeEventListener("keydown", onKey); if (stage) stage.removeEventListener("pointerup", adv); };
                }, 450);
                return;
            }
            if (p) { guard = setTimeout(go, ANSWER_MAX_MS); p.then(go, go); }
            else if (autoAdvanceMs > 0) { tail = setTimeout(advance, autoAdvanceMs); }
        }, ANSWER_LEAD_MS);
        return () => { done = true; clearTimeout(lead); if (guard) clearTimeout(guard); if (tail) clearTimeout(tail); if (armT) clearTimeout(armT); if (manualOff) manualOff(); };
    }, [status]); // eslint-disable-line
    // Нейтральный режим (экзамен): показать выбор ~паузу, затем следующий вопрос/финиш.
    useEffect(() => {
        if (!reveal && picked != null) {
            const tm = setTimeout(advance, autoAdvanceMs || 900);
            return () => clearTimeout(tm);
        }
    }, [picked]); // eslint-disable-line

    // «Учёба» показывает свой итог — отдаём результат наружу вместо своего финиша.
    useEffect(() => {
        if (status === "FINISHED" && onFinish) onFinish({ total, correct: results.filter((r) => r.ok).length });
    }, [status]); // eslint-disable-line

    const restart = () => {
        setResults([]); setPos(0); setOrder(shuffle(wordsToGame)); setStatus("ASKING"); onAdvance?.();
    };

    const backToSelection = () => {
        if (onExit) { onExit(); return; }
        wordsToGame.forEach((w) => { if (w?.gameData?.isChoosedToGame) toggleChooseToGame(w.id); });
        setGameState?.("chooseWords");
    };

    // Счётчик «слово N / M»: в системной сессии — прогресс всей сессии (stepNo/stepTotal).
    const qIndex = stepTotal ? stepNo : Math.min(pos + 1, total);
    const qTotal = stepTotal || total;
    // Полоса прогресса по умолчанию (стиль Сборка/Ввод: по завершённым/ошибкам). Выбор строит свою.
    const autoSegs = segsOverride || Array.from({ length: total }, (_, i) => {
        if (i < doneCount) return missedIds.has(order[i]?.id) ? "err" : "ok";
        if (i === doneCount && status !== "FINISHED") return "now";
        return "";
    });

    return {
        t, currentLanguage, total, current, status, words: wordsToGame, picked, held,
        pos, results, missedIds, doneCount, knownFirstTry, score,
        qIndex, qTotal, segs: autoSegs, segsOverride,
        answer, advance, restart, backToSelection,
    };
}
