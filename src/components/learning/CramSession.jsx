// Режим ЗАУЧИВАНИЯ («зубрёжка набора»). Другой алгоритм сессии, чем у Smart Review:
//  • очередь = ВСЕ слова набора, каждое — только ФИНАЛЬНОЙ ступенью «впиши по памяти» (input_int2no);
//  • промах или подсказка («Не знаю» / Enter с пустым полем) НЕ выкидывает слово в следующую
//    сессию — оно встаёт в КОНЕЦ этой очереди и придёт снова (requeue в useGameLoop);
//  • сессия кончается, только когда каждое слово сдано с ПЕРВОГО предъявления.
// SRS не трогаем вообще: ни клетки рампы, ни расписание, ни «выучено» (onResult никуда не пишет —
// зубрёжка не должна двигать интервальные повторения). В журнал уходит только дневная активность,
// одним пакетом на финише/выходе — заниматься человек реально занимался.
import { useEffect, useRef, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import InputGame from "../gameComponents/InputGame.jsx";
import { toGameWords } from "./useLearningSession.js";
import { Icon } from "../ui/Icon.jsx";
import { pl } from "../ui/plural.js";
import api from "../tools/api.js";
import { C } from "./CramSession.i18n.js";

const STAGE = { position: "fixed", inset: 0, zIndex: 95, background: "var(--game-bg)", color: "var(--game-ink)", display: "flex", flexDirection: "column", overflow: "auto" };
const SHEET = { margin: "auto", textAlign: "center", padding: "var(--sp-5)", maxWidth: 460, width: "100%" };

// poolIds — выделенные в наборе слова (null/пусто = весь набор): 50 слов за раз мало кто осилит,
// поэтому нормальный сценарий — отметить нужную часть и гонять её.
export default function CramSession({ setId, setName = "", poolIds = null, lang = "ru", onClose }) {
    const t = C[lang] || C.ru;
    const soundOn = useSystemStore((s) => s.soundOn);
    const [phase, setPhase] = useState("load");   // load | intro | play | empty | summary
    const [words, setWords] = useState(/** @type {any[]} */([]));
    const [round, setRound] = useState(0);        // ключ перезапуска («Ещё раз» — новая перетасовка)
    const [res, setRes] = useState({ answers: 0, clean: 0 });   // итог для экрана «Готово»
    // Счётчик ответов держим РЕФОМ: onResult прилетает из игрового цикла, а ререндер сессии на
    // каждый ответ размонтировал бы игру (key) — потеря ввода.
    const statsRef = useRef({ answers: 0, correct: 0 });

    useEffect(() => {
        let alive = true;
        // Фильтр выделения делаем ЗДЕСЬ, а не на входе: набор мог измениться с момента выбора
        // (слово удалили) — пересечение со свежим списком отсекает мёртвые id само.
        const pick = poolIds?.length ? new Set(poolIds) : null;
        api.setWords(setId)
            .then((r) => {
                // set-слова приходят как {pool_id, norwegian, translate…}; играм нужен no + id.
                const src = (r?.words || []).filter((w) => !pick || pick.has(w.pool_id));
                const gw = toGameWords(src.map((w) => ({ ...w, no: w.norwegian })), lang);
                if (!alive) return;
                setWords(gw);
                setPhase(gw.length ? "intro" : "empty");
            })
            .catch(() => { if (alive) setPhase("empty"); });
        return () => { alive = false; };
    }, [setId, lang, poolIds]);

    // Отдать накопленное в дневной журнал и обнулить — вызывается и на финише, и на выходе,
    // поэтому обнуление обязательно (иначе «Готово» после итога записало бы ответы дважды).
    const flush = () => {
        const { answers, correct } = statsRef.current;
        statsRef.current = { answers: 0, correct: 0 };
        if (answers > 0) api.learningNoteActivity(answers, correct).catch(() => { /* офлайн — не критично */ });
        return { answers, correct };
    };

    const start = () => { statsRef.current = { answers: 0, correct: 0 }; setRound((n) => n + 1); setPhase("play"); };
    const close = () => { flush(); onClose?.(true); };
    // Ответ по ПЕРВОЙ попытке предъявления: ok=false → слово ушло в конец очереди (см. useGameLoop).
    const onResult = (_w, ok) => {
        const s = statsRef.current;
        s.answers += 1;
        if (ok) s.correct += 1;
    };
    const finish = () => {
        const { answers, correct } = flush();
        setRes({ answers, clean: correct });
        setPhase("summary");
    };

    if (phase === "load") {
        return (
            <div style={STAGE}>
                <button type="button" aria-label={t.finish} onClick={() => onClose?.(false)}
                    style={{ position: "absolute", top: "var(--sp-3)", right: "var(--sp-3)", zIndex: 1, background: "transparent", border: "none", color: "var(--game-ink)", cursor: "pointer", padding: 8, opacity: .8 }}>
                    <Icon n="x" />
                </button>
                <div style={{ ...SHEET, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)" }}>
                    <div className="session-orb" style={{ margin: "0 auto" }} />
                    <p style={{ opacity: .8 }}>{t.loading}</p>
                </div>
            </div>
        );
    }

    if (phase === "empty") {
        return (
            <div style={STAGE}>
                <div style={SHEET}>
                    <h1 style={{ fontSize: "var(--fs-22)", marginBottom: "var(--sp-4)" }}>{t.empty}</h1>
                    <button className="btn btn--accent btn--lg btn--block" onClick={() => onClose?.(false)}>{t.finish}</button>
                </div>
            </div>
        );
    }

    if (phase === "intro") {
        return (
            <div style={STAGE}>
                <div style={SHEET}>
                    <span className="eyebrow" style={{ justifyContent: "center" }}><Icon n="repeat" sm /> {t.title}</span>
                    <h1 style={{ fontSize: "var(--fs-22)", margin: "var(--sp-2) 0 var(--sp-1)" }}>
                        {words.length} {pl(lang, words.length, "word")}
                    </h1>
                    {setName && <div style={{ opacity: .7, marginBottom: "var(--sp-4)" }}>{t.of} «{setName}»</div>}
                    <p style={{ opacity: .85, lineHeight: 1.5, marginBottom: "var(--sp-2)" }}>{t.rule}</p>
                    <p style={{ opacity: .7, fontSize: "var(--fs-14)", lineHeight: 1.5 }}>{t.hint}</p>
                    <p style={{ opacity: .7, fontSize: "var(--fs-14)", lineHeight: 1.5, marginBottom: "var(--sp-5)" }}>{t.srs}</p>
                    <button className="btn btn--accent btn--lg btn--block" onClick={start}><Icon n="play" sm /> {t.start}</button>
                    <button className="btn btn--block" style={{ marginTop: "var(--sp-2)" }} onClick={() => onClose?.(false)}>{t.finish}</button>
                </div>
            </div>
        );
    }

    if (phase === "summary") {
        const misses = Math.max(0, res.answers - res.clean);
        return (
            <div style={STAGE}>
                <div style={SHEET}>
                    <span className="eyebrow" style={{ justifyContent: "center" }}><Icon n="check-circle" sm /> {t.title}</span>
                    <h1 style={{ fontSize: "var(--fs-22)", margin: "var(--sp-2) 0 var(--sp-1)" }}>{t.done}</h1>
                    <p style={{ opacity: .8, marginBottom: "var(--sp-4)" }}>{t.doneSub}</p>
                    <div className="row" style={{ gap: "var(--sp-3)", justifyContent: "center", marginBottom: "var(--sp-5)", flexWrap: "wrap" }}>
                        <span className="review-cta__chip"><b>{words.length}</b>&nbsp;{pl(lang, words.length, "word")}</span>
                        <span className="review-cta__chip"><b>{res.answers}</b>&nbsp;{t.answers}</span>
                        <span className="review-cta__chip"><b>{misses}</b>&nbsp;{t.misses}</span>
                    </div>
                    <button className="btn btn--accent btn--lg btn--block" onClick={start}><Icon n="repeat" sm /> {t.again}</button>
                    <button className="btn btn--block" style={{ marginTop: "var(--sp-2)" }} onClick={close}>{t.finish}</button>
                </div>
            </div>
        );
    }

    // play: одна игра на всю очередь — финальная ступень «впиши по памяти» (int2no), requeue включён.
    return (
        <InputGame
            key={round}
            words={words}
            mode="int2no"
            sound={soundOn}
            requeue
            onResult={onResult}
            onFinish={finish}
            onExit={close}
            setGameState={close}
        />
    );
}
