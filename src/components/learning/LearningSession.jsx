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
import { useAuthStore } from "../../store/AuthStore.jsx";
import { useSessionStore } from "../../store/sessionStore.jsx";
import { pl } from "../ui/plural.js";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import ChoiceGame from "../gameComponents/ChoiceGame.jsx";
import InputGame from "../gameComponents/InputGame.jsx";
import StudyGame from "../gameComponents/StudyGame.jsx";
import BuildGame from "../gameComponents/BuildGame.jsx";
import ClozeGame from "../gameComponents/ClozeGame.jsx";
import { stageRank } from "../gameComponents/gameShared.jsx";
import { T } from "./LearningSession.i18n.js";

// mode элемента/сессии → игровой компонент.
const COMP = { choice: ChoiceGame, build: BuildGame, input: InputGame, card: StudyGame, study: StudyGame, cloze: ClozeGame };

// Направление перевода для легаси-набора (единое на сессию: родной → норвежский).
const LEGACY_DIR = "int2no";


const STAGE = { position: "fixed", inset: 0, zIndex: 95, background: "var(--game-bg)", color: "var(--game-ink)", display: "flex", flexDirection: "column", overflow: "auto" };
const chip = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 999, border: "1px solid var(--game-border)", background: "var(--game-surface)", fontWeight: 700, fontSize: "var(--fs-14)" };

// привести слово к форме, понятной играм: id = pool_id; translate.no — гарантированно есть.
/**
 * @param {any} w слово из БД/сессии
 * @param {import('../../types.js').UiLang} lang
 * @returns {import('../../types.js').GameWord}
 */
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
/**
 * @param {import('../../types.js').SessionElement[]} list
 * @param {import('../../types.js').UiLang} lang
 * @returns {import('../../types.js').NormElement[]}
 */
const toElements = (list, lang) => (list || [])
    .filter((e) => e && (e.pool_id ?? e.id) != null)
    .map((e) => ({
        mode: e.mode || "choice",
        dir: e.direction || LEGACY_DIR,
        step: e.step || null,        // клетка рампы (для оттенка прогресса по стадии)
        repeat: !!e.repeat,          // повтор (уже учил) — для пометки в игре
        gw: toGameWord(e, lang),
    }));

