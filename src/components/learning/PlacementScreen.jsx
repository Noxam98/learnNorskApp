// Вводный тест (placement) «Учёбы»: intro (3 пути) → play (адаптивный квиз) → result.
// Калибрует уровень CEFR. Самооценка и «калибровать в фоне» — альтернативы тесту.
// Обёрнут в .study-root, чтобы работали scoped-стили .plc-*/.ladder/.lvl-chip/.conf.
import { Icon } from "../ui/Icon.jsx";
import { ChoiceQuestion } from "../gameComponents/ChoiceQuestion.jsx";
import { InputQuestion } from "../gameComponents/InputQuestion.jsx";
import { hyLang } from "../ui/hyphenate.js";
import { ENDONYM } from "../../interface/languages.js";
import { T } from "./PlacementScreen.i18n.js";
import { langGuard } from "../../interface/i18nGuard.js";
import { usePlacement, LEVELS } from "./usePlacement.js";

// Локальная i18n сбоя грейда: при сетевой ошибке НЕ фабрикуем уровень, а показываем «повторить».
// Держим здесь (а не в PlacementScreen.i18n.js), чтобы не расширять общий словарь — 7 языков.
const ERR_T = langGuard({
    ru:  { errTitle: "Не удалось сохранить результат", errDesc: "Проверь соединение и попробуй ещё раз — твои ответы сохранены.", retry: "Повторить" },
    en:  { errTitle: "Couldn't save your result", errDesc: "Check your connection and try again — your answers are saved.", retry: "Retry" },
    ukr: { errTitle: "Не вдалося зберегти результат", errDesc: "Перевір з'єднання і спробуй ще раз — твої відповіді збережено.", retry: "Повторити" },
    pl:  { errTitle: "Nie udało się zapisać wyniku", errDesc: "Sprawdź połączenie i spróbuj ponownie — twoje odpowiedzi są zapisane.", retry: "Ponów" },
    lt:  { errTitle: "Nepavyko išsaugoti rezultato", errDesc: "Patikrink ryšį ir bandyk dar kartą — tavo atsakymai išsaugoti.", retry: "Kartoti" },
    lv:  { errTitle: "Neizdevās saglabāt rezultātu", errDesc: "Pārbaudi savienojumu un mēģini vēlreiz — tavas atbildes ir saglabātas.", retry: "Atkārtot" },
    ar:  { errTitle: "تعذّر حفظ نتيجتك", errDesc: "تحقّق من الاتصال وحاول مرة أخرى — إجاباتك محفوظة.", retry: "إعادة المحاولة" },
}, "PlacementScreen.ERR_T");

