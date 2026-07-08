// Контроллер вводного теста (placement): intro → play (адаптивный квиз) → result. Запуск/ответ/
// грейд через api.placement*; самооценка уровня как альтернатива тесту. Вынесено из PlacementScreen.jsx.
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../tools/api.js";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function usePlacement(lang, onClose) {
    const [phase, setPhase] = useState("intro");   // intro | play | result
    const [selfOpen, setSelfOpen] = useState(false);
    const [selfLevel, setSelfLevel] = useState("B1");
    const [questions, setQuestions] = useState([]);
    const [qi, setQi] = useState(0);
    const [answers, setAnswers] = useState([]);    // [{no, level, answer}]
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [gradeErr, setGradeErr] = useState(false);   // сетевой сбой грейда — показать «повторить», не фабриковать уровень
    const [locked, setLocked] = useState(false);       // ответ выбран — блокируем варианты до перехода/грейда (анти-дабл-тап)
    const lockRef = useRef(false);                     // синхронный дубль-гард (state обновляется асинхронно)

    const cur = questions[qi] || null;
    const levelsInTest = useMemo(
        () => LEVELS.filter((lv) => questions.some((q) => q.level === lv)),
        [questions]
    );

    // --- запуск теста ---
    const beginTest = async () => {
        setBusy(true);
        try {
            const r = await api.placementGet(lang, 4);
            const qs = (r?.questions || []).slice().sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
            if (!qs.length) { onClose?.(false); return; }
            setGradeErr(false); lockRef.current = false; setLocked(false);
            setQuestions(qs); setQi(0); setAnswers([]); setPhase("play");
        } catch { onClose?.(false); }
        finally { setBusy(false); }
    };

    const grade = async (all) => {
        setBusy(true); setPhase("result"); setGradeErr(false);
        try {
            const r = await api.placementGrade({ lang, answers: all });
            const answered = all.filter((a) => a.answer).length;
            const conf = all.length ? Math.round((answered / all.length) * 100) : 0;
            setResult({ level: r?.level || "A1", conf });
        } catch {
            // Сетевой сбой: POST грейда (оценка + seed_starter) НЕ прошёл — start_level остался NULL,
            // старт был бы пуст, а ответы потеряны. НЕ фабрикуем «A1» (экран соврал бы про уровень) —
            // показываем ошибку с «повторить»; ответы уже в state (answers) для повторной отправки.
            setResult(null); setGradeErr(true);
        }
        finally { setBusy(false); }
    };

    // Повторная отправка после сетевого сбоя грейда — ответы сохранены в state.
    const retryGrade = () => { if (!busy && answers.length) grade(answers); };

    const answer = (val) => {
        if (lockRef.current || !cur) return;   // анти-дабл-тап: один ответ на вопрос (иначе дважды зовём grade/seed_starter)
        lockRef.current = true; setLocked(true);
        const type = cur.type || "choice"; // старый формат без type → choice (обратная совместимость)
        const next = [...answers, { no: cur.no, level: cur.level, answer: val || "", type }];
        setAnswers(next);
        if (qi + 1 >= questions.length) grade(next);
        else setQi(qi + 1);
    };

    // Новый вопрос показан → снимаем замок ввода. На последнем вопросе qi не меняется (идёт грейд) —
    // замок держится до result, варианты остаются заблокированы.
    useEffect(() => { lockRef.current = false; setLocked(false); }, [qi]);

    const saveSelf = async () => {
        setBusy(true);
        try { await api.placementLevel(selfLevel); onClose?.(true); }
        catch { onClose?.(true); }
        finally { setBusy(false); }
    };

    return { phase, selfOpen, setSelfOpen, selfLevel, setSelfLevel, questions, qi, result, busy, gradeErr, locked, cur, levelsInTest, beginTest, answer, retryGrade, saveSelf };
}