export default function LearningSession({ words = [], mode = "choice", system = false, setId = null, lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const soundOn = useSystemStore((s) => s.soundOn);
    // Задания «на слух»: локальное переопределение устройства (null=следовать аккаунту) поверх gamePrefs.listenOff.
    const listenOffLocal = useSystemStore((s) => s.listenOffLocal);
    const acctListenOff = useAuthStore((s) => !!s.user?.gamePrefs?.listenOff);
    const listenDisabled = listenOffLocal != null ? listenOffLocal : acctListenOff;
    const sessionLoading = useSessionStore((s) => s.loading); // следующая сессия ещё грузится фоном

    // Системный путь — когда явно сказано system или набор не передан.
    const isSystem = system || !words?.length;

    const [phase, setPhase] = useState(isSystem ? "load" : "play"); // load | play | summary | empty
    const [round, setRound] = useState(0);   // ключ перезапуска всей сессии
    const [isDesktop] = useState(() => { try { return matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)").matches; } catch { return false; } });

    // Системная программа: список элементов + указатель.
    const [elements, setElements] = useState([]);
    const [idx, setIdx] = useState(0);

    // Легаси-набор: один режим на весь массив.
    const [legacyGw] = useState(() => toGameWords(words, lang));

    // Прогресс сессии: упражнения (ответы) и карточки считаем РАЗДЕЛЬНО.
    const [res, setRes] = useState({ correct: 0, total: 0 }); // только упражнения
    const [cards, setCards] = useState(0);                    // показано карточек-интро
    const [hist, setHist] = useState([]);                     // итог по каждому пройденному элементу: "ok"|"err"|"card"
    const [graduated, setGraduated] = useState(0);            // слов «выпущено» за сессию: ввод (штатная клава) с 1-й попытки → больше не придут
    const [protectedNow, setProtectedNow] = useState(0);      // «защищено» за сессию: повтор-слова, прошедшие финальную стадию (ввод) чисто
    const [protectedTypo, setProtectedTypo] = useState(0);    // из них принятых С ОПЕЧАТКОЙ (отдельный пункт итога)
    const [after, setAfter] = useState(null); // свежая статистика после сессии
    const [gate, setGate] = useState(null);   // состояние ворот экзамена (для итога системной сессии)
    const [busy, setBusy] = useState(false);

    // Подтянуть системную программу с бэка.
    const loadProgram = async () => {
        try {
            // дрилл по набору (setId) — тянем сессию набора напрямую; иначе берём заранее
            // прогретую общую сессию (мгновенно, если готова); следующую закажет экран итога
            const r = setId ? await api.setSession(setId, 20, lang) : await useSessionStore.getState().take(20);
            const list = Array.isArray(r) ? r : (r?.elements || r?.items || r?.words || []);
            const els = toElements(list, lang);
            if (els.length) {
                // Варианты «выбора» приходят inline в элементах сессии. Догружаем дистракторы ТОЛЬКО
                // для тех choice, где их вдруг нет (страховка) — и ждём их, чтобы внутри сессии ничего
                // не тормозило. Обычно тут пусто → лоадер не задерживается.
                await Promise.all(els
                    .filter((e) => e.mode === "choice" && !(e.gw?.options?.length || e.gw?.distractors?.length))
                    .map((e) => api.getPoolDistractors(e.gw?.pool_id, { n: 3, mode: e.dir, lang }).catch(() => null)));
                setElements(els); setIdx(0); setRes({ correct: 0, total: 0 }); setCards(0); setHist([]); setGraduated(0); setProtectedNow(0); setProtectedTypo(0); setAfter(null); setPhase("play");
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
        try { setAfter(await api.learningStats()); } catch { /* */ }
        if (isSystem) { try { setGate(await api.learningGate()); } catch { /* */ } }
        // следующую сессию греем ПОСЛЕ статов — к этому моменту ответы записаны, и бэк отдаст
        // свежий состав (со сдвинутыми по рампе словами), а не те же «выборы». В дрилле по набору
        // общую сессию не греем (там «Ещё» перечитывает сессию набора напрямую в loadProgram).
        if (!setId) useSessionStore.getState().prefetch(20);
    };

    // Финиш одной игры. isStudy=true — это была карточка-интро (НЕ ответ): считаем отдельно.
    // Системный путь: переходим к следующему элементу либо к итогу. Легаси: сразу итог.
    const onGameFinish = (stats, isStudy = false, gmode = null) => {
        const got = stats || { total: 0, correct: 0 };
        if (isStudy) setCards((c) => c + (got.total || 1));
        else setRes((p) => ({ correct: p.correct + (got.correct || 0), total: p.total + (got.total || 0) }));
        // «выпущено за сессию»: ввод (штатная клава) с ПЕРВОЙ попытки = слово прошло рампу и больше не придёт
        if (!isStudy && gmode === "input" && (got.correct || 0) > 0) setGraduated((g) => g + (got.correct || 0));
        // «защищено за сессию»: повтор-слово, прошедшее финальную стадию (ввод) — закрепилось.
        // Если ввод приняли С ОПЕЧАТКОЙ (got.typo) — отдельный счётчик (отдельный пункт итога).
        if (!isStudy && gmode === "input" && (got.correct || 0) > 0 && elements[idx]?.repeat) {
            if (got.typo) setProtectedTypo((p) => p + 1);
            else setProtectedNow((p) => p + (got.correct || 0));
        }
        // запоминаем исход элемента для полосы прогресса сессии
        setHist((h) => [...h, isStudy ? "card" : ((got.correct || 0) > 0 ? "ok" : "err")]);
        if (isSystem) {
            if (idx + 1 < elements.length) setIdx((n) => n + 1);
            else showSummary();
        } else {
            showSummary();
        }
    };

    // «Не учить» из игры: жалоба на текущее слово (мусор) → убрать у себя + админу, и пропустить элемент.
    const reportCurrent = async () => {
        const gw = elements[idx]?.gw;
        if (!gw) return;
        const pid = gw.pool_id ?? gw.id;
        try { await api.learningReport(pid); } catch { /* офлайн — не критично */ }
        // без тоста — просто убираем слово и идём дальше
        setHist((h) => [...h, "skip"]);
        if (idx + 1 < elements.length) setIdx((n) => n + 1);
        else showSummary();
    };

    // «Уже знаю» из карточки: слово сразу в Выучено (mastered), без тоста, и идём дальше.
    const knowCurrent = async () => {
        const gw = elements[idx]?.gw;
        if (!gw) return;
        try { await api.learningStatus(gw.pool_id ?? gw.id, "known"); } catch { /* офлайн — не критично */ }
        setHist((h) => [...h, "ok"]);
        if (idx + 1 < elements.length) setIdx((n) => n + 1);
        else showSummary();
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

    // Десктоп: Enter на экране результата → «Ещё сессия» (если кнопка доступна — не ворота экзамена / есть что учить)
    useEffect(() => {
        if (phase !== "summary") return;
        const examGate = isSystem && !!gate?.open;
        const sLeft = (after?.due ?? 0) + (after?.byStatus?.new || 0) + (after?.byStatus?.weak || 0);
        const noneLeft = sLeft <= 0 || after?._empty;
        if (!((isSystem && !examGate) || (!isSystem && !noneLeft))) return;
        const onKey = (e) => { if (e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); again(); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, after, gate, isSystem]); // eslint-disable-line

    // Esc в любой игре — выйти из учёбы (общий обработчик на сессию)
    useEffect(() => {
        if (phase !== "play") return;
        const onKey = (e) => { if (e.code === "Escape") { e.preventDefault(); onClose?.(true); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase]); // eslint-disable-line

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
        // всего выучено (mastered) из всех слов учёбы; «+N за сессию» = слов выпущено за эту сессию
        // (ввод с штатной клавы с 1-й попытки — они прошли рампу и больше не придут)
        const learned = graduated;
        // Осязаемая цель вместо «N из total» (total растёт и сбивает): прогресс к след. уровню CEFR —
        // весь активный словарь против кумулятивного порога уровня (как на карточке «Сегодня»).
        const by = after?.byStatus || {};
        const masteredAll = (by.mastered || 0) + (by.repeat || 0) + (by.archived || 0);
        const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
        const curLevel = after?.currentLevel || "A1";
        const nextLevel = CEFR[CEFR.indexOf(curLevel) + 1] || null;
        const nextTarget = nextLevel ? (after?.byLevel?.[nextLevel]?.target || 0) : 0;
        const toNext = nextLevel ? Math.max(0, nextTarget - masteredAll) : 0;
        // прогресс-бар к уровню: база (было до сессии) + ЗЕЛЁНАЯ прибавка за сессию (+learned)
        const baseMastered = Math.max(0, masteredAll - learned);
        const basePct = nextTarget ? Math.min(100, (baseMastered / nextTarget) * 100) : 0;
        const gainPct = nextTarget ? Math.min(100 - basePct, (learned / nextTarget) * 100) : 0;
        return (
            <div style={STAGE}>
                <div style={{ margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460, width: "100%" }}>
                    <h1 style={{ fontSize: "var(--fs-28)", margin: "var(--sp-4) 0 var(--sp-2)" }}>{t.done}</h1>
                    {res.total > 0 ? (
                        <>
                            <div style={{ fontSize: "var(--fs-44)", fontWeight: 800 }}>{acc}%</div>
                            <p style={{ opacity: .8, marginTop: 4 }}>{res.correct} / {res.total} {t.acc}</p>
                        </>
                    ) : (
                        <p style={{ opacity: .8, marginTop: 4 }}>{cards} {pl(lang, cards, "card")} {t.shown}</p>
                    )}

                    {learned > 0 && (
                        <p style={{ opacity: .9, marginTop: 6, fontWeight: 700, color: "var(--st-master)" }}>
                            <Icon n="award" sm /> +{learned} {t.masteredLabel.toLowerCase()} {t.perSession}
                        </p>
                    )}

                    {protectedNow > 0 && (
                        <p style={{ opacity: .9, marginTop: 6, fontWeight: 700, color: "var(--st-master)" }}>
                            <Icon n="lock" sm /> {t.protectedLabel}: {protectedNow}
                        </p>
                    )}

                    {protectedTypo > 0 && (
                        <p style={{ opacity: .9, marginTop: 6, fontWeight: 700, color: "#d98a2b" }}>
                            <Icon n="lock" sm /> {t.protectedTypoLabel}: {protectedTypo}
                        </p>
                    )}

                    {after?.currentLevel && (
                        <div style={{ marginTop: 12, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                            <p style={{ opacity: .8, fontSize: "var(--fs-14)", margin: 0 }}>
                                {nextLevel
                                    ? <>{t.levelTo} <b>{nextLevel}</b>: {toNext} {pl(lang, toNext, "word")}</>
                                    : t.maxLevel}
                            </p>
                            {nextLevel && nextTarget > 0 && (
                                <div style={{ height: 10, borderRadius: 999, background: "var(--game-border)", display: "flex", marginTop: 8 }}>
                                    {/* база (было) — приглушённый зелёный; прибавка за сессию — яркий зелёный, постоянно мерцает/светится */}
                                    <div style={{ width: basePct + "%", background: "var(--st-master)", opacity: .4, borderRadius: "999px 0 0 999px" }} />
                                    {gainPct > 0 && <div className="finbar__gain" style={{ width: gainPct + "%", minWidth: 6, background: "var(--st-master)", borderRadius: "0 999px 999px 0" }} title={`+${learned}`} />}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", margin: "var(--sp-5) 0" }}>
                        <span style={chip}><Icon n="flame" sm /> {streak} {t.days} · {t.streak}</span>
                        {cards > 0 && res.total > 0 && <span style={chip}><Icon n="layers" sm /> {cards} {pl(lang, cards, "card")} {t.shown}</span>}
                        {!noneLeft && <span style={chip}><Icon n="repeat" sm /> {left} {t.left}</span>}
                    </div>

                    {/* Дневная цель — ориентир, не лимит. В режиме Учёбы (системная сессия) «Ещё сессия»
                        доступна всегда, КРОМЕ случая открытых ворот экзамена — тогда нужен экзамен. */}
                    {examGate
                        ? <p style={{ opacity: .85, marginBottom: "var(--sp-3)" }}>{t.examNote}</p>
                        : (noneLeft && <p style={{ opacity: .8, marginBottom: "var(--sp-3)" }}>{t.leftZero}</p>)}
                    {((isSystem && !examGate) || (!isSystem && !noneLeft)) && (
                        <button className="btn btn--accent btn--lg btn--block" onClick={again} disabled={busy || (isSystem && !setId && sessionLoading)}>
                            {(isSystem && !setId && sessionLoading) ? <BtnSpinner /> : <Icon n="play" sm />} {t.more}
                            {isDesktop && <span style={{ opacity: .6, fontWeight: 400, marginLeft: 6 }}>(Enter)</span>}
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
        // полоса прогресса сессии: сегмент на слово. Пройденные — ЦВЕТ СТАДИИ слова (карточка серая
        // → ввод самый насыщенный зелёный), текущее — акцент, предстоящие — пустые (появляются по ходу).
        const segCell = (e) => e?.step || ((e?.mode === "card" || e?.mode === "study") ? "card" : `${e?.mode}_${e?.dir}`);
        const sessionSegs = elements.map((e, i) => ({
            state: i < idx ? (hist[i] === "err" ? "err" : "ok") : (i === idx ? "now" : "future"),
            rank: stageRank(segCell(e)),
        }));
        return (
            <Game
                key={`${round}-${idx}`}
                words={[el.gw]}
                mode={el.dir}
                sound={soundOn}
                stepNo={idx + 1}
                stepTotal={elements.length}
                segs={sessionSegs}
                rank={stageRank(segCell(el))}   // стадия рампы слова → высота звуков «вход»/«верно»
                listen={el.mode === "choice" && el.dir === "no2int" && !listenDisabled}   // стадия choice_no2int → «на слух»
                listenMuted={el.mode === "choice" && el.dir === "no2int" && listenDisabled}   // та же стадия, но аудирование выкл → нудж «вернуть»
                repeat={el.repeat}
                baseCorrect={res.correct}
                baseWrong={res.total - res.correct}
                // записываем по АВТОРИТЕТНОМУ шагу системы (el.mode/el.dir), а не по тому, что
                // сообщит игра — иначе клетка рампы могла бы не совпасть и слово застряло бы
                onResult={isStudy ? undefined : (w, ok) => onResult(w, ok, el.mode, el.dir)}
                onFinish={isStudy ? (s) => { recordIntro(el.gw); onGameFinish(s, true); } : (s) => onGameFinish(s, false, el.mode)}
                onReport={reportCurrent}
                onKnow={knowCurrent}
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
