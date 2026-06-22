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
import { filterChosenWords, shuffle } from "./gameShared.jsx";
import { playSound, playWin } from "../tools/sound.js";

export function useGameLoop({
    gmode, words: wordsProp,
    onResult, onFinish, onExit, setGameState,
    stepNo = 0, stepTotal = 0, segs: segsOverride = null,
    autoAdvanceMs = 0,   // 0 — переход по тапу (Выбор); >0 — авто-переход (Сборка/Ввод)
    onAdvance,           // () => сбросить локальный стейт ответа для нового слова
    onWrong,             // () => очистить локальный ввод после неверного (для повтора)
}) {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const dictList = useWordsStore((s) => s.dictList);
    const aiPlay = useWordsStore((s) => s.aiPlayWords);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const recordGameResult = useWordsStore((s) => s.recordGameResult);
    const t = interfaceTranslate[currentLanguage];
    const record = (w, ok) => { if (onResult) onResult(w, ok, gmode); else recordGameResult(w.id, ok, gmode); };

    const wordsToGame = useMemo(() => wordsProp || aiPlay || filterChosenWords(dictList), []); // eslint-disable-line
    const total = wordsToGame.length;

    const [status, setStatus] = useState("ASKING"); // ASKING | CORRECT | INCORRECT | FINISHED
    const [order, setOrder] = useState(() => shuffle(wordsToGame)); // фикс. порядок, каждое слово 1 раз
    const [pos, setPos] = useState(0);
    const [results, setResults] = useState([]); // {id, ok} — по ПЕРВОЙ попытке каждого слова

    // На время игры блокируем скролл фона: оверлей .play фиксирован, но на тач страница позади
    // всё равно скроллилась (видна полоса прокрутки). Гасим overflow на body/html.
    useEffect(() => {
        const b = document.body, h = document.documentElement;
        const prev = { bo: b.style.overflow, ho: h.style.overflow, ob: b.style.overscrollBehavior };
        b.style.overflow = "hidden"; h.style.overflow = "hidden"; b.style.overscrollBehavior = "none";
        return () => { b.style.overflow = prev.bo; h.style.overflow = prev.ho; b.style.overscrollBehavior = prev.ob; };
    }, []);

    const current = order[pos] || null;
    const missedIds = useMemo(() => new Set(results.filter((r) => !r.ok).map((r) => r.id)), [results]);
    const doneCount = pos + (status === "FINISHED" ? 1 : 0); // сколько слов завершено
    const knownFirstTry = results.filter((r) => r.ok).length;
    const score = total ? Math.round((knownFirstTry / total) * 100) : 0;

    // Перейти к следующему слову (или к финишу).
    const advance = () => {
        if (pos + 1 >= total) { setStatus("FINISHED"); playWin(); return; }
        setPos(pos + 1); setStatus("ASKING"); onAdvance?.();
    };

    // Единая точка ответа. ok — верно ли. В INCORRECT это ПОВТОР после показа ответа.
    const answer = (ok) => {
        if (status === "INCORRECT") {
            if (ok) { playSound("correct"); advance(); }
            else { playSound("wrong"); onWrong?.(); }
            return;
        }
        if (status !== "ASKING") return; // CORRECT/FINISHED — игнорируем
        playSound(ok ? "correct" : "wrong");
        record(current, ok);                                   // SRS — только первая попытка
        setResults((rs) => [...rs, { id: current.id, ok }]);
        if (ok) {
            setStatus("CORRECT");   // показываем «верно» ~1с, затем авто-переход (см. эффект ниже)
        } else {
            setStatus("INCORRECT"); onWrong?.();
        }
    };

    // Авто-переход после верного (Сборка/Ввод). Выбор (ms=0) — переход по тапу через advance().
    useEffect(() => {
        if (status === "CORRECT" && autoAdvanceMs > 0) {
            const tm = setTimeout(advance, autoAdvanceMs);
            return () => clearTimeout(tm);
        }
    }, [status]); // eslint-disable-line

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
        t, currentLanguage, total, current, status, words: wordsToGame,
        pos, results, missedIds, doneCount, knownFirstTry, score,
        qIndex, qTotal, segs: autoSegs, segsOverride,
        answer, advance, restart, backToSelection,
    };
}