export default function PlacementScreen({ lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const et = ERR_T[lang] || ERR_T.ru;
    // Вся логика теста (фазы, вопросы, грейд, самооценка) — в контроллере usePlacement.
    const { phase, selfOpen, setSelfOpen, selfLevel, setSelfLevel, questions, qi, result, busy, gradeErr, locked,
        cur, levelsInTest, beginTest, answer, retryGrade, saveSelf } = usePlacement(lang, onClose);

    // ====== INTRO ======
    if (phase === "intro") {
        return (
            <div className="study-root" style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "auto", background: "var(--canvas)" }}>
                <main className="shell study-main">
                    <div className="plc-wrap">
                        <div className="plc-hero">
                            <span className="plc-hero__halo" /><span className="plc-hero__halo2" />
                            <span className="plc-hero__eyebrow"><Icon n="graduation" sm /> {t.eyebrow}</span>
                            <div className="plc-hero__title">{t.title1}<br />{t.title2}</div>
                            <p className="plc-hero__desc">{t.desc}</p>
                            <div className="plc-detect">
                                <div className="plc-detect__c"><Icon n="target" /><span className="plc-detect__t">{t.d1t}</span><span className="plc-detect__d">{t.d1d}</span></div>
                                <div className="plc-detect__c"><Icon n="repeat" /><span className="plc-detect__t">{t.d2t}</span><span className="plc-detect__d">{t.d2d}</span></div>
                                <div className="plc-detect__c"><Icon n="sparkles" /><span className="plc-detect__t">{t.d3t}</span><span className="plc-detect__d">{t.d3d}</span></div>
                            </div>
                            <div className="plc-actions">
                                <button className="plc-hero__btn" onClick={beginTest} disabled={busy}><Icon n="play" /> {t.start}</button>
                                <div className="plc-hero__alt">
                                    <button className="plc-hero__ghost" onClick={() => setSelfOpen((v) => !v)}><Icon n="user" sm /> {t.self}</button>
                                    <button className="plc-hero__ghost" onClick={() => onClose?.(false)}><Icon n="clock" sm /> {t.skip}</button>
                                </div>
                            </div>
                        </div>

                        {selfOpen && (
                            <div className="plc-self">
                                <div className="card" style={{ padding: "var(--sp-5)" }}>
                                    <div className="flex-between" style={{ marginBottom: "var(--sp-4)" }}>
                                        <strong>{t.selfTitle}</strong>
                                        <span className="st-cold-note">{t.selfHint}</span>
                                    </div>
                                    <div className="plc-self__chips">
                                        {["A1", "A2", "B1", "B2", "C1"].map((lv) => (
                                            <button key={lv} className={"lvl-chip" + (selfLevel === lv ? " is-on" : "")} onClick={() => setSelfLevel(lv)}>
                                                <span className="lvl-chip__t">{lv}</span>
                                                <span className="lvl-chip__d">{t.lvlD[lv]}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn btn--primary btn--lg" style={{ marginTop: "var(--sp-5)" }} onClick={saveSelf} disabled={busy}>
                                        <Icon n="check" sm /> {t.save}
                                    </button>
                                </div>
                            </div>
                        )}

                        <p className="st-cold-note" style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>{t.footer}</p>
                    </div>
                </main>
            </div>
        );
    }

    // ====== PLAY ======
    if (phase === "play") {
        const pct = questions.length ? Math.round(((qi) / questions.length) * 100) : 0;
        const curIdx = LEVELS.indexOf(cur?.level);
        return (
            <div className="study-root">
                <div className="plc-stage">
                    <div className="plc-top">
                        <button className="plc-top__back" onClick={() => onClose?.(false)} aria-label="close"><Icon n="x" /></button>
                        <div className="plc-bar"><span style={{ width: `${pct}%` }} /></div>
                        <span className="plc-count">{qi + 1} / {questions.length}</span>
                    </div>
                    <div className="ladder">
                        {levelsInTest.map((lv) => {
                            const idx = LEVELS.indexOf(lv);
                            const klass = idx < curIdx ? " is-done" : idx === curIdx ? " is-now" : "";
                            return (
                                <div key={lv} className={"ladder__step" + klass}>
                                    <span className="ladder__bar" /><span className="ladder__lbl">{lv}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="plc-q">
                        {(cur?.type || "choice") === "input" ? (
                            <InputQuestion
                                prompt={cur?.prompt}
                                promptLang={hyLang(lang, false)}
                                lang={lang}
                                onSubmit={(text) => answer(text)}
                                disabled={busy || locked}
                                hint={<><Icon n="globe" sm /> {ENDONYM[lang] || lang}{t.dirIn}</>}
                            >
                                <button className="plc-skip" onClick={() => answer("")}><Icon n="arrow-right" sm /> {t.dontKnow}</button>
                            </InputQuestion>
                        ) : (
                            <ChoiceQuestion
                                prompt={cur?.no}
                                promptLang="no"
                                options={cur?.options || []}
                                reveal={false}
                                disabled={busy || locked}
                                onPick={(opt) => answer(opt)}
                                hint={<><Icon n="globe" sm /> {t.dir}{ENDONYM[lang] || lang}</>}
                            >
                                <button className="plc-skip" onClick={() => answer("")}><Icon n="arrow-right" sm /> {t.dontKnow}</button>
                            </ChoiceQuestion>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ====== RESULT: сетевой сбой грейда ======
    // Уровень НЕ определён (POST не прошёл) — не показываем фейковый «A1», даём повторить отправку.
    if (gradeErr) {
        return (
            <div className="study-root" style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "auto", background: "var(--canvas)" }}>
                <main className="shell study-main">
                    <div className="plc-wrap plc-result">
                        <div className="card" style={{ padding: "var(--sp-5)", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--sp-3)", color: "var(--game-incorrect, #e67a52)" }}>
                                <Icon n="x" lg />
                            </div>
                            <strong style={{ display: "block", marginBottom: "var(--sp-2)" }}>{et.errTitle}</strong>
                            <p className="muted" style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, margin: "0 0 var(--sp-5)" }}>{et.errDesc}</p>
                            <button className="btn btn--primary btn--lg btn--block" onClick={retryGrade} disabled={busy}>
                                <Icon n="repeat" sm /> {busy ? "…" : et.retry}
                            </button>
                            <button className="plc-hero__ghost" style={{ marginTop: "var(--sp-3)" }} onClick={() => onClose?.(false)}>
                                <Icon n="clock" sm /> {t.skip}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ====== RESULT ======
    const conf = result?.conf ?? 0;
    const confWord = conf >= 70 ? t.confHigh : conf >= 40 ? t.confMid : t.confLow;
    return (
        <div className="study-root" style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "auto", background: "var(--canvas)" }}>
            <main className="shell study-main">
                <div className="plc-wrap plc-result">
                    <div className="plc-rhero">
                        <div className="plc-cefr"><div style={{ textAlign: "center" }}>
                            <div className="plc-cefr__lvl">{busy ? "…" : (result?.level || "A1")}</div>
                            <div className="plc-cefr__sub">{t.yourLevel}</div>
                        </div></div>
                        <div className="plc-rhero__txt">
                            <span className="eyebrow" style={{ color: "var(--fjord-600)" }}><Icon n="check-circle" sm /> {t.passed}</span>
                            <div className="plc-rhero__title">{t.resTitle}</div>
                            <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>{t.resDesc}</p>
                            <div className="conf">
                                <div className="conf__track"><span className="conf__fill" style={{ width: `${Math.max(8, conf)}%` }} /></div>
                                <span className="conf__lbl">{t.confLbl}: {confWord}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: "var(--sp-5)" }}>
                        <div className="flex-between" style={{ marginBottom: "var(--sp-3)" }}>
                            <strong style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon n="repeat" sm /> {t.howAsk}</strong>
                            <span className="sbadge sbadge--review"><Icon n="sparkles" sm /> {t.auto}</span>
                        </div>
                        <p className="muted" style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, margin: 0 }}>{t.dirExplain}</p>
                    </div>

                    <button className="btn btn--primary btn--lg btn--block" onClick={() => onClose?.(true)} disabled={busy}>
                        <Icon n="play" sm /> {t.begin}
                    </button>
                </div>
            </main>
        </div>
    );
}
