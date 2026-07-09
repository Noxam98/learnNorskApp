// Вкладка «Экзамен» раздела «Учёба» — зачётные ВОРОТА к новым словам (§2.4-A)
// и АУДИТ забывания (§2.4-B). Один экран, разные поводы:
//   • Ворота закрыты → «Учи ещё N» (прогресс pack/threshold) + кнопка «Учить».
//   • Ворота открыты → прогон экзамена пачки (выбор перевода, стиль placement) → сертификат/провал.
//   • Аудит доступен → карточка «Контрольная проверка» (тот же прогон) → итог «освежено/вернулось».
// Прогон вопросов общий для ворот и аудита (kind: 'gate' | 'audit'). Локальная 5-язычная i18n.
import { motion } from "framer-motion";
import { Icon } from "../../components/ui/Icon.jsx";
import { T } from "./ExamTab.i18n.js";
import { useExam } from "./useExam.js";
import ExamRun from "./ExamRun.jsx";

export default function ExamTab({ lang, go, refresh }) {
    const t = T[lang] || T.ru;

    // Вся логика обзора/прогона/грейда — в контроллере useExam; здесь только экраны.
    const { phase, loading, gate, audit, kind, questions, busy, result,
        startGate, startAudit, grade, backToOverview } = useExam(lang, refresh);

    // ====================================================================
    // RUN (прогон вопросов — выбор перевода, стиль placement)
    // ====================================================================
    if (phase === "run") {
        return (
            <ExamRun questions={questions} kind={kind} lang={lang} t={t}
                onExit={backToOverview} onGrade={grade} />
        );
    }

    // ====================================================================
    // RESULT
    // ====================================================================
    if (phase === "result") {
        if (busy || !result) {
            return (
                <div className="exam-grid">
                    <div className="spanel"><div className="spanel__body">
                        <div className="muted" style={{ padding: "var(--sp-5)", textAlign: "center" }}>{t.grading}</div>
                    </div></div>
                </div>
            );
        }

        if (result.kind === "gate") {
            const passed = result.passed;
            const color = passed ? "var(--success)" : "var(--st-weak)";
            return (
                <div className="exam-grid">
                    <div className="spanel" style={{ gridColumn: "1 / -1" }}>
                        <div className="spanel__body" style={resBody}>
                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 280, damping: 16 }}
                                style={{ fontSize: "2.6rem", fontWeight: 800, color, lineHeight: 1 }}>
                                {result.correct ?? Math.max(0, questions.length - (result.demoted || 0))}
                                <span style={{ opacity: .45, fontSize: "1.6rem" }}> / {result.total ?? questions.length}</span>
                            </motion.div>
                            <motion.span className="grade-cefr" style={{ background: color }}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                                <Icon n={passed ? "check" : "x-circle"} sm style={{ marginRight: 7 }} />
                                {passed ? t.passedTitle : t.failedTitle}
                            </motion.span>
                            <p className="muted" style={resDesc}>
                                {passed ? t.passedDesc : t.failedDesc(result.demoted)}
                            </p>
                            {!passed && result.demoted > 0 && (
                                <div className="exam-sumrow" style={{ maxWidth: 360, width: "100%" }}>
                                    <span className="exam-sumrow__l"><Icon n="rotate" sm /> {t.toRetake(result.demoted)}</span>
                                </div>
                            )}
                            <div style={resActions}>
                                {passed ? (
                                    <button className="btn btn--accent btn--lg btn--block" onClick={backToOverview}>
                                        <Icon n="check" sm /> {t.done}
                                    </button>
                                ) : (
                                    <button className="btn btn--accent btn--lg btn--block"
                                        onClick={() => { go("today"); refresh?.(); }}>
                                        <Icon n="graduation" sm /> {t.goStudy}
                                    </button>
                                )}
                                <button className="btn btn--ghost btn--block" onClick={backToOverview}>
                                    <Icon n="arrow-left" sm /> {t.backStudy}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // аудит
        return (
            <div className="exam-grid">
                <div className="spanel" style={{ gridColumn: "1 / -1" }}>
                    <div className="spanel__body" style={resBody}>
                        <span className="grade-cefr" style={{ background: "var(--st-learn)" }}>
                            <Icon n="check" sm style={{ marginRight: 7 }} /> {t.auditDoneTitle}
                        </span>
                        <p className="muted" style={resDesc}>
                            {t.auditDoneDesc(result.refreshed, result.forgot)}
                        </p>
                        <div style={resActions}>
                            {result.forgot > 0 ? (
                                <button className="btn btn--accent btn--lg btn--block"
                                    onClick={() => { go("today"); refresh?.(); }}>
                                    <Icon n="graduation" sm /> {t.goStudy}
                                </button>
                            ) : (
                                <button className="btn btn--accent btn--lg btn--block" onClick={backToOverview}>
                                    <Icon n="check" sm /> {t.done}
                                </button>
                            )}
                            <button className="btn btn--ghost btn--block" onClick={backToOverview}>
                                <Icon n="arrow-left" sm /> {t.backStudy}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ====================================================================
    // OVERVIEW (ворота + аудит)
    // ====================================================================
    if (loading) {
        return (
            <div className="exam-grid">
                <div className="spanel"><div className="spanel__body">
                    <div className="muted" style={{ padding: "var(--sp-5)", textAlign: "center" }}>{t.loading}</div>
                </div></div>
            </div>
        );
    }

    const pack = gate?.pack ?? 0;
    const threshold = gate?.threshold ?? 0;
    const open = !!gate?.open;
    const remaining = Math.max(0, threshold - pack);
    const gatePct = threshold ? Math.min(100, Math.round((pack / threshold) * 100)) : 0;
    const hasAudit = !!audit && (audit.questions || []).length > 0;
    const auditN = hasAudit ? audit.questions.length : 0;

    // нет ни ворот (закрыто, но порог 0), ни аудита — «всё под контролем»
    const nothing = !open && threshold === 0 && !hasAudit;

    return (
        <div className="exam-grid">
            {/* ----- Ворота ----- */}
            <div className="spanel">
                <div className="spanel__head">
                    <span className="eyebrow"><Icon n="graduation" sm /> {t.eyebrow}</span>
                </div>
                <div className="spanel__body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                    {nothing ? (
                        <>
                            <div style={{ fontSize: "var(--fs-18)", fontWeight: 800 }}>{t.allClearTitle}</div>
                            <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>{t.allClearDesc}</p>
                        </>
                    ) : open ? (
                        <>
                            <div style={{ fontSize: "var(--fs-20)", fontWeight: 800 }}>{t.openTitle}</div>
                            <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>
                                {t.openDesc(Math.min(pack, 30), 27)}
                            </p>
                            <button className="btn btn--accent btn--lg btn--block" onClick={startGate} disabled={busy}>
                                <Icon n="play" sm /> {busy ? t.loading : t.startExam}
                            </button>
                            <span className="muted-3" style={{ fontSize: "var(--fs-12)", textAlign: "center" }}>
                                {t.neutralNote}
                            </span>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: "var(--fs-20)", fontWeight: 800 }}>{t.lockedTitle}</div>
                            <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>
                                {t.lockedDesc(remaining)}
                            </p>
                            <div>
                                <div className="bd-row__top" style={{ marginBottom: 6 }}>
                                    <span className="bd-row__name">{t.progressLbl}</span>
                                    <span className="bd-row__val">{t.ofThreshold(pack, threshold)}</span>
                                </div>
                                <div className="lvl-track"><span style={{ width: `${gatePct}%`, background: "var(--fjord-600)" }} /></div>
                            </div>
                            <button className="btn btn--accent btn--lg btn--block"
                                onClick={() => { go("today"); refresh?.(); }}>
                                <Icon n="graduation" sm /> {t.goStudy} · {t.toExam(remaining)}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ----- Аудит ----- */}
            {hasAudit && (
                <div className="spanel">
                    <div className="spanel__head">
                        <span className="spanel__title"><Icon n="rotate" sm /> {t.auditTitle}</span>
                    </div>
                    <div className="spanel__body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                        <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>
                            {t.auditDesc(auditN)}
                        </p>
                        <button className="btn btn--outline btn--lg btn--block" onClick={startAudit} disabled={busy}>
                            <Icon n="play" sm /> {t.startAudit} · {auditN}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- инлайн-стили результата ----
const resBody = {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "var(--sp-4)", padding: "var(--sp-6)", textAlign: "center",
};
const resDesc = { fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0, maxWidth: 480 };
const resActions = {
    display: "flex", flexDirection: "column", gap: "var(--sp-3)",
    width: "100%", maxWidth: 360, marginTop: "var(--sp-2)",
};
