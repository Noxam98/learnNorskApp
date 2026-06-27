// Вкладка «Экзамен» раздела «Учёба» — зачётные ВОРОТА к новым словам (§2.4-A)
// и АУДИТ забывания (§2.4-B). Один экран, разные поводы:
//   • Ворота закрыты → «Учи ещё N» (прогресс pack/threshold) + кнопка «Учить».
//   • Ворота открыты → прогон экзамена пачки (выбор перевода, стиль placement) → сертификат/провал.
//   • Аудит доступен → карточка «Контрольная проверка» (тот же прогон) → итог «освежено/вернулось».
// Прогон вопросов общий для ворот и аудита (kind: 'gate' | 'audit'). Локальная 5-язычная i18n.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { ChoiceQuestion } from "../../components/gameComponents/ChoiceQuestion.jsx";
import { GameKeyboard } from "../../components/gameComponents/GameKeyboard.jsx";
import { PLAY_STYLE, PlayTopBar, ProgressSegments, ENDONYM } from "../../components/gameComponents/gameShared.jsx";
import { useGameLoop } from "../../components/gameComponents/useGameLoop.js";
import { playSound, playWin } from "../../components/tools/sound.js";
import { speakText } from "../../components/ui/tts.js";
import { hyLang } from "../../components/ui/hyphenate.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { T } from "./ExamTab.i18n.js";

