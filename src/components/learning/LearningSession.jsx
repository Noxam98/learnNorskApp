// Сессия «Учёбы». Два режима монтирования:
//  • Системная (проп system или нет words): программу собирает бэк — api.learningSession(20).
//    Идём ПО ЭЛЕМЕНТАМ по очереди; для каждого монтируем игру по element.mode на одном слове.
//    Игрок НЕ выбирает режим/направление — это решает бэк (element.mode + element.direction).
//  • Легаси (передан words): прежнее поведение — один режим/направление на весь набор.
// Каждый ответ кормит SRS (/learning/answer с pool_id + mode + direction). Карточки (study) пассивны.
// По завершении показываем свой итог «что дальше»: точность + серия + сколько осталось +
// «ещё сессия» / «в Учёбу». Финиш отдельной игры подавляется через onFinish.
import { useEffect, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import ChoiceGame from "../gameComponents/ChoiceGame.jsx";
import InputGame from "../gameComponents/InputGame.jsx";
import StudyGame from "../gameComponents/StudyGame.jsx";
import BuildGame from "../gameComponents/BuildGame.jsx";

// mode элемента/сессии → игровой компонент.
const COMP = { choice: ChoiceGame, build: BuildGame, input: InputGame, card: StudyGame, study: StudyGame };

// Направление перевода для легаси-набора (единое на сессию: родной → норвежский).
const LEGACY_DIR = "int2no";

const T = {
    ru: { done: "Сессия завершена", acc: "верно", cardsShown: "карточек показано", masteredLabel: "Выучено", of: "из", perSession: "за сессию", streak: "серия", days: "дн.", left: "ещё на сегодня", leftZero: "Дневная цель выполнена 🎯", examNote: "Готова пачка слов — сдай экзамен, чтобы открыть новые", more: "Ещё сессия", finish: "В Учёбу", words: "слов", loading: "Готовим сессию…", empty: "Пока нечего учить — добавь слова в Учёбу" },
    en: { done: "Session complete", acc: "correct", cardsShown: "cards shown", masteredLabel: "Learned", of: "of", perSession: "this session", streak: "streak", days: "d.", left: "left for today", leftZero: "Daily goal done 🎯", examNote: "A word pack is ready — pass the exam to unlock new ones", more: "One more", finish: "To Study", words: "words", loading: "Building session…", empty: "Nothing to learn yet — add words to Study" },
    ukr: { done: "Сесію завершено", acc: "правильно", cardsShown: "карток показано", masteredLabel: "Вивчено", of: "з", perSession: "за сесію", streak: "серія", days: "дн.", left: "ще на сьогодні", leftZero: "Денну ціль виконано 🎯", examNote: "Пачка слів готова — склади екзамен, щоб відкрити нові", more: "Ще сесія", finish: "До Навчання", words: "слів", loading: "Готуємо сесію…", empty: "Поки нема чого вчити — додай слова до Навчання" },
    pl: { done: "Sesja zakończona", acc: "poprawnie", cardsShown: "kart pokazano", masteredLabel: "Nauczono", of: "z", perSession: "w sesji", streak: "seria", days: "dn.", left: "na dziś", leftZero: "Cel dzienny osiągnięty 🎯", examNote: "Paczka słów gotowa — zdaj egzamin, aby odblokować nowe", more: "Jeszcze raz", finish: "Do Nauki", words: "słów", loading: "Przygotowujemy sesję…", empty: "Na razie nie ma czego się uczyć — dodaj słowa do Nauki" },
    lt: { done: "Sesija baigta", acc: "teisingai", cardsShown: "kortelių parodyta", masteredLabel: "Išmokta", of: "iš", perSession: "sesijoje", streak: "serija", days: "d.", left: "šiandienai", leftZero: "Dienos tikslas pasiektas 🎯", examNote: "Žodžių paketas paruoštas — išlaikyk egzaminą, kad atrakintum naujus", more: "Dar viena", finish: "Į Mokymąsi", words: "žodžių", loading: "Ruošiame sesiją…", empty: "Kol kas nėra ko mokytis — pridėk žodžių į Mokymąsi" },
};

const STAGE = { position: "fixed", inset: 0, zIndex: 95, background: "var(--game-bg)", color: "var(--game-ink)", display: "flex", flexDirection: "column", overflow: "auto" };
const chip = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999, border: "1px solid var(--game-border)", background: "var(--game-surface)", fontWeight: 700, fontSize: "var(--fs-14)" };

