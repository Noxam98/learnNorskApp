// Контроллер вкладки «Экзамен»: обзор ворот к новым словам, запуск прогона,
// грейд пачкой на сервере, возврат в обзор + звук итога (фанфара/грусть). Вынесено из ExamTab.jsx.
import { useEffect, useState } from "react";
import api from "../../components/tools/api.js";
import { playSound, playWin } from "../../components/tools/sound.js";

export function useExam(lang, refresh) {
    const [phase, setPhase] = useState("overview"); // overview | run | result
    const [loading, setLoading] = useState(true);
    const [gate, setGate] = useState(null);      // {pack, threshold, open}
    const [questions, setQuestions] = useState([]);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    // ---------- загрузка обзора ----------
    const loadOverview = async () => {
        setLoading(true);
        try {
            const g = await api.learningGate().catch(() => null);
            setGate(g || { pack: 0, threshold: 0, open: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, [lang]);

    // звук итога: фанфара при успехе, грустный — иначе
    useEffect(() => {
        if (phase !== "result" || !result) return;
        if (result.passed) playWin(); else playSound("wrong");
    }, [result]); // eslint-disable-line

    // ---------- запуск прогона ----------
    const startGate = async () => {
        setBusy(true);
        try {
            const r = await api.learningGateExam(lang);
            const qs = r?.questions || [];
            if (!qs.length) { await loadOverview(); return; }
            setQuestions(qs); setResult(null); setPhase("run");
        } catch { /* тост уже показан в api */ }
        finally { setBusy(false); }
    };

    const grade = async (all) => {
        setBusy(true); setPhase("result");
        try {
            const r = await api.learningGateGrade({ lang, answers: all });
            setResult({ passed: !!r?.passed, demoted: r?.demoted ?? 0, correct: r?.correct, total: r?.total });
            refresh?.();
        } catch {
            // при сбое возвращаем в обзор
            setPhase("overview");
        } finally {
            setBusy(false);
        }
    };

    const backToOverview = async () => {
        setQuestions([]); setResult(null);
        setPhase("overview");
        await loadOverview();
    };

    return { phase, loading, gate, questions, busy, result, startGate, grade, backToOverview };
}
