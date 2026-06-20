// Сессия «Учёбы» = переиспользует компоненты игр (Выбор/Ввод/Карточки) на ПЕРЕДАННОМ
// наборе слов. Один режим на сессию. Каждый ответ кормит SRS (/learning/answer с pool_id+mode).
// По завершении показываем свой итог «что дальше»: результат + серия + сколько осталось +
// «ещё сессия» / «в Учёбу». Карточки (study) — пассивные, в SRS не пишут.
import { useMemo, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import api from "../tools/api.js";
import ChoiceGame from "../gameComponents/ChoiceGame.jsx";
import InputGame from "../gameComponents/InputGame.jsx";
import StudyGame from "../gameComponents/StudyGame.jsx";

const COMP = { choice: ChoiceGame, input: InputGame, study: StudyGame };

// Направление перевода в «Учёбе». Обсуждаемо: пока единое на сессию (родной → норвежский).
const STUDY_DIR = "int2no";

const T = {
    ru: { done: "Сессия завершена", acc: "верно", streak: "серия", days: "дн.", left: "ещё на сегодня", leftZero: "На сегодня всё — возвращайся завтра", more: "Ещё сессия", finish: "В Учёбу", words: "слов" },
    en: { done: "Session complete", acc: "correct", streak: "streak", days: "d.", left: "left for today", leftZero: "All done for today — come back tomorrow", more: "One more", finish: "To Study", words: "words" },
    ukr: { done: "Сесію завершено", acc: "правильно", streak: "серія", days: "дн.", left: "ще на сьогодні", leftZero: "На сьогодні все — повертайся завтра", more: "Ще сесія", finish: "До Навчання", words: "слів" },
    pl: { done: "Sesja zakończona", acc: "poprawnie", streak: "seria", days: "dn.", left: "na dziś", leftZero: "Na dziś koniec — wróć jutro", more: "Jeszcze raz", finish: "Do Nauki", words: "słów" },
    lt: { done: "Sesija baigta", acc: "teisingai", streak: "serija", days: "d.", left: "šiandienai", leftZero: "Šiandienai viskas — grįžk rytoj", more: "Dar viena", finish: "Į Mokymąsi", words: "žodžių" },
};

const STAGE = { position: "fixed", inset: 0, zIndex: 95, background: "var(--game-bg)", color: "var(--game-ink)", display: "flex", flexDirection: "column", overflow: "auto" };

// привести слова «Учёбы» к форме, понятной играм: id = pool_id; translate.no — гарантированно есть
const toGameWords = (list, lang) => (list || [])
    .filter((w) => w && (w.pool_id ?? w.id) != null)
    .map((w) => ({
        ...w, id: w.pool_id ?? w.id, pool_id: w.pool_id ?? w.id,
        translate: { ...(w.translate || {}), no: w.translate?.no?.length ? w.translate.no : [w.no].filter(Boolean) },
    }));

export default function LearningSession({ words = [], mode = "choice", lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const soundOn = useSystemStore((s) => s.soundOn);
    const Game = COMP[mode] || ChoiceGame;

    const [phase, setPhase] = useState("play");     // play | summary
    const [round, setRound] = useState(0);          // ключ для перезапуска игры новым набором
    const [gw, setGw] = useState(() => toGameWords(words, lang));
    const [res, setRes] = useState({ correct: 0, total: 0 });
    const [after, setAfter] = useState(null);       // свежая статистика после сессии
    const [busy, setBusy] = useState(false);

    const onResult = (w, ok) => {
        api.learningAnswer({ pool_id: w.pool_id ?? w.id, correct: ok, mode }).catch(() => { /* офлайн — не критично */ });
    };
    const onFinish = async (stats) => {
        setRes(stats || { correct: 0, total: 0 });
        setPhase("summary");
        try { setAfter(await api.learningStats()); } catch { /* */ }
    };

    const again = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const r = await api.learningDue(20).catch(() => null);
            const next = toGameWords(r?.words || [], lang);
            if (next.length) { setGw(next); setRes({ correct: 0, total: 0 }); setAfter(null); setRound((n) => n + 1); setPhase("play"); }
            else { setAfter((a) => ({ ...(a || {}), _empty: true })); }
        } finally { setBusy(false); }
    };

    if (!gw.length) { onClose?.(); return null; }

    if (phase === "summary") {
        const acc = res.total ? Math.round((res.correct / res.total) * 100) : 0;
        const due = after?.due ?? 0;
        const left = due + (after?.byStatus?.new || 0) + (after?.byStatus?.weak || 0);
        const streak = after?.streak || 0;
        const noneLeft = left <= 0 || after?._empty;
        return (
            <div style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460, width: "100%" }}>
                    <div className="session-orb session-orb--ok" style={{ margin: "0 auto" }} />
                    <h1 style={{ fontSize: "var(--fs-28)", margin: "var(--sp-4) 0 var(--sp-2)" }}>{t.done}</h1>
                    <div style={{ fontSize: "var(--fs-44)", fontWeight: 800 }}>{acc}%</div>
                    <p style={{ opacity: .8, marginTop: 4 }}>{res.correct} / {res.total} {t.acc}</p>

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "var(--sp-5) 0" }}>
                        <span style={chip}><Icon n="flame" sm /> {streak} {t.days} · {t.streak}</span>
                        {!noneLeft && <span style={chip}><Icon n="repeat" sm /> {left} {t.left}</span>}
                    </div>

                    {noneLeft
                        ? <p style={{ opacity: .8, marginBottom: "var(--sp-4)" }}>{t.leftZero}</p>
                        : <button className="btn btn--accent btn--lg btn--block" onClick={again} disabled={busy}>
                            <Icon n="play" sm /> {t.more}
                        </button>}
                    <button className="btn btn--ghost btn--block" style={{ marginTop: 8, color: "var(--game-ink)", borderColor: "var(--game-border)" }} onClick={() => onClose?.(true)}>
                        {t.finish}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Game
            key={round}
            words={gw}
            mode={STUDY_DIR}
            sound={soundOn}
            onResult={mode === "study" ? undefined : onResult}
            onFinish={onFinish}
            onExit={() => onClose?.(true)}
            setGameState={() => onClose?.(true)}
        />
    );
}

const chip = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999, border: "1px solid var(--game-border)", background: "var(--game-surface)", fontWeight: 700, fontSize: "var(--fs-14)" };
