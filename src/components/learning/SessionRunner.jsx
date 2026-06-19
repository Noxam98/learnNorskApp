// Единый паттерн практики «Учёбы»: старт → игра → итоги → возврат.
// Работает на ПЕРЕДАННОМ наборе слов и шлёт каждый ответ в SRS (/learning/answer с mode).
// Режимы: choice (выбор), input (ввод), study (карточки), listen (аудирование).
// Тёмный фокус-режим (классы .session-* из study.css + общий .play* для вопроса).
import { useEffect, useMemo, useRef, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { speakText, prefetchTts } from "../ui/tts.js";
import { playSound, playWin } from "../tools/sound.js";
import api from "../tools/api.js";

const ENDONYM = { ru: "русский", ukr: "українську", en: "English", pl: "polski", lt: "lietuvių" };
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

const MODES = {
    ru:  { choice: "Выбор", input: "Ввод", study: "Карточки", listen: "Аудио" },
    en:  { choice: "Choice", input: "Typing", study: "Cards", listen: "Listening" },
    ukr: { choice: "Вибір", input: "Введення", study: "Картки", listen: "Аудіо" },
    pl:  { choice: "Wybór", input: "Wpisywanie", study: "Fiszki", listen: "Słuchanie" },
    lt:  { choice: "Pasirinkimas", input: "Įvedimas", kortelės: "Kortelės", listen: "Klausymas" },
};
const T = {
    ru:  { start: "Начать сессию", cancel: "Отмена", session: "Сессия повторения", words: "слов", reveal: "Показать", next: "Дальше", check: "Ответить", know: "Знал", dontKnow: "Не знал", done: "Сессия завершена", acc: "Точность", back: "Вернуться в Учёбу", again: "Ещё сессия", chooseMode: "Режим" },
    en:  { start: "Start session", cancel: "Cancel", session: "Review session", words: "words", reveal: "Reveal", next: "Next", check: "Answer", know: "Knew it", dontKnow: "Didn't", done: "Session complete", acc: "Accuracy", back: "Back to Study", again: "One more", chooseMode: "Mode" },
    ukr: { start: "Почати сесію", cancel: "Скасувати", session: "Сесія повторення", words: "слів", reveal: "Показати", next: "Далі", check: "Відповісти", know: "Знав", dontKnow: "Не знав", done: "Сесію завершено", acc: "Точність", back: "До Учёби", again: "Ще сесія", chooseMode: "Режим" },
    pl:  { start: "Rozpocznij", cancel: "Anuluj", session: "Sesja powtórek", words: "słów", reveal: "Pokaż", next: "Dalej", check: "Odpowiedz", know: "Znałem", dontKnow: "Nie", done: "Sesja zakończona", acc: "Celność", back: "Do Nauki", again: "Jeszcze raz", chooseMode: "Tryb" },
    lt:  { start: "Pradėti", cancel: "Atšaukti", session: "Kartojimo sesija", words: "žodžių", reveal: "Rodyti", next: "Toliau", check: "Atsakyti", know: "Žinojau", dontKnow: "Ne", done: "Sesija baigta", acc: "Tikslumas", back: "Į Mokymąsi", again: "Dar viena", chooseMode: "Režimas" },
};

export default function SessionRunner({ words = [], mode = "choice", lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const ml = MODES[lang] || MODES.ru;
    const [m, setM] = useState(mode);
    const [phase, setPhase] = useState("start");   // start | play | results
    const set = useMemo(() => shuffle(words.filter((w) => w && w.pool_id)), [words]);
    const [i, setI] = useState(0);
    const [res, setRes] = useState({ correct: 0, total: 0 });
    const [val, setVal] = useState("");
    const [picked, setPicked] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const startedAt = useRef(0);
    const soundOn = useSystemStore.getState().soundOn;

    const cur = set[i] || null;
    const trArr = (cur?.translate?.[lang] || []).filter(Boolean);
    const primary = trArr[0] || "";

    useEffect(() => { if (phase === "play") { setVal(""); setPicked(null); setRevealed(false); startedAt.current = Date.now(); } }, [i, phase, m]);
    useEffect(() => {  // озвучка для listen и study
        if (phase !== "play" || !cur) return;
        if (m === "listen") speakText(cur.no).catch(() => {});
        else if (m === "study") prefetchTts(cur.no);
    }, [i, phase, m]); // eslint-disable-line

    const options = useMemo(() => {
        if (m !== "choice" || !cur) return [];
        const others = shuffle(set.filter((w) => w.pool_id !== cur.pool_id))
            .map((w) => (w.translate?.[lang] || [])[0]).filter(Boolean).filter((x) => x !== primary);
        return shuffle([primary, ...Array.from(new Set(others)).slice(0, 3)]);
    }, [i, m, set]); // eslint-disable-line

    const record = async (ok) => {
        const elapsed = (Date.now() - startedAt.current) / 1000;
        setRes((r) => ({ correct: r.correct + (ok ? 1 : 0), total: r.total + 1 }));
        playSound(ok ? "correct" : "wrong");
        try { await api.learningAnswer({ pool_id: cur.pool_id, correct: ok, elapsed, mode: m }); } catch { /* */ }
    };
    const advance = () => { if (i + 1 >= set.length) { setPhase("results"); playWin(); } else setI(i + 1); };

    const answerChoice = (opt) => { if (picked != null) return; setPicked(opt); record(norm(opt) === norm(primary)); setTimeout(advance, 700); };
    const submitInput = (e) => { e?.preventDefault(); if (picked != null) return; const ok = trArr.some((x) => norm(x) === norm(val)); setPicked(val || "—"); record(ok); setTimeout(advance, 800); };
    const studyMark = (ok) => { record(ok); advance(); };

    if (!set.length) { onClose?.(); return null; }

    const STAGE = { position: "fixed", inset: 0, zIndex: 95, background: "var(--game-bg)", color: "var(--game-ink)", display: "flex", flexDirection: "column", overflow: "auto" };
    const promptTo = ENDONYM[lang] || lang;

    // ---- старт ----
    if (phase === "start") {
        return (
            <div className="session-stage" style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460 }}>
                    <div className="session-orb" />
                    <h1 style={{ fontSize: "var(--fs-28)", margin: "var(--sp-4) 0 var(--sp-2)" }}>{t.session}</h1>
                    <p style={{ opacity: .8, marginTop: 0 }}>{set.length} {t.words}</p>
                    <div className="row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "var(--sp-4) 0" }}>
                        {["choice", "input", "study", "listen"].map((k) => (
                            <button key={k} className={`chip${m === k ? " is-on" : ""}`} onClick={() => setM(k)}
                                style={{ cursor: "pointer", border: "1px solid var(--game-border)", background: m === k ? "var(--game-accent)" : "transparent", color: m === k ? "var(--game-bg)" : "var(--game-ink)" }}>
                                {ml[k] || k}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn--accent btn--lg btn--block" onClick={() => { setI(0); setRes({ correct: 0, total: 0 }); setPhase("play"); }}>
                        <Icon n="play" sm /> {t.start}
                    </button>
                    <button className="btn btn--ghost btn--block" style={{ marginTop: 8, color: "var(--game-ink)" }} onClick={() => onClose?.()}>{t.cancel}</button>
                </div>
            </div>
        );
    }

    // ---- итоги ----
    if (phase === "results") {
        const acc = res.total ? Math.round((res.correct / res.total) * 100) : 0;
        return (
            <div className="session-stage" style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460 }}>
                    <div className="session-orb session-orb--ok" />
                    <h1 style={{ fontSize: "var(--fs-28)", margin: "var(--sp-4) 0" }}>{t.done}</h1>
                    <div style={{ fontSize: "var(--fs-44)", fontWeight: 800 }}>{acc}%</div>
                    <p style={{ opacity: .8 }}>{res.correct} / {res.total} · {t.acc}</p>
                    <button className="btn btn--accent btn--lg btn--block" style={{ marginTop: "var(--sp-4)" }} onClick={() => onClose?.(true)}>{t.back}</button>
                    <button className="btn btn--ghost btn--block" style={{ marginTop: 8, color: "var(--game-ink)" }} onClick={() => { setI(0); setRes({ correct: 0, total: 0 }); setPhase("play"); }}>{t.again}</button>
                </div>
            </div>
        );
    }

    // ---- игра ----
    return (
        <div className="session-stage" style={STAGE}>
            <div className="row between" style={{ padding: "var(--sp-4) var(--sp-5)" }}>
                <button className="iconbtn" onClick={() => onClose?.()} style={{ color: "var(--game-ink)" }}><Icon n="x" /></button>
                <span style={{ opacity: .8 }}>{i + 1} / {set.length}</span>
                <span style={{ width: 34 }} />
            </div>
            <div style={{ margin: "auto", width: "100%", maxWidth: 560, padding: "var(--sp-5)", textAlign: "center" }}>
                {m === "study" ? (
                    <>
                        <div style={{ fontSize: "var(--fs-44)", fontWeight: 800 }}>{cur.no}</div>
                        <button className="iconbtn" onClick={() => speakText(cur.no)} style={{ color: "var(--game-accent)", margin: "8px auto" }}><Icon n="volume" /></button>
                        <div style={{ minHeight: 32, fontSize: "var(--fs-20)", margin: "var(--sp-3) 0", opacity: revealed ? 1 : 0 }}>{primary}</div>
                        {!revealed ? (
                            <button className="btn btn--accent btn--lg btn--block" onClick={() => setRevealed(true)}>{t.reveal}</button>
                        ) : (
                            <div className="row" style={{ gap: 10 }}>
                                <button className="btn btn--block" style={{ background: "var(--game-incorrect)", color: "#fff" }} onClick={() => studyMark(false)}>{t.dontKnow}</button>
                                <button className="btn btn--block" style={{ background: "var(--game-correct)", color: "#fff" }} onClick={() => studyMark(true)}>{t.know}</button>
                            </div>
                        )}
                    </>
                ) : m === "listen" ? (
                    <>
                        <button className="iconbtn" onClick={() => speakText(cur.no)} style={{ color: "var(--game-accent)", transform: "scale(1.8)", margin: "var(--sp-5) auto" }}><Icon n="volume" /></button>
                        <form onSubmit={submitInput}>
                            <input className="input" autoFocus value={val} disabled={picked != null} placeholder={`${t.check}…`}
                                onChange={(e) => setVal(e.target.value)} style={{ fontSize: "var(--fs-20)", textAlign: "center" }} />
                            {picked == null && <button className="btn btn--accent btn--lg btn--block" style={{ marginTop: 10 }} type="submit">{t.check}</button>}
                        </form>
                        {picked != null && <div style={{ marginTop: 12, color: "var(--game-correct)" }}>{primary}</div>}
                    </>
                ) : m === "input" ? (
                    <>
                        <div className="muted" style={{ color: "var(--game-ink-2)" }}>{t.check} · {promptTo}</div>
                        <div style={{ fontSize: "var(--fs-44)", fontWeight: 800, margin: "var(--sp-3) 0" }}>{cur.no}</div>
                        <form onSubmit={submitInput}>
                            <input className="input" autoFocus value={val} disabled={picked != null} placeholder={`${t.check}…`}
                                onChange={(e) => setVal(e.target.value)} style={{ fontSize: "var(--fs-20)", textAlign: "center" }} />
                            {picked == null && <button className="btn btn--accent btn--lg btn--block" style={{ marginTop: 10 }} type="submit">{t.check}</button>}
                        </form>
                        {picked != null && <div style={{ marginTop: 12, color: "var(--game-correct)" }}>{primary}</div>}
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: "var(--fs-44)", fontWeight: 800, margin: "0 0 var(--sp-5)" }}>{cur.no}</div>
                        <div style={{ display: "grid", gap: 10 }}>
                            {options.map((opt) => {
                                const reveal = picked != null;
                                const good = norm(opt) === norm(primary);
                                const bg = reveal ? (good ? "var(--game-correct)" : (opt === picked ? "var(--game-incorrect)" : "var(--game-surface)")) : "var(--game-surface)";
                                return (
                                    <button key={opt} disabled={reveal} onClick={() => answerChoice(opt)}
                                        style={{ padding: "16px", borderRadius: 14, border: "1px solid var(--game-border)", background: bg, color: reveal && (good || opt === picked) ? "#fff" : "var(--game-ink)", fontSize: "var(--fs-18)", fontWeight: 600, cursor: reveal ? "default" : "pointer" }}>
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
