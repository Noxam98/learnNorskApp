// Вкладка «Сегодня» раздела «Учёба».
// Рендерит ТОЛЬКО контент-область (под шапкой/сегмент-навигацией страницы).
// Данные/логика — в контроллере useToday; здесь только разметка дашборда.
import { useState } from "react";
import { Icon } from "../../components/ui/Icon.jsx";
import SessionSettings from "../../components/learning/SessionSettings.jsx";
import { BtnSpinner, BrandLoader } from "../../components/ui/Spinner.jsx";
import { StatusDot, statusLabel, STATUS_ORDER } from "../../components/learning/StatusBits.jsx";
import { LeaderboardCard, LeaderboardModal } from "../../components/learning/Leaderboard.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { pl } from "../../components/ui/plural.js";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { T } from "./TodayTab.i18n.js";
import { useToday } from "./useToday.js";

function fmt(s, vars) {
    return Object.keys(vars || {}).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k]), s);
}

export default function TodayTab({ lang, go, openSession, openPlacement, reloadKey, refresh }) {
    const t = T[lang] || T.ru;
    // Порция новых за сессию (gamePrefs.newPerSession, дефолт 6) — тот же источник, что слайдер
    // в профиле: подпись «до N за сессию» должна показывать РЕАЛЬНЫЙ потолок, а не хардкод.
    const newPerSession = useAuthStore((s) => s.user?.gamePrefs?.newPerSession) || 6;
    // Вся логика дашборда (статистика/ворота/состав/уровень/фокус) — в контроллере useToday.
    const {
        stats, loading, error, lbOpen, setLbOpen, focusSaving, sessionLoading,
        gateOpen, gatePack, gateThreshold, gateLeft, by, placed,
        composition, learnable, streak, isEmpty, sessReady,
        listenShow, listenReady, listenPending, listenLeft, runListen,
        nextLevel, toNext, masteryFrac, ringNum, ringDen,
        focusTopics, toggleFocus, runReview,
    } = useToday({ reloadKey, refresh, openSession });
    const [settingsOpen, setSettingsOpen] = useState(false);   // попап настроек учёбы (шестерёнка)

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
    const topicLabels = (interfaceTranslate[lang] || interfaceTranslate.ru).topics || {};

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

    // Карточка слуховой сессии: видна, когда аудио вкл и есть слова в ожидании слуха. Готова партия
    // (listenReady) → яркий призыв «N слов готовы к слуху»; иначе — приглушённо «ещё M до партии».
    const listenCard = listenShow ? (
        <div className="spanel" style={listenReady ? {
            background: "var(--fjord-50)", borderColor: "color-mix(in srgb,var(--fjord-600) 30%,var(--surface))",
        } : undefined}>
            <div className="spanel__body" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                <span className="setrow-link__ic" style={{
                    background: listenReady ? "var(--fjord-600)" : "color-mix(in srgb,var(--fjord-600) 15%,var(--surface))",
                    color: listenReady ? "#fff" : "var(--fjord-600)", flex: "none",
                }}>
                    <Icon n="headphones" />
                </span>
                <div className="col" style={{ gap: 3, flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "var(--ls-tight)" }}>🔊 {t.listenCardT}</div>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", lineHeight: 1.45 }}>
                        {listenReady
                            ? fmt(t.listenReadyD, { n: listenPending })
                            : fmt(t.listenWaitD, { n: listenPending, m: listenLeft })}
                    </div>
                </div>
                <button className={listenReady ? "btn btn--accent" : "btn btn--outline"} onClick={runListen}>
                    <Icon n="play" sm /> {t.listenBtn}
                </button>
            </div>
        </div>
    ) : null;

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
                                {/* шестерёнка: настройки учёбы прямо отсюда (порция новых/аудио/формы) */}
                                <button type="button" className="review-cta__gear" onClick={() => setSettingsOpen(true)} aria-label="settings">
                                    <Icon n="settings" sm />
                                </button>
                                <span className="review-cta__eyebrow"><Icon n="repeat" sm /> {t.smartReview}</span>
                                {/* Состав показываем ТОЛЬКО когда реальная сессия прогрелась (sessReady);
                                    до этого — плейсхолдер «готовим сессию», без оценочных счётчиков из пула. */}
                                {sessReady ? (
                                    <>
                                        <div className="review-cta__big"><b>{learnable} {pl(lang, learnable, "word")}</b> {t.readyB.split("\n").map((l, i) => <span key={i}>{i ? <br /> : null}{l}</span>)}</div>
                                        <div className="review-cta__chips">
                                            {/* фаза форм цикла «слова↔формы»: партия выучена — сессия дрилит её формы */}
                                            {composition.phase === "forms" && <span className="review-cta__chip review-cta__chip--forms"><Icon n="graduation" sm />{t.chFormsPhase}{composition.formsCellsLeft > 0 ? ` · ${composition.formsCellsLeft}` : ""}</span>}
                                            {composition.review > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-review)" }} />{composition.review} {t.chReview}</span>}
                                            {composition.progress > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-learn)" }} />{composition.progress} {pl(lang, composition.progress, "started")}</span>}
                                            {composition.weak > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-weak)" }} />{composition.weak} {pl(lang, composition.weak, "weak")}</span>}
                                            {composition.fresh > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-new)" }} />{composition.fresh} {pl(lang, composition.fresh, "fresh")}</span>}
                                            {composition.phrases > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-phrase, #8b7cf6)" }} />{composition.phrases} {pl(lang, composition.phrases, "phrase")}</span>}
                                            {composition.grammar > 0 && <span className="review-cta__chip"><span className="dot" style={{ background: "var(--st-master, #3C7A4E)" }} />{composition.grammar} {pl(lang, composition.grammar, "grammar")}</span>}
                                        </div>
                                        {composition.phase === "forms" ? (
                                            <div className="review-cta__note"><Icon n="graduation" sm /> {t.formsDesc}{composition.formsCellsLeft > 0 ? ` ${fmt(t.formsLeftLine, { n: composition.formsCellsLeft })}` : ""}</div>
                                        ) : composition.fresh > 0 && (
                                            <div className="review-cta__note"><Icon n="info" sm /> {fmt(t.portionNote, { n: newPerSession })}</div>
                                        )}
                                    </>
                                ) : (
                                    <div className="review-cta__big review-cta__big--loading"><BtnSpinner /> {t.preparing}</div>
                                )}
                                <button className="review-cta__btn" onClick={runReview} disabled={sessionLoading}>
                                    {sessionLoading ? <BtnSpinner /> : <Icon n="play" />} {t.startReview}
                                </button>
                            </div>
                        </>
                    )}
                    {/* Слуховая сессия: аудио-подтверждение выученных слов отдельной партией */}
                    {listenCard}
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

            <SessionSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} lang={lang} />
            {lbOpen && <LeaderboardModal lang={lang} onClose={() => setLbOpen(false)} />}
        </>
    );
}

