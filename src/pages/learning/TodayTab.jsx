// Вкладка «Сегодня» раздела «Учёба».
// Рендерит ТОЛЬКО контент-область (под шапкой/сегмент-навигацией страницы).
// Данные — только через api.learning* / api.placement*. i18n — локальные константы.
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { BtnSpinner, BrandLoader } from "../../components/ui/Spinner.jsx";
import { StatusDot, statusLabel, STATUS_ORDER } from "../../components/learning/StatusBits.jsx";
import { LeaderboardCard, LeaderboardModal } from "../../components/learning/Leaderboard.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { pl } from "../../components/ui/plural.js";
import { T } from "./TodayTab.i18n.js";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];


function fmt(s, vars) {
    return Object.keys(vars || {}).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k]), s);
}

export default function TodayTab({ lang, go, openSession, openPlacement, reloadKey, refresh }) {
    const t = T[lang] || T.ru;

    const [stats, setStats] = useState(null);
    const [gate, setGate] = useState(null);   // {pack, threshold, open} — ворота экзамена пачки
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lbOpen, setLbOpen] = useState(false);   // открыта модалка полного рейтинга

    const [focusSaving, setFocusSaving] = useState(false);
    const focusTopicsSel = useAuthStore((s) => s.user?.focusTopics);
    const autoFillTried = useRef(false);       // авто-добор пустой учёбы — один раз за монтирование
    const sessionLoading = useSessionStore((s) => s.loading); // следующая сессия ещё грузится фоном

    useEffect(() => {
        let on = true;
        setLoading(true);
        setError(false);
        api.learningGate().then((g) => { if (on) setGate(g || null); }).catch(() => { if (on) setGate(null); });
        api.learningStats()
            .then((s) => { if (on) { setStats(s || null); setLoading(false); } })
            .catch(() => { if (on) { setError(true); setLoading(false); } });
        return () => { on = false; };
    }, [reloadKey]);

    // Ворота экзамена пачки: open → можно/нужно сдавать экзамен (новые слова заблокированы).
    const gateOpen = !!gate?.open;
    const gatePack = gate?.pack || 0;
    const gateThreshold = gate?.threshold || 0;
    const gateLeft = Math.max(0, gateThreshold - gatePack);

    const by = stats?.byStatus || {};
    const total = stats?.total || 0;
    const placed = stats?.placed;

    // ЧЕСТНЫЙ состав: берём из реально собранной (префетч) следующей сессии — ровно то, что увидит
    // пользователь (новых не больше NEW_PER_SESSION). Пока сессия не прогрелась — оценка из stats.
    const sess = useSessionStore((s) => s.next);
    const sessComp = (sess?.composition && sess.composition.total > 0) ? sess.composition : null;
    const composition = useMemo(() => sessComp ? {
        review: sessComp.review || 0,
        progress: sessComp.progress || 0,
        weak: sessComp.weak || 0,
        fresh: sessComp.fresh || 0,
    } : {
        review: by.repeat || 0,        // Повторение (выучено + подошёл срок)
        progress: by.in_progress || 0, // В процессе (начато, ещё не выучено)
        weak: by.weak || 0,            // Слабые
        fresh: by.new || 0,            // Новые
    }, [sessComp, by.repeat, by.in_progress, by.weak, by.new]);
    // Сколько реально будет в следующей сессии (для крупной цифры на кнопке). До прогрева — оценка из stats.
    const learnable = sessComp ? sessComp.total
        : (by.repeat || 0) + (by.in_progress || 0) + (by.weak || 0) + (by.new || 0);

    // Авто-добор: у юзера ВООБЩЕ нет слов в учёбе (total=0) и ворота не закрыты — система сама
    // подсыпает новые из Базы (сборка сессии на бэке делает suggest_words). Один раз за монтирование,
    // чтобы не зациклиться, если кандидатов нет. «Закончил на сегодня» (learnable=0, total>0) не трогаем.
    useEffect(() => {
        if (loading || !stats || autoFillTried.current) return;
        if (total === 0 && !gateOpen) {
            autoFillTried.current = true;
            api.learningSession(20)
                .then((r) => { if ((r?.words || []).length) refresh(); })
                .catch(() => { });
        }
    }, [loading, stats, total, gateOpen, refresh]);

    const streak = stats?.streak || 0;

    // Главный CTA — системная сессия: режим/состав выбирает система (openSession без слов).
    const runReview = () => openSession();

    if (loading) return <BrandLoader />;
    if (error || !stats) {
        return (
            <div className="spanel"><div className="empty">
                <span className="empty__ic" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                    <Icon n="alert" />
                </span>
                <div className="empty__t">{t.err}</div>
                <div className="empty__actions">
                    <button className="btn btn--outline btn--lg" onClick={refresh}><Icon n="repeat" sm /> {t.startReview}</button>
                </div>
            </div></div>
        );
    }

    const isEmpty = total === 0 || learnable === 0;

    // Баннер ворот: экзамен пачки готов → CTA на вкладку «Экзамен».
    const gateBanner = gateOpen ? (
        <div className="spanel" style={{ background: "var(--ember-50)", borderColor: "color-mix(in srgb,var(--ember-600) 30%,var(--surface))", marginBottom: "var(--sp-5)" }}>
            <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                <span className="setrow-link__ic" style={{ background: "var(--ember-600)", color: "#fff", flex: "none" }}>
                    <Icon n="award" />
                </span>
                <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{t.gateOpenT}</div>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{t.gateOpenD}</div>
                </div>
                <button className="btn btn--accent" onClick={() => go("exam")}>
                    <Icon n="play" sm /> {t.gateOpenBtn}
                </button>
            </div>
        </div>
    ) : (gatePack > 0 && gateThreshold > 0) ? (
        <div className="spanel" style={{ marginBottom: "var(--sp-5)" }}>
            <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                <span className="setrow-link__ic" style={{ background: "color-mix(in srgb,var(--ember-600) 15%,var(--surface))", color: "var(--ember-600)", flex: "none" }}>
                    <Icon n="award" />
                </span>
                <div className="col" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: "var(--sp-2)" }}>
                        <span style={{ fontSize: "var(--fs-14)", fontWeight: 700 }}>{fmt(t.gateProgress, { n: gateLeft })}</span>
                        <span className="muted-3" style={{ fontSize: "var(--fs-13)", fontWeight: 700, flex: "none" }}>{gatePack}/{gateThreshold}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, background: "var(--ember-600)", width: `${Math.min(100, Math.round((gatePack / gateThreshold) * 100))}%` }} />
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // Прогресс до следующего уровня CEFR: кольцо наполняется по текущему уровню рампы,
    // подпись — следующий уровень (напр. «До уровня B1»). Данные из learning_stats.
    const curLevel = stats?.currentLevel || "A1";
    const nextLevel = CEFR[CEFR.indexOf(curLevel) + 1] || null;
    // Прогресс к след. уровню — по ВСЕМУ активному словарю (выучено+повтор+архив) против суммарного
    // порога след. уровня (LEVEL_TARGETS кумулятивны), а не по словам одного CEFR-тега (иначе кольцо
    // переполнялось: «553/500» и «осталось 0», хотя до уровня ещё далеко).
    const masteredAll = (by.mastered || 0) + (by.repeat || 0) + (by.archived || 0);
    const nextTarget = nextLevel ? (stats?.byLevel?.[nextLevel]?.target || 0) : 0;
    const toNext = nextLevel ? Math.max(0, nextTarget - masteredAll) : 0;
    const masteryFrac = (nextLevel && nextTarget) ? Math.min(1, masteredAll / nextTarget) : 1;
    const ringNum = masteredAll;
    const ringDen = nextLevel ? nextTarget : masteredAll;

    // Фокус на темах: ~треть новых слов будет из выбранных тем (бэк-смещение в suggest_words).
    const focusTopics = focusTopicsSel || [];
    const topicLabels = (interfaceTranslate[lang] || interfaceTranslate.ru).topics || {};
    const toggleFocus = async (key) => {
        if (focusSaving) return;
        const next = focusTopics.includes(key) ? focusTopics.filter((x) => x !== key) : [...focusTopics, key];
        setFocusSaving(true);
        useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, focusTopics: next } : s.user }));  // оптимистично
        try { await api.setFocusTopics(next); } catch { /* /me перечитает позже */ }
        setFocusSaving(false);
    };
    const focusPanel = (
        <div className="spanel">
            <div className="spanel__head"><span className="spanel__title">{t.focusTitle}</span></div>
            <div className="spanel__body">
                <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45, marginBottom: "var(--sp-3)" }}>{t.focusDesc}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.keys(topicLabels).map((k) => {
                        const on = focusTopics.includes(k);
                        return (
                            <button key={k} type="button" onClick={() => toggleFocus(k)} disabled={focusSaving}
                                style={{
                                    padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                                    fontSize: "var(--fs-13)", fontWeight: 600,
                                    border: on ? "1px solid var(--fjord-600)" : "1px solid var(--border)",
                                    background: on ? "var(--fjord-600)" : "var(--surface)",
                                    color: on ? "#fff" : "var(--ink-2)",
                                }}>
                                {topicLabels[k]}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
    const goalPanel = (
        <div className="spanel">
            <div className="spanel__head">
                <span className="spanel__title">{t.progressTitle}</span>
                <span className="streak-pill"><Icon n="flame" sm /> {streak} {t.days}</span>
            </div>
            <div className="spanel__body">
                <div className="goal-row">
                    <div className="ring" style={{ "--p": Math.round(masteryFrac * 100) }}>
                        <svg className="ring__svg" viewBox="0 0 120 120">
                            <circle className="ring__bg" cx="60" cy="60" r="52" />
                            <circle className="ring__fg" cx="60" cy="60" r="52"
                                strokeDasharray="326.7"
                                strokeDashoffset={(326.7 * (1 - masteryFrac)).toFixed(1)}
                                style={{ stroke: "var(--st-master)" }} />
                        </svg>
                        <span className="ring__label">
                            <span className="ring__num" style={{ color: "var(--st-master)" }}>{ringNum}</span>
                            <span className="ring__den">{fmt(t.goalNum, { n: ringDen })}</span>
                        </span>
                    </div>
                    <div className="col" style={{ gap: 10 }}>
                        <div style={{ fontSize: "var(--fs-15)", fontWeight: 700 }}>
                            {nextLevel ? `${t.toLevel} ${nextLevel}` : t.maxLevelT}
                        </div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>
                            {nextLevel ? fmt(t.toLevelLeft, { n: toNext }) : t.maxLevelD}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {placed === false && (
                <div className="spanel" style={{ background: "var(--fjord-50)", borderColor: "color-mix(in srgb,var(--fjord-600) 30%,var(--surface))", marginBottom: "var(--sp-5)" }}>
                    <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                        <span className="setrow-link__ic" style={{ background: "var(--fjord-600)", color: "#fff", flex: "none" }}>
                            <Icon n="target" />
                        </span>
                        <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>{t.placeT}</div>
                            <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>{t.placeD}</div>
                        </div>
                        <button className="btn btn--primary" onClick={openPlacement}>
                            <Icon n="play" sm /> {t.placeBtn}
                        </button>
                    </div>
                </div>
            )}

            {gateBanner}

            <div className="today-grid">
                {/* LEFT */}
                <div className="col" style={{ gap: "var(--sp-5)" }}>
                    {isEmpty ? (
                        <>
                            <div className="spanel">
                                <div className="empty">
                                    <span className="empty__ic"><Icon n="check-circle" /></span>
                                    <div className="empty__t">{t.emptyT}</div>
                                    <div className="empty__d">{t.emptyD}</div>
                                    <div className="empty__actions">
                                        {!gateOpen && (
                                            <button className="btn btn--accent btn--lg" onClick={runReview} disabled={sessionLoading}>
                                                {sessionLoading ? <BtnSpinner /> : <Icon n="play" sm />} {t.emptyMore}
                                            </button>
                                        )}
                                        {/* экзамен — только когда ворота открыты (пачка готова к переходу); иначе сдавать нечего */}
                                        {gateOpen && (
                                            <button className="btn btn--accent btn--lg" onClick={() => go("exam")}>
                                                <Icon n="award" sm /> {t.emptyExam}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Hero */}
                            <div className="review-cta">
                                <span className="review-cta__halo" /><span className="review-cta__halo2" />
                                <span className="review-cta__eyebrow"><Icon n="repeat" sm /> {t.smartReview}</span>
                                <div className="review-cta__big"><b>{learnable} {pl(lang, learnable, "word")}</b> {t.readyB.split("\n").map((l, i) => <span key={i}>{i ? <br /> : null}{l}</span>)}</div>
                                <div className="review-cta__chips">
                                    {composition.review > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-review)" }} />{composition.review} {t.chReview}</span>}
                                    {composition.progress > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-learn)" }} />{composition.progress} {pl(lang, composition.progress, "started")}</span>}
                                    {composition.weak > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-weak)" }} />{composition.weak} {pl(lang, composition.weak, "weak")}</span>}
                                    {composition.fresh > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-new)" }} />{composition.fresh} {pl(lang, composition.fresh, "fresh")}</span>}
                                </div>
                                {composition.fresh > 0 && (
                                    <div className="review-cta__note"><Icon n="info" sm /> {t.portionNote}</div>
                                )}
                                <button className="review-cta__btn" onClick={runReview} disabled={sessionLoading}>
                                    {sessionLoading ? <BtnSpinner /> : <Icon n="play" />} {t.startReview}
                                </button>
                            </div>
                        </>
                    )}
                    {/* Темы в фокусе — под Smart Review (на месте бывших «наборов для практики») */}
                    {focusPanel}
                </div>

                {/* RIGHT */}
                <div className="col" style={{ gap: "var(--sp-5)" }}>
                    {goalPanel}

                    {/* Рейтинг недели — компактная карточка, тап открывает полный список */}
                    <LeaderboardCard lang={lang} onOpen={() => setLbOpen(true)} />

                    {/* Status snapshot */}
                    <div className="spanel">
                        <div className="spanel__head">
                            <span className="spanel__title">{t.snapshot}</span>
                            <button className="row" onClick={() => go("progress")}
                                style={{ gap: 5, fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--fjord-600)", background: "none", border: "none", cursor: "pointer" }}>
                                {t.toProgress} <Icon n="arrow-right" sm />
                            </button>
                        </div>
                        <div className="spanel__body" style={{ paddingTop: "var(--sp-2)", display: "flex", flexDirection: "column", gap: 2 }}>
                            {STATUS_ORDER.filter((s) => s !== "archived").map((s) => (
                                <button key={s} className="setrow-link" onClick={() => go("words")}
                                    style={{ padding: "11px var(--sp-1)", background: "none", border: "none", textAlign: "left", width: "100%", cursor: "pointer" }}>
                                    <StatusDot status={s} />
                                    <span className="setrow-link__meta">
                                        <span style={{ fontWeight: 600, fontSize: "var(--fs-14)" }}>{statusLabel(s, lang)}</span>
                                    </span>
                                    <span className="setrow-link__n" style={{ fontSize: "var(--fs-16)" }}>{by[s] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {lbOpen && <LeaderboardModal lang={lang} onClose={() => setLbOpen(false)} />}
        </>
    );
}