// Прогон экзамена/аудита поверх ОБЩЕГО игрового цикла (useGameLoop) в нейтральном режиме
// (reveal=false): без раскрытия правильного, нейтральная подсветка выбора, пауза и переход —
// всё из цикла. Стратегия: копим выборы и грейдим пачкой на сервере (онлайн-авторитетно).
function ExamRun({ questions, lang, t, onExit, onGrade }) {
    const soundOn = useSystemStore((s) => s.soundOn);
    const vibration = useSystemStore((s) => s.vibration);
    const answersRef = useRef([]);
    const loop = useGameLoop({
        gmode: "exam", words: questions, reveal: false, autoAdvanceMs: 900,
        onResult: (w, _ok, _g, choice) => { answersRef.current.push({ pool_id: w.pool_id, answer: choice || "" }); },
        onFinish: () => onGrade(answersRef.current),
        onExit,
    });
    const { current, picked, answer, qIndex, qTotal, backToSelection } = loop;
    const [typed, setTyped] = useState("");   // для типа input

    // свуш + озвучка норв. слова при появлении вопроса (по настройке звука)
    useEffect(() => {
        if (!current) return;
        setTyped("");
        playSound("question");
        // озвучка вопроса: no2int — норвежское слово; int2no/input — родной (рус.) промпт.
        // cloze не озвучиваем (в предложении пропуск). Норвежский ОТВЕТ нигде не произносим.
        if (soundOn) {
            const ty = current.type || "no2int";
            if (ty === "no2int" && current.no) speakText(current.no, hyLang(lang, true)).catch(() => {});
            else if ((ty === "int2no" || ty === "input") && current.prompt) speakText(current.prompt, hyLang(lang, false)).catch(() => {});
        }
    }, [current]); // eslint-disable-line

    if (!current) return null;
    const pick = (v) => { if (vibration) { try { navigator.vibrate?.(10); } catch { /* нет вибро — ок */ } } answer(v); };
    // тип вопроса: no2int (норв.→перевод) | int2no (перевод→норв.) | cloze (пропуск) | input (ввод)
    const type = current.type || "no2int";
    const isInt2no = type === "int2no", isCloze = type === "cloze", isInput = type === "input";
    const prompt = isInt2no ? current.prompt : isCloze ? (current.blank || "").replace("___", "＿＿＿") : current.no;
    const promptLang = isInt2no ? lang : "no";
    const optionLang = (isInt2no || isCloze) ? "no" : lang;
    const hint = isInt2no ? t.hintInt2no : isCloze ? t.hintCloze : `${t.dir}${ENDONYM[lang] || lang}`;
    const onInputSubmit = () => { if (picked == null && typed.trim()) pick(typed.trim()); };
    const useKbd = true;   // всегда наша экранная клавиатура (как в игре «Ввод»)
    // ЕДИНЫЙ СКЕЛЕТ с играми: .play + PlayTopBar + ProgressSegments + .pstage. Поведение СВОЁ —
    // нейтрально (без ✓/✗ по ходу), счётчик «N/30» вместо них, прогресс нейтральный (is-done),
    // грейд пачкой на сервере. Клавиатура хостится как у игр (.play--kbd) → одинаково везде.
    const segs = Array.from({ length: qTotal }, (_, i) => (i < qIndex - 1 ? "done" : i === qIndex - 1 ? "now" : ""));
    const count = <span className="stat"><Icon n="layers" sm /> {qIndex} / {qTotal}</span>;
    return (
        <div className={"play" + (isInput && useKbd ? " play--kbd" : "")} data-state="asking" style={PLAY_STYLE}>
            <PlayTopBar correctCount={0} wrongCount={0} onExit={backToSelection} t={t} centerNode={count} />
            <ProgressSegments segs={segs} />
            <div className="pstage">
                {isInput ? (
                    <div className="qcard">
                        <div className="qprompt">{t.hintInput}</div>
                        <h1 className="qword" lang={lang}>{current.prompt}</h1>
                        {useKbd ? (
                            <div className="build-line" lang="no">{typed || <span className="build-line__ph">_ _ _</span>}</div>
                        ) : (
                            <form className="answer" onSubmit={(e) => { e.preventDefault(); onInputSubmit(); }}>
                                <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={picked != null}
                                    autoComplete="off" spellCheck="false" lang="no" placeholder="Norsk…" autoFocus />
                            </form>
                        )}
                        {useKbd && picked == null && (
                            <GameKeyboard lang="no" extras={["-"]} leftFiller
                                canSubmit={typed.length > 0} canBackspace={typed.length > 0}
                                onType={(c) => setTyped(typed + c)} onBackspace={() => setTyped(typed.slice(0, -1))}
                                onSubmit={onInputSubmit} />
                        )}
                        {!useKbd && (
                            <div className="pcta">
                                <button className="gbtn gbtn--accent" onClick={onInputSubmit} disabled={picked != null || !typed.trim()}>
                                    <Icon n="check" sm /> {t.inputSubmit}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <ChoiceQuestion
                        prompt={prompt}
                        promptLang={promptLang}
                        options={current.options || []}
                        optionLang={optionLang}
                        onPick={pick}
                        picked={picked}
                        reveal={false}
                        disabled={picked != null}
                        hint={hint}
                    />
                )}
            </div>
        </div>
    );
}



export default function ExamTab({ lang, go, refresh }) {
    const t = T[lang] || T.ru;

    // overview | run | result
    const [phase, setPhase] = useState("overview");
    const [loading, setLoading] = useState(true);

    // данные обзора
    const [gate, setGate] = useState(null);      // {pack, threshold, open}
    const [audit, setAudit] = useState(null);    // {questions:[...], cap}

    // прогон
    const [kind, setKind] = useState(null);      // 'gate' | 'audit'
    const [questions, setQuestions] = useState([]);
    const [busy, setBusy] = useState(false);

    // результат
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
                setResult({
                    kind: "gate",
                    passed: !!r?.passed,
                    demoted: r?.demoted ?? 0,
                });
            } else {
                const r = await api.learningAuditGrade({ lang, answers: all });
                setResult({
                    kind: "audit",
                    refreshed: r?.refreshed ?? 0,
                    forgot: r?.forgot ?? 0,
                    checked: r?.checked ?? all.length,
                });
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
                                {Math.max(0, questions.length - (result.demoted || 0))}
                                <span style={{ opacity: .45, fontSize: "1.6rem" }}> / {questions.length}</span>
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
