// Вкладка «Экзамен» раздела «Учёба» — зачётные ВОРОТА к новым словам (§2.4-A)
// и АУДИТ забывания (§2.4-B). Один экран, разные поводы:
//   • Ворота закрыты → «Учи ещё N» (прогресс pack/threshold) + кнопка «Учить».
//   • Ворота открыты → прогон экзамена пачки (выбор перевода, стиль placement) → сертификат/провал.
//   • Аудит доступен → карточка «Контрольная проверка» (тот же прогон) → итог «освежено/вернулось».
// Прогон вопросов общий для ворот и аудита (kind: 'gate' | 'audit'). Локальная 5-язычная i18n.
import { useEffect, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";

const ENDONYM = { ru: "русский", ukr: "українську", en: "English", pl: "polski", lt: "lietuvių" };

// ---------- Локальная i18n (ru/en/ukr/pl/lt) ----------
const T = {
    ru: {
        eyebrow: "Экзамен · ворота к новым словам",
        loading: "Готовим экзамен…", grading: "Считаем результат…",
        // закрыто
        lockedTitle: "Экзамен ещё закрыт",
        lockedDesc: (n) => `Откроется, когда выучишь ещё ${n}. Тогда зачётный экзамен сертифицирует пачку и откроет приток новых слов.`,
        progressLbl: "До экзамена",
        ofThreshold: (a, b) => `${a} / ${b} выучено`,
        toExam: (n) => `Выучить ещё ${n}`,
        goStudy: "Учить",
        // открыто (интро)
        openTitle: "Экзамен пачки доступен",
        openDesc: (s, p) => `${s} случайных слов из выученных. Сдать нужно ≥ ${p}. Это сертифицирует пачку и снова откроет новые слова.`,
        startExam: "Начать экзамен", neutralNote: "Балл не двигает интервалы · ошибки уйдут в повторение",
        // прогон
        dir: "Норвежский → ", whats: "Что это значит?",
        qCount: (i, n) => `${i} / ${n}`,
        // результат ворот
        passedTitle: "Пачка сертифицирована",
        passedDesc: "Новые слова снова открыты — копится следующая пачка. Старое теперь проверит аудит.",
        failedTitle: "Пока не сдано",
        failedDesc: (n) => `${n} слов вернулись в повторение — доучи их и пересдай. Пересдача откроется, когда пачка снова наберётся.`,
        toRetake: (n) => `Доучить ${n} до пересдачи`,
        backStudy: "Вернуться к учёбе",
        // аудит
        auditTitle: "Контрольная проверка",
        auditDesc: (n) => `${n} давно выученных слов на свежесть. Вспомнил — срок проверки растёт; забыл — слово вернётся в изучение.`,
        startAudit: "Пройти проверку",
        auditDoneTitle: "Проверка пройдена",
        auditDoneDesc: (refreshed, forgot) =>
            forgot > 0
                ? `Освежено ${refreshed}, вернулось в изучение ${forgot}.`
                : `Освежено ${refreshed} — всё на месте, отличная память!`,
        done: "Готово",
        // пусто
        allClearTitle: "Всё под контролем",
        allClearDesc: "Сейчас ни ворот, ни аудита. Продолжай ежедневные сессии — экзамен откроется сам, когда наберётся пачка.",
    },
    en: {
        eyebrow: "Exam · gate to new words",
        loading: "Preparing exam…", grading: "Calculating…",
        lockedTitle: "Exam not open yet",
        lockedDesc: (n) => `It opens once you learn ${n} more. Then the checkpoint exam certifies the pack and unlocks new words.`,
        progressLbl: "To exam",
        ofThreshold: (a, b) => `${a} / ${b} learned`,
        toExam: (n) => `Learn ${n} more`,
        goStudy: "Study",
        openTitle: "Pack exam available",
        openDesc: (s, p) => `${s} random words from your learned ones. You need ≥ ${p} to pass. Passing certifies the pack and reopens new words.`,
        startExam: "Start exam", neutralNote: "Score doesn't move intervals · mistakes go to review",
        dir: "Norwegian → ", whats: "What does it mean?",
        qCount: (i, n) => `${i} / ${n}`,
        passedTitle: "Pack certified",
        passedDesc: "New words are open again — the next pack starts filling. The audit now watches the old ones.",
        failedTitle: "Not passed yet",
        failedDesc: (n) => `${n} words went back to review — re-learn them and retake. The retake opens once the pack fills up again.`,
        toRetake: (n) => `Re-learn ${n} to retake`,
        backStudy: "Back to study",
        auditTitle: "Maintenance check",
        auditDesc: (n) => `${n} long-learned words checked for freshness. Recall it — its check pushes further; forget it — it returns to study.`,
        startAudit: "Run check",
        auditDoneTitle: "Check complete",
        auditDoneDesc: (refreshed, forgot) =>
            forgot > 0
                ? `Refreshed ${refreshed}, returned to study ${forgot}.`
                : `Refreshed ${refreshed} — all kept, great memory!`,
        done: "Done",
        allClearTitle: "All under control",
        allClearDesc: "No gate or audit right now. Keep your daily sessions — the exam opens itself once a pack fills up.",
    },
    ukr: {
        eyebrow: "Екзамен · ворота до нових слів",
        loading: "Готуємо екзамен…", grading: "Рахуємо…",
        lockedTitle: "Екзамен ще закрито",
        lockedDesc: (n) => `Відкриється, коли вивчиш ще ${n}. Тоді залік сертифікує пачку й відкриє приплив нових слів.`,
        progressLbl: "До екзамену",
        ofThreshold: (a, b) => `${a} / ${b} вивчено`,
        toExam: (n) => `Вивчити ще ${n}`,
        goStudy: "Вчити",
        openTitle: "Екзамен пачки доступний",
        openDesc: (s, p) => `${s} випадкових слів із вивчених. Скласти потрібно ≥ ${p}. Це сертифікує пачку й знову відкриє нові слова.`,
        startExam: "Почати екзамен", neutralNote: "Бал не рухає інтервали · помилки підуть на повторення",
        dir: "Норвезька → ", whats: "Що це означає?",
        qCount: (i, n) => `${i} / ${n}`,
        passedTitle: "Пачку сертифіковано",
        passedDesc: "Нові слова знову відкриті — накопичується наступна пачка. Старе тепер перевірить аудит.",
        failedTitle: "Поки не складено",
        failedDesc: (n) => `${n} слів повернулися на повторення — доучи їх і перездай. Перездача відкриється, коли пачка набереться знову.`,
        toRetake: (n) => `Доучити ${n} до перездачі`,
        backStudy: "Повернутися до навчання",
        auditTitle: "Контрольна перевірка",
        auditDesc: (n) => `${n} давно вивчених слів на свіжість. Згадав — термін перевірки росте; забув — слово повернеться в навчання.`,
        startAudit: "Пройти перевірку",
        auditDoneTitle: "Перевірку пройдено",
        auditDoneDesc: (refreshed, forgot) =>
            forgot > 0
                ? `Освіжено ${refreshed}, повернулося в навчання ${forgot}.`
                : `Освіжено ${refreshed} — усе на місці, чудова памʼять!`,
        done: "Готово",
        allClearTitle: "Усе під контролем",
        allClearDesc: "Зараз ні воріт, ні аудиту. Продовжуй щоденні сесії — екзамен відкриється сам, коли набереться пачка.",
    },
    pl: {
        eyebrow: "Egzamin · brama do nowych słów",
        loading: "Przygotowujemy egzamin…", grading: "Liczymy…",
        lockedTitle: "Egzamin jeszcze zamknięty",
        lockedDesc: (n) => `Otworzy się, gdy nauczysz się jeszcze ${n}. Wtedy egzamin certyfikuje paczkę i otworzy dopływ nowych słów.`,
        progressLbl: "Do egzaminu",
        ofThreshold: (a, b) => `${a} / ${b} nauczone`,
        toExam: (n) => `Naucz się jeszcze ${n}`,
        goStudy: "Ucz się",
        openTitle: "Egzamin paczki dostępny",
        openDesc: (s, p) => `${s} losowych słów z nauczonych. Zdać trzeba ≥ ${p}. To certyfikuje paczkę i znów otworzy nowe słowa.`,
        startExam: "Rozpocznij egzamin", neutralNote: "Wynik nie zmienia interwałów · błędy trafią do powtórki",
        dir: "Norweski → ", whats: "Co to znaczy?",
        qCount: (i, n) => `${i} / ${n}`,
        passedTitle: "Paczka certyfikowana",
        passedDesc: "Nowe słowa znów otwarte — zbiera się kolejna paczka. Stare pilnuje teraz audyt.",
        failedTitle: "Jeszcze niezdane",
        failedDesc: (n) => `${n} słów wróciło do powtórki — doucz je i podejdź ponownie. Poprawka otworzy się, gdy paczka znów się zapełni.`,
        toRetake: (n) => `Doucz ${n} do poprawki`,
        backStudy: "Wróć do nauki",
        auditTitle: "Kontrola utrwalenia",
        auditDesc: (n) => `${n} dawno nauczonych słów na świeżość. Pamiętasz — termin kontroli rośnie; zapomniałeś — słowo wraca do nauki.`,
        startAudit: "Przeprowadź kontrolę",
        auditDoneTitle: "Kontrola ukończona",
        auditDoneDesc: (refreshed, forgot) =>
            forgot > 0
                ? `Odświeżono ${refreshed}, wróciło do nauki ${forgot}.`
                : `Odświeżono ${refreshed} — wszystko zostało, świetna pamięć!`,
        done: "Gotowe",
        allClearTitle: "Wszystko pod kontrolą",
        allClearDesc: "Teraz ani bramy, ani audytu. Kontynuuj codzienne sesje — egzamin otworzy się sam, gdy zbierze się paczka.",
    },
    lt: {
        eyebrow: "Egzaminas · vartai į naujus žodžius",
        loading: "Ruošiame egzaminą…", grading: "Skaičiuojame…",
        lockedTitle: "Egzaminas dar uždarytas",
        lockedDesc: (n) => `Atsivers, kai išmoksi dar ${n}. Tada įskaitos egzaminas sertifikuos rinkinį ir atvers naujų žodžių srautą.`,
        progressLbl: "Iki egzamino",
        ofThreshold: (a, b) => `${a} / ${b} išmokta`,
        toExam: (n) => `Išmok dar ${n}`,
        goStudy: "Mokytis",
        openTitle: "Rinkinio egzaminas prieinamas",
        openDesc: (s, p) => `${s} atsitiktinių žodžių iš išmoktų. Reikia išlaikyti ≥ ${p}. Tai sertifikuoja rinkinį ir vėl atveria naujus žodžius.`,
        startExam: "Pradėti egzaminą", neutralNote: "Balas nejudina intervalų · klaidos eis kartoti",
        dir: "Norvegų → ", whats: "Ką tai reiškia?",
        qCount: (i, n) => `${i} / ${n}`,
        passedTitle: "Rinkinys sertifikuotas",
        passedDesc: "Nauji žodžiai vėl atverti — kaupiasi kitas rinkinys. Senus dabar tikrins auditas.",
        failedTitle: "Dar neišlaikyta",
        failedDesc: (n) => `${n} žodžių grįžo kartoti — pramokyk juos ir perlaikyk. Perlaikymas atsivers, kai rinkinys vėl susikaups.`,
        toRetake: (n) => `Pramokyti ${n} iki perlaikymo`,
        backStudy: "Grįžti į mokymąsi",
        auditTitle: "Kontrolinis patikrinimas",
        auditDesc: (n) => `${n} seniai išmoktų žodžių šviežumui. Prisiminei — tikrinimo terminas auga; pamiršai — žodis grįš mokytis.`,
        startAudit: "Atlikti patikrinimą",
        auditDoneTitle: "Patikrinimas baigtas",
        auditDoneDesc: (refreshed, forgot) =>
            forgot > 0
                ? `Atnaujinta ${refreshed}, grįžo mokytis ${forgot}.`
                : `Atnaujinta ${refreshed} — viskas vietoje, puiki atmintis!`,
        done: "Atlikta",
        allClearTitle: "Viskas po kontrole",
        allClearDesc: "Dabar nei vartų, nei audito. Tęsk kasdienes sesijas — egzaminas atsivers pats, kai susikaups rinkinys.",
    },
};

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
    const [qi, setQi] = useState(0);
    const [answers, setAnswers] = useState([]);  // [{pool_id, answer}]
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

    const cur = questions[qi] || null;

    // ---------- запуск прогона ----------
    const startGate = async () => {
        setBusy(true);
        try {
            const r = await api.learningGateExam(lang);
            const qs = r?.questions || [];
            if (!qs.length) { await loadOverview(); return; }
            setKind("gate"); setQuestions(qs); setQi(0); setAnswers([]); setResult(null); setPhase("run");
        } catch { /* тост уже показан в api */ }
        finally { setBusy(false); }
    };

    const startAudit = () => {
        const qs = audit?.questions || [];
        if (!qs.length) return;
        setKind("audit"); setQuestions(qs); setQi(0); setAnswers([]); setResult(null); setPhase("run");
    };

    // ---------- ответ ----------
    const answer = (val) => {
        if (!cur) return;
        const next = [...answers, { pool_id: cur.pool_id, answer: val || "" }];
        setAnswers(next);
        if (qi + 1 >= questions.length) grade(next);
        else setQi(qi + 1);
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
        setKind(null); setQuestions([]); setQi(0); setAnswers([]); setResult(null);
        setPhase("overview");
        await loadOverview();
    };

    // ====================================================================
    // RUN (прогон вопросов — выбор перевода, стиль placement)
    // ====================================================================
    if (phase === "run" && cur) {
        const pct = questions.length ? Math.round((qi / questions.length) * 100) : 0;
        const accent = kind === "audit" ? "var(--st-learn)" : "var(--fjord-600)";
        return (
            <div className="study-root">
                <div className="plc-stage">
                    <div className="plc-top">
                        <button className="plc-top__back" onClick={backToOverview} aria-label="close"><Icon n="x" /></button>
                        <div className="plc-bar"><span style={{ width: `${pct}%`, background: accent }} /></div>
                        <span className="plc-count">{t.qCount(qi + 1, questions.length)}</span>
                    </div>
                    <div className="plc-q">
                        <div className="plc-q__card">
                            <span className="plc-q__dir">
                                <Icon n={kind === "audit" ? "rotate" : "graduation"} sm />{" "}
                                {kind === "audit" ? t.auditTitle : t.openTitle}
                            </span>
                            <div>
                                <div className="plc-q__prompt" lang="no">{cur.no}</div>
                                <div className="plc-q__sub">{t.dir}{ENDONYM[lang] || lang}</div>
                            </div>
                            <div className="plc-opts">
                                {(cur.options || []).map((opt) => (
                                    <button key={opt} className="plc-opt" onClick={() => answer(opt)}>{opt}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                            <span className="grade-cefr" style={{ background: color }}>
                                <Icon n={passed ? "check" : "x-circle"} sm style={{ marginRight: 7 }} />
                                {passed ? t.passedTitle : t.failedTitle}
                            </span>
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
