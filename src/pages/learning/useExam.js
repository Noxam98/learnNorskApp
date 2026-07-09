// Контроллер вкладки «Экзамен»: обзор (ворота к новым словам / аудит забывания), запуск прогона,
// грейд пачкой на сервере, возврат в обзор + звук итога (фанфара/грусть). Вынесено из ExamTab.jsx.
import { useEffect, useState } from "react";
import api from "../../components/tools/api.js";
import { playSound, playWin } from "../../components/tools/sound.js";

export function useExam(lang, refresh) {
    const [phase, setPhase] = useState("overview"); // overview | run | result
    const [loading, setLoading] = useState(true);
    const [gate, setGate] = useState(null);      // {pack, threshold, open}
    const [audit, setAudit] = useState(null);    // {questions:[...], cap}
    const [kind, setKind] = useState(null);      // 'gate' | 'audit'
    const [questions, setQuestions] = useState([]);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    // ---------- загрузка обзора ----------
    const loadOverview = async () => {
        setLoading(true);
        try {
            const [g, a] = await Promise.all([
                api.learningGate().catch(() => null),
                api.learningAudit(lang).catch(() => null),
            ]);
            setGate(g || { pack: 0, threshold: 0, open: false });
            setAudit(a && (a.questions || []).length ? a : null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    // звук итога: фанфара при успехе, грустный — иначе
    useEffect(() => {
        if (phase !== "result" || !result) return;
        const good = result.kind === "gate" ? result.passed : result.forgot === 0;
        if (good) playWin(); else playSound("wrong");
    }, [result]); // eslint-disable-line

    // ---------- запуск прогона ----------
    const startGate = async () => {
        setBusy(true);
        try {
            const r = await api.learningGateExam(lang);
            const qs = r?.questions || [];
            if (!qs.length) { await loadOverview(); return; }
            setKind("gate"); setQuestions(qs); setResult(null); setPhase("run");
        } catch { /* тост уже показан в api */ }
        finally { setBusy(false); }
    };

    const startAudit = () => {
        const qs = audit?.questions || [];
        if (!qs.length) return;
        setKind("audit"); setQuestions(qs); setResult(null); setPhase("run");
    };

    const grade = async (all) => {
        setBusy(true); setPhase("result");
        try {
            if (kind === "gate") {
                const r = await api.learningGateGrade({ lang, answers: all });
                setResult({ kind: "gate", passed: !!r?.passed, demoted: r?.demoted ?? 0, correct: r?.correct, total: r?.total });
            } else {
                const r = await api.learningAuditGrade({ lang, answers: all });
                setResult({ kind: "audit", refreshed: r?.refreshed ?? 0, forgot: r?.forgot ?? 0, checked: r?.checked ?? all.length });
            }
            refresh?.();
        } catch {
            // при сбое возвращаем в обзор
            setPhase("overview");
        } finally {
            setBusy(false);
        }
    };

    const backToOverview = async () => {
        setKind(null); setQuestions([]); setResult(null);
        setPhase("overview");
        await loadOverview();
    };

    return { phase, loading, gate, audit, kind, questions, busy, result, startGate, startAudit, grade, backToOverview };
}
