// Контроллер вводного теста (placement): intro → play (адаптивный квиз) → result. Запуск/ответ/
// грейд через api.placement*; самооценка уровня как альтернатива тесту. Вынесено из PlacementScreen.jsx.
import { useMemo, useState } from "react";
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
            setQuestions(qs); setQi(0); setAnswers([]); setPhase("play");
        } catch { onClose?.(false); }
        finally { setBusy(false); }
    };

    const grade = async (all) => {
        setBusy(true); setPhase("result");
        try {
            const r = await api.placementGrade({ lang, answers: all });
            const answered = all.filter((a) => a.answer).length;
            const conf = all.length ? Math.round((answered / all.length) * 100) : 0;
            setResult({ level: r?.level || "A1", conf });
        } catch { setResult({ level: "A1", conf: 0 }); }
        finally { setBusy(false); }
    };

    const answer = (val) => {
        if (!cur) return;
        const type = cur.type || "choice"; // старый формат без type → choice (обратная совместимость)
        const next = [...answers, { no: cur.no, level: cur.level, answer: val || "", type }];
        setAnswers(next);
        if (qi + 1 >= questions.length) grade(next);
        else setQi(qi + 1);
    };

    const saveSelf = async () => {
        setBusy(true);
        try { await api.placementLevel(selfLevel); onClose?.(true); }
        catch { onClose?.(true); }
        finally { setBusy(false); }
    };

    return { phase, selfOpen, setSelfOpen, selfLevel, setSelfLevel, questions, qi, result, busy, cur, levelsInTest, beginTest, answer, saveSelf };
}