// привести слово к форме, понятной играм: id = pool_id; translate.no — гарантированно есть.
const toGameWord = (w, lang) => {
    const pid = w?.pool_id ?? w?.id;
    return {
        ...w, id: pid, pool_id: pid,
        translate: {
            ...(w?.translate || {}),
            no: w?.translate?.no?.length ? w.translate.no : [w?.no].filter(Boolean),
            [lang]: w?.translate?.[lang]?.length ? w.translate[lang] : (w?.translate?.[lang] || []),
        },
    };
};
const toGameWords = (list, lang) => (list || [])
    .filter((w) => w && (w.pool_id ?? w.id) != null)
    .map((w) => toGameWord(w, lang));

// Элементы системной программы: {pool_id, no, translate, mode, direction, step}.
// Нормализуем в [{ comp, dir, gw }] — игра монтируется на одном слове.
const toElements = (list, lang) => (list || [])
    .filter((e) => e && (e.pool_id ?? e.id) != null)
    .map((e) => ({
        mode: e.mode || "choice",
        dir: e.direction || LEGACY_DIR,
        gw: toGameWord(e, lang),
    }));

export default function LearningSession({ words = [], mode = "choice", system = false, lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const soundOn = useSystemStore((s) => s.soundOn);
    const sessionLoading = useSessionStore((s) => s.loading); // следующая сессия ещё грузится фоном

    // Системный путь — когда явно сказано system или набор не передан.
    const isSystem = system || !words?.length;

    const [phase, setPhase] = useState(isSystem ? "load" : "play"); // load | play | summary | empty
    const [round, setRound] = useState(0);   // ключ перезапуска всей сессии

    // Системная программа: список элементов + указатель.
    const [elements, setElements] = useState([]);
    const [idx, setIdx] = useState(0);

    // Легаси-набор: один режим на весь массив.
    const [legacyGw] = useState(() => toGameWords(words, lang));

    // Прогресс сессии: упражнения (ответы) и карточки считаем РАЗДЕЛЬНО.
    const [res, setRes] = useState({ correct: 0, total: 0 }); // только упражнения
    const [cards, setCards] = useState(0);                    // показано карточек-интро
    const [hist, setHist] = useState([]);                     // итог по каждому пройденному элементу: "ok"|"err"|"card"
    const [after, setAfter] = useState(null); // свежая статистика после сессии
    const [before, setBefore] = useState(null); // базовая статистика на старте (для «выучено за сессию»)
    const [gate, setGate] = useState(null);   // состояние ворот экзамена (для итога системной сессии)
    const [busy, setBusy] = useState(false);

    // Подтянуть системную программу с бэка.
    const loadProgram = async () => {
        try {
            // базовую «выучено» фиксируем ОДИН раз на старте сессии — для дельты в итоге
            if (before == null) { try { setBefore(await api.learningStats()); } catch { /* */ } }
            // берём заранее прогретую сессию (мгновенно, если готова) и сразу греем следующую
            const r = await useSessionStore.getState().take(20);
            const list = Array.isArray(r) ? r : (r?.elements || r?.items || r?.words || []);
            const els = toElements(list, lang);
            if (els.length) {
                setElements(els); setIdx(0); setRes({ correct: 0, total: 0 }); setCards(0); setHist([]); setAfter(null); setPhase("play");
                // греем кэш дистракторов для всех «выборов» сессии — вопросы открываются мгновенно
                els.forEach((e) => { if (e.mode === "choice") api.prefetchPoolDistractors(e.gw?.pool_id, { n: 3, mode: e.dir, lang }); });
            }
            else { setPhase("empty"); }
        } catch {
            setPhase("empty");
        }
    };

    useEffect(() => {
        if (isSystem && phase === "load") loadProgram();
    }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

    // Ответ → SRS. Направление берём у текущего элемента (системный) либо общее (легаси).
    const onResult = (w, ok, gmode, direction) => {
        api.learningAnswer({
            pool_id: w?.pool_id ?? w?.id,
            correct: ok,
            mode: gmode,
            direction,
        }).catch(() => { /* офлайн — не критично */ });
    };

    // Карточка-интро (study): фиксируем «слово показано». Бэк за study обновляет окно силы и
    // счётчики (но НЕ клетки рампы) — поэтому слово перестаёт быть «совсем новым» и рампа на
    // следующем заходе ведёт его к упражнениям (выбор → сборка → ввод).
    const recordIntro = (w) => {
        api.learningAnswer({ pool_id: w?.pool_id ?? w?.id, correct: true, mode: "study", direction: null })
            .catch(() => { /* офлайн — не критично */ });
    };

    // Показать итог + подтянуть статистику.
    const showSummary = async () => {
        setPhase("summary");
        // сразу после окончания — начинаем греть следующую сессию (если ещё не греется)
        useSessionStore.getState().prefetch(20);
        try { setAfter(await api.learningStats()); } catch { /* */ }
        if (isSystem) { try { setGate(await api.learningGate()); } catch { /* */ } }
    };

    // Финиш одной игры. isStudy=true — это была карточка-интро (НЕ ответ): считаем отдельно.
    // Системный путь: переходим к следующему элементу либо к итогу. Легаси: сразу итог.
    const onGameFinish = (stats, isStudy = false) => {
        const got = stats || { total: 0, correct: 0 };
        if (isStudy) setCards((c) => c + (got.total || 1));
        else setRes((p) => ({ correct: p.correct + (got.correct || 0), total: p.total + (got.total || 0) }));
        // запоминаем исход элемента для полосы прогресса сессии
        setHist((h) => [...h, isStudy ? "card" : ((got.correct || 0) > 0 ? "ok" : "err")]);
        if (isSystem) {
            if (idx + 1 < elements.length) setIdx((n) => n + 1);
            else showSummary();
        } else {
            showSummary();
        }
    };

    // Запустить ещё одну сессию заново.
    const again = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (isSystem) {
                setElements([]); setIdx(0); setRes({ correct: 0, total: 0 }); setAfter(null);
                setPhase("load"); setRound((n) => n + 1);
            } else {
                // Легаси «ещё» — добираем актуальные «к повторению».
                const r = await api.learningDue(20).catch(() => null);
                const next = toGameWords(r?.words || [], lang);
                if (next.length) { setRes({ correct: 0, total: 0 }); setAfter(null); setRound((n) => n + 1); setPhase("play"); }
                else { setAfter((a) => ({ ...(a || {}), _empty: true })); }
            }
        } finally { setBusy(false); }
    };

    // --- Экран загрузки системной программы ---
    if (phase === "load") {
        return (
            <div style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)" }}>
                    <div className="session-orb" style={{ margin: "0 auto" }} />
                    <p style={{ opacity: .8 }}>{t.loading}</p>
                </div>
            </div>
        );
    }

    // --- Пустая программа (нечего учить) ---
    if (phase === "empty") {
        return (
            <div style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460, width: "100%" }}>
                    <h1 style={{ fontSize: "var(--fs-22)", marginBottom: "var(--sp-4)" }}>{t.empty}</h1>
                    <button className="btn btn--accent btn--lg btn--block" onClick={() => onClose?.(true)}>{t.finish}</button>
                </div>
            </div>
        );
    }

    // --- Итог «что дальше» ---
    if (phase === "summary") {
        const acc = res.total ? Math.round((res.correct / res.total) * 100) : 0;
        const due = after?.due ?? 0;
        const left = due + (after?.byStatus?.new || 0) + (after?.byStatus?.weak || 0);
        const streak = after?.streak || 0;
        const noneLeft = left <= 0 || after?._empty;
        const examGate = isSystem && !!gate?.open;   // ворота экзамена открыты → нужен экзамен, не новые слова
        // всего выучено (mastered) из всех слов учёбы + прирост за сессию
        const masteredNow = after?.byStatus?.mastered || 0;
        const totalWords = after?.total || 0;
        const learned = Math.max(0, masteredNow - (before?.byStatus?.mastered || 0)); // прирост за сессию
        return (
            <div style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460, width: "100%" }}>
                    <div className="session-orb session-orb--ok" style={{ margin: "0 auto" }} />
                    <h1 style={{ fontSize: "var(--fs-28)", margin: "var(--sp-4) 0 var(--sp-2)" }}>{t.done}</h1>
                    {res.total > 0 ? (
                        <>
                            <div style={{ fontSize: "var(--fs-44)", fontWeight: 800 }}>{acc}%</div>
                            <p style={{ opacity: .8, marginTop: 4 }}>{res.correct} / {res.total} {t.acc}</p>
                        </>
                    ) : (
                        <p style={{ opacity: .8, marginTop: 4 }}>{cards} {t.cardsShown}</p>
                    )}

                    {totalWords > 0 && (
                        <p style={{ opacity: .9, marginTop: 6, fontWeight: 700 }}>
                            <Icon n="award" sm /> {t.masteredLabel} {masteredNow} {t.of} {totalWords}
                            {learned > 0 && <span style={{ color: "var(--st-master)" }}> (+{learned} {t.perSession})</span>}
                        </p>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "var(--sp-5) 0" }}>
                        <span style={chip}><Icon n="flame" sm /> {streak} {t.days} · {t.streak}</span>
                        {cards > 0 && res.total > 0 && <span style={chip}><Icon n="layers" sm /> {cards} {t.cardsShown}</span>}
                        {!noneLeft && <span style={chip}><Icon n="repeat" sm /> {left} {t.left}</span>}
                    </div>

                    {/* Дневная цель — ориентир, не лимит. В режиме Учёбы (системная сессия) «Ещё сессия»
                        доступна всегда, КРОМЕ случая открытых ворот экзамена — тогда нужен экзамен. */}
                    {examGate
                        ? <p style={{ opacity: .85, marginBottom: "var(--sp-3)" }}>{t.examNote}</p>
                        : (noneLeft && <p style={{ opacity: .8, marginBottom: "var(--sp-3)" }}>{t.leftZero}</p>)}
                    {((isSystem && !examGate) || (!isSystem && !noneLeft)) && (
                        <button className="btn btn--accent btn--lg btn--block" onClick={again} disabled={busy || (isSystem && sessionLoading)}>
                            {(isSystem && sessionLoading) ? <BtnSpinner /> : <Icon n="play" sm />} {t.more}
                        </button>
                    )}
                    <button className="btn btn--ghost btn--block" style={{ marginTop: 8, color: "var(--game-ink)", borderColor: "var(--game-border)" }} onClick={() => onClose?.(true)}>
                        {t.finish}
                    </button>
                </div>
            </div>
        );
    }

    // --- Игра ---
    if (isSystem) {
        const el = elements[idx];
        if (!el) { onClose?.(true); return null; }
        const Game = COMP[el.mode] || ChoiceGame;
        const isStudy = el.mode === "card" || el.mode === "study";
        // полоса прогресса всей сессии: пройденные элементы + текущий + предстоящие
        const sessionSegs = elements.map((_, i) => (i < idx ? (hist[i] || "ok") : (i === idx ? "now" : "")));
        return (
            <Game
                key={`${round}-${idx}`}
                words={[el.gw]}
                mode={el.dir}
                sound={soundOn}
                stepNo={idx + 1}
                stepTotal={elements.length}
                segs={sessionSegs}
                // записываем по АВТОРИТЕТНОМУ шагу системы (el.mode/el.dir), а не по тому, что
                // сообщит игра — иначе клетка рампы могла бы не совпасть и слово застряло бы
                onResult={isStudy ? undefined : (w, ok) => onResult(w, ok, el.mode, el.dir)}
                onFinish={isStudy ? (s) => { recordIntro(el.gw); onGameFinish(s, true); } : (s) => onGameFinish(s, false)}
                onExit={() => onClose?.(true)}
                setGameState={() => onClose?.(true)}
            />
        );
    }

    // Легаси-путь: готовый набор, один режим/направление на всю сессию.
    if (!legacyGw.length) { onClose?.(true); return null; }
    const Game = COMP[mode] || ChoiceGame;
    const isStudy = mode === "card" || mode === "study";
    return (
        <Game
            key={round}
            words={legacyGw}
            mode={LEGACY_DIR}
            sound={soundOn}
            onResult={isStudy ? undefined : (w, ok, gmode) => onResult(w, ok, gmode, LEGACY_DIR)}
            onFinish={onGameFinish}
            onExit={() => onClose?.(true)}
            setGameState={() => onClose?.(true)}
        />
    );
}
