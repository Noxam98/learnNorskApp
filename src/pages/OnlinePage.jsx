import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import confetti from "canvas-confetti";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { useWordsStore } from "../store/wordStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import api from "../components/tools/api.js";
import { playSound, playWin, preloadSounds } from "../components/tools/sound.js";
import { hyphenate, hyLang } from "../components/ui/hyphenate.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SETTINGS = { game: "quiz", dir: "no2int", source: "pool", dictId: "", level: "", topic: "", count: 7, qtime: 15, maxPlayers: 4, private: false };

// Полноэкранный игровой контейнер в теме приложения (а не в тёмной теме обычных игр).
const SCREEN = {
    position: "fixed", inset: 0, zIndex: 90, overflow: "auto",
    background: "var(--surface-2)", color: "var(--ink)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "var(--sp-5)",
};

function choiceStyle(kind) {
    const base = {
        padding: "16px 14px", borderRadius: 14, border: "2px solid var(--border)",
        background: "var(--surface)", color: "var(--ink)", fontSize: "var(--fs-18)",
        fontWeight: 600, cursor: kind === "idle" || kind === "selected" ? "pointer" : "default", width: "100%",
        overflowWrap: "break-word", hyphens: "manual", minWidth: 0,   // умный перенос длинных слов
    };
    if (kind === "correct") return { ...base, borderColor: "var(--success)", color: "var(--success)", background: "var(--success-bg)" };
    if (kind === "wrong") return { ...base, borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-bg)" };
    if (kind === "dim") return { ...base, opacity: 0.7 };   // остаётся видимым, лишь приглушён
    if (kind === "selected") return { ...base, borderColor: "var(--ember-600)", background: "var(--surface-3)", boxShadow: "0 0 0 2px var(--ember-600) inset" };
    return base;
}

// Праздничный салют для победителя: центральный залп + боковые «пушки» ~1.2 сек.
function fireConfetti() {
    confetti({ particleCount: 150, spread: 90, startVelocity: 45, origin: { y: 0.35 } });
    const end = Date.now() + 1200;
    (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

// Чип игрока: серый, пока не ответил; ярче — когда ответил. layoutId → плавно переезжает
// из верхнего ряда на кнопку при показе ответов.
function PlayerChip({ name, bright }) {
    return (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            style={{
                padding: "3px 10px", borderRadius: 999, fontSize: "var(--fs-12)", fontWeight: 700,
                whiteSpace: "nowrap", border: "1px solid var(--border)",
                background: bright ? "var(--ember-600)" : "var(--surface-3)",
                color: bright ? "#fff" : "var(--ink-3)",
                boxShadow: bright ? "0 2px 6px rgba(0,0,0,.2)" : "none",
            }}>
            {name}
        </motion.div>
    );
}

// Таймер вопроса: секционная полоса (по секунде на секцию) + цифра, едущая вслед за фронтом.
function TimerBar({ total, left }) {
    const pct = total ? (left / total) * 100 : 0;
    return (
        <div style={{ position: "relative", width: "100%", maxWidth: 600, margin: "0 auto var(--sp-6)" }}>
            <div style={{ display: "flex", gap: 3, height: 8 }}>
                {Array.from({ length: total }).map((_, i) => (
                    <span key={i} style={{
                        flex: 1, borderRadius: 2,
                        background: i < left ? "var(--ember-600)" : "var(--border)",
                        transition: "background .25s linear",
                    }} />
                ))}
            </div>
            <motion.div animate={{ left: `${pct}%` }} transition={{ ease: "linear", duration: 0.12 }}
                style={{ position: "absolute", top: 11, transform: "translateX(-50%)", fontWeight: 800, fontSize: "var(--fs-14)", color: "var(--ember-600)" }}>
                {Math.ceil(left)}
            </motion.div>
        </div>
    );
}

// Варианты для «игровых» анимаций: стаггер-появление карточек вариантов.
const OPT_LIST = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const OPT_ITEM = { hidden: { opacity: 0, y: 28, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 22 } } };

export const OnlinePage = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[lang];
    const to = t.online || {};
    const savedPrefs = useAuthStore((s) => s.user?.onlinePrefs);
    const dictList = useWordsStore((s) => s.dictList);

    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [room, setRoom] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [question, setQuestion] = useState(null);
    const [chosen, setChosen] = useState(null);
    const [reveal, setReveal] = useState(null);
    const [podium, setPodium] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);   // секунды до конца вопроса (визуальный таймер)
    const [preparing, setPreparing] = useState(false);  // сервер готовит набор слов (AI-подбор)
    const [answered, setAnswered] = useState([]);  // имена ответивших на текущий вопрос
    const answeredRef = useRef([]);
    const roomRef = useRef(null);                   // актуальная комната для колбэков WS

    const send = useCallback((obj) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    }, []);

    useEffect(() => {
        const ws = new WebSocket(api.onlineSocketUrl(lang));
        wsRef.current = ws;
        ws.onopen = () => { setConnected(true); ws.send(JSON.stringify({ type: "watch" })); };
        ws.onclose = () => setConnected(false);
        ws.onmessage = (e) => {
            let m; try { m = JSON.parse(e.data); } catch { return; }
            switch (m.type) {
                case "rooms": setRooms(m.rooms || []); break;
                case "room":
                    roomRef.current = m.room;
                    setRoom(m.room);
                    if (m.room.state === "lobby") { setCountdown(null); setQuestion(null); setReveal(null); setPreparing(false); }
                    break;
                case "countdown": setCountdown(m.sec); playSound(m.sec === 1 ? "start" : "tick"); break;
                case "preparing": setPreparing(true); break;
                case "question":
                    setQuestion(m); setChosen(null); setReveal(null); setPodium(null); setCountdown(null); setPreparing(false);
                    answeredRef.current = []; setAnswered([]);
                    playSound("question");
                    break;
                case "answered": {
                    const prev = answeredRef.current;
                    const names = m.names || [];
                    const myName = roomRef.current?.players?.find((p) => p.isYou)?.name;
                    if (names.some((n) => !prev.includes(n) && n !== myName)) playSound("select");  // чужой ответ
                    answeredRef.current = names; setAnswered(names);
                    break;
                }
                case "reveal": setReveal(m); playSound(m.gained > 0 ? "correct" : "wrong"); break;
                case "ended": setPodium(m.podium); setQuestion(null); setReveal(null); setPreparing(false); break;
                case "left": setRoom(null); setQuestion(null); setReveal(null); setPodium(null); setCountdown(null); setPreparing(false); break;
                case "error": case "game_error":
                    useSystemStore.getState().showToast(to[m.msg] || to.genericError || "—"); break;
                default: break;
            }
        };
        return () => { try { ws.close(); } catch { /* no-op */ } };
    }, [lang]); // eslint-disable-line

    const myReady = room?.players?.find((p) => p.isYou)?.ready;

    const answer = (i, ev) => {
        if (chosen != null || reveal) return;
        if (ev?.currentTarget?.blur) ev.currentTarget.blur();   // на смартфоне снимаем фокус с кнопки
        playSound("select");
        setChosen(i);
        send({ type: "answer", q: question.i, choice: i });
    };

    // Аудио предзагружаем при входе в комнату — к старту игры всё закешировано.
    useEffect(() => { if (room) preloadSounds(); }, [room?.id]); // eslint-disable-line

    // Новый вопрос — снять фокус с кнопки прошлого экрана (иначе на мобиле она подсвечена).
    useEffect(() => {
        if (question && document.activeElement?.blur) document.activeElement.blur();
    }, [question?.i]);

    // Визуальный таймер вопроса (полоса сверху + бегущая цифра). Останавливается на reveal.
    useEffect(() => {
        if (!question || reveal) return;
        const total = question.time || 15;
        const start = performance.now();
        setTimeLeft(total);
        let raf;
        const tick = () => {
            const left = Math.max(0, total - (performance.now() - start) / 1000);
            setTimeLeft(left);
            if (left > 0) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [question?.i, reveal]); // eslint-disable-line

    // Салют синхронно с выездом первого места на подиуме (строки появляются со стаггером).
    useEffect(() => {
        if (!podium) return;
        const id = setTimeout(() => { fireConfetti(); playWin(); }, 400);
        return () => clearTimeout(id);
    }, [podium]);

    // ---------- Рендер ----------
    if (!connected) {
        return <main className="shell" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
            <p className="muted">{to.connecting || "…"}</p>
        </main>;
    }

    // Подиум (конец игры) — поверх всего
    if (room && podium) {
        const medals = ["🥇", "🥈", "🥉"];
        return <main style={{ ...SCREEN, justifyContent: "flex-start", paddingTop: "var(--sp-7)" }}>
            <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
                <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 12 }}
                    style={{ textAlign: "center", fontSize: 64 }}>🏆</motion.div>
                <h1 style={{ textAlign: "center", margin: "var(--sp-2) 0 var(--sp-5)" }}>{to.podium || "Итоги"}</h1>
                <div className="panel"><div className="panel__body">
                    {podium.map((p, i) => (
                        <motion.div className="setrow" key={p.name}
                            initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 + i * 0.15 }}
                            style={i === 0 ? { background: "var(--success-bg)", borderRadius: 12 } : undefined}>
                            <span className="setrow__ic" style={{ fontWeight: 700, fontSize: "var(--fs-18)" }}>{medals[i] || p.place}</span>
                            <span className="setrow__meta"><span className="setrow__t" style={i === 0 ? { fontWeight: 800 } : undefined}>{p.name}</span></span>
                            <b style={{ fontSize: i === 0 ? "var(--fs-20)" : undefined }}>{p.score}</b>
                        </motion.div>
                    ))}
                </div></div>
                <button className="btn btn--accent btn--block btn--lg" style={{ marginTop: "var(--sp-5)" }}
                    onClick={() => setPodium(null)}>{to.toLobby || "В лобби"}</button>
            </div>
        </main>;
    }

    // В комнате
    if (room) {
        // Обратный отсчёт — пружинный пульс с расходящимся кольцом
        if (countdown != null) {
            return <main style={SCREEN}>
                <div style={{ textAlign: "center", position: "relative" }}>
                    <div className="muted" style={{ marginBottom: "var(--sp-3)" }}>{to.starting || "Старт через"}</div>
                    <div style={{ position: "relative", display: "inline-grid", placeItems: "center" }}>
                        <motion.span key={`ring${countdown}`}
                            initial={{ scale: 0.6, opacity: 0.6 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}
                            style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "4px solid var(--ember-600)" }} />
                        <AnimatePresence mode="wait">
                            <motion.div key={countdown}
                                initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
                                animate={{ scale: [1.5, 1], opacity: 1, rotate: 0 }}
                                exit={{ scale: 2.2, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 320, damping: 14 }}
                                style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, color: "var(--ember-600)" }}>
                                {countdown}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>;
        }
        // Готовим набор слов (особенно AI-подбор)
        if (preparing && !question) {
            return <main style={SCREEN}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    style={{ width: 46, height: 46, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--ember-600)", marginBottom: "var(--sp-4)" }} />
                <div className="muted">{to.preparing || "Готовим набор слов…"}</div>
            </main>;
        }
        // Игра идёт — вопрос
        if (question) {
            const opts = question.options || [];
            const optIsNo = question.dir === "int2no";          // варианты — норвежские слова
            const optLang = hyLang(lang, optIsNo);
            const promptLang = hyLang(lang, !optIsNo);
            return <main style={{ ...SCREEN, justifyContent: "flex-start", paddingTop: "var(--sp-7)" }}>
                <LayoutGroup><div style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
                    {/* Таймер и ряд игроков РЕЗЕРВИРУЮТ высоту и на reveal — чтобы вопрос/варианты не прыгали. */}
                    <div style={{ opacity: reveal ? 0 : 1, pointerEvents: reveal ? "none" : "auto" }}>
                        <TimerBar total={question.time || 15} left={reveal ? 0 : timeLeft} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: "var(--sp-5)", minHeight: 26 }}>
                        {!reveal && (room.players || []).map((p) => <PlayerChip key={p.name} name={p.name} bright={answered.includes(p.name)} />)}
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div key={question.i}
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }}
                            transition={{ duration: 0.22 }}>
                            <div className="muted" style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: "var(--ls-wide)", fontWeight: 700, fontSize: "var(--fs-13)" }}>
                                {to.question || "Вопрос"} {question.i + 1} / {question.total}
                            </div>
                            <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                                lang={promptLang}
                                style={{ fontSize: "clamp(2rem,7vw,3rem)", margin: "var(--sp-3) 0 var(--sp-5)", textAlign: "center", overflowWrap: "break-word", hyphens: "manual" }}>
                                {hyphenate(question.prompt, promptLang)}
                            </motion.h1>
                            <motion.div variants={OPT_LIST} initial="hidden" animate="show"
                                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", rowGap: 40 }}>
                                {opts.map((opt, i) => {
                                    let kind = "idle";
                                    if (reveal) kind = i === reveal.correct ? "correct" : (i === chosen ? "wrong" : "dim");
                                    else if (i === chosen) kind = "selected";
                                    // opacity задаём явно, чтобы текст верного/выбранного не гас при reveal
                                    const revAnim = !reveal ? undefined
                                        : kind === "correct" ? { opacity: 1, scale: [1, 1.08, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 28px var(--success)", "0 0 0 rgba(0,0,0,0)"] }
                                            : kind === "wrong" ? { opacity: 1, x: [0, -9, 9, -6, 6, 0] }
                                                : { opacity: 0.65 };
                                    const voters = reveal ? (reveal.votes?.[question.keys?.[i]] || []) : [];
                                    const topV = voters.slice(0, 2);   // первые 2 — по верхнему бордеру
                                    const botV = voters.slice(2);      // 3-й, 4-й… — по нижнему бордеру
                                    const chipRow = (extra) => ({
                                        position: "absolute", left: 0, right: 0, display: "flex", flexWrap: "wrap",
                                        gap: 4, justifyContent: "center", pointerEvents: "none", ...extra,
                                    });
                                    return <div key={i} style={{ position: "relative" }}>
                                        <motion.button variants={OPT_ITEM} animate={revAnim} lang={optLang}
                                            whileTap={!reveal && chosen == null ? { scale: 0.94 } : undefined}
                                            transition={{ duration: 0.5 }} style={choiceStyle(kind)}
                                            disabled={chosen != null || !!reveal} onClick={(e) => answer(i, e)}>{hyphenate(opt, optLang)}</motion.button>
                                        {/* чипы голосов — по центру бордера кнопки (не накрывают слово) */}
                                        {reveal && topV.length > 0 && (
                                            <div style={chipRow({ top: -11 })}>
                                                {topV.map((n) => <PlayerChip key={n} name={n} bright />)}
                                            </div>
                                        )}
                                        {reveal && botV.length > 0 && (
                                            <div style={chipRow({ bottom: -11 })}>
                                                {botV.map((n) => <PlayerChip key={n} name={n} bright />)}
                                            </div>
                                        )}
                                    </div>;
                                })}
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>

                    {!reveal && chosen != null && <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-4)" }}>{to.waitOthers || "Ждём остальных…"}</p>}

                    {reveal && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "var(--sp-8)" }}>
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 12 }}
                                style={{ textAlign: "center", fontWeight: 900, fontSize: "var(--fs-28)", color: reveal.gained > 0 ? "var(--success)" : "var(--ink-3)", margin: "0 0 var(--sp-5)" }}>
                                {reveal.gained > 0 ? `+${reveal.gained}` : "—"}
                                {reveal.streak >= 2 && <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5, repeat: 1 }} style={{ marginLeft: 10, display: "inline-block" }}>🔥 {reveal.streak}</motion.span>}
                            </motion.div>
                            <div className="panel">
                                <div className="panel__head"><span className="panel__title">{to.leaderboard || "Лидеры"}</span></div>
                                <div className="panel__body">
                                    {reveal.standings.map((st, ri) => (
                                        <motion.div className="setrow" key={st.name} layout
                                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ri * 0.06 }}>
                                            <span className="setrow__ic" style={{ fontWeight: 700 }}>{st.place}</span>
                                            <span className="setrow__meta"><span className="setrow__t">{st.name}{st.streak >= 2 ? ` 🔥${st.streak}` : ""}</span></span>
                                            <b>{st.score}</b>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div></LayoutGroup>
            </main>;
        }
        // Лобби
        const s = room.settings;
        const amHost = !!room.players.find((p) => p.isYou)?.isHost;
        return <main className="shell prof-main">
            <div className="phead">
                <div className="phead__meta">
                    <div className="phead__name">{room.name}</div>
                    <div className="phead__sub">
                        {(to.games?.[s.game]) || s.game} · {s.dir === "int2no" ? (to.dirInt2No || "перевод → норв.") : (to.dirNo2Int || "норв. → перевод")} · {s.count} {to.wordsShort || "сл."}
                        {s.source === "dict" ? ` · ${to.sourceDict || "мои словари"}` : `${s.source === "ai" ? ` · ${to.sourceAi || "AI"}` : ""}${s.level ? ` · ${s.level}` : ""}${s.topic ? ` · ${t.topics?.[s.topic] || s.topic}` : ""}`}
                    </div>
                </div>
                {amHost && <button className="btn btn--ghost" onClick={() => setEditOpen(true)} title={to.roomSettings || "Настройки комнаты"}><Icon n="settings" sm /></button>}
                <button className="btn btn--outline" onClick={() => send({ type: "leave" })}><Icon n="arrow-left" sm /> {to.leave || "Выйти"}</button>
            </div>

            <RoomForm open={editOpen} onClose={() => setEditOpen(false)} t={t} to={to} dicts={dictList}
                title={to.roomSettings || "Настройки комнаты"} confirmLabel={t.save}
                initial={s} initialName={room.name}
                onConfirm={(name, settings) => {
                    send({ type: "update_settings", name, settings });
                    api.setOnlinePrefs(settings).catch(() => {});
                    setEditOpen(false);
                }} />
            <div className="panel">
                <div className="panel__head"><span className="panel__title">{to.players || "Игроки"} {room.players.length}/{s.maxPlayers}</span></div>
                <div className="panel__body">
                    {room.players.map((p) => (
                        <div className="setrow" key={p.name + (p.isYou ? "_you" : "")}>
                            <span className="setrow__ic"><Icon n={p.ready ? "check" : "user"} sm /></span>
                            <span className="setrow__meta">
                                <span className="setrow__t">{p.name}{p.isYou ? ` (${to.you || "вы"})` : ""}{p.isHost ? " ★" : ""}</span>
                                <span className="setrow__d">{p.ready ? (to.ready || "готов") : (to.notReady || "не готов")}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <button className={`btn btn--block btn--lg ${myReady ? "btn--ghost" : "btn--accent"}`} style={{ marginTop: "var(--sp-4)" }}
                onClick={() => send({ type: "ready", ready: !myReady })}>
                {myReady ? (to.cancelReady || "Не готов") : (to.imReady || "Я готов")}
            </button>
            {amHost && (
                <button className="btn btn--primary btn--block" style={{ marginTop: "var(--sp-3)" }}
                    onClick={() => send({ type: "force_start" })}>
                    <Icon n="play" sm /> {to.startNow || "Старт (хост)"}
                </button>
            )}
            {room.players.length < 2 && <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>{to.needPlayers || "Нужно ≥2 игроков"}</p>}
        </main>;
    }

    // Браузер комнат
    return <main className="shell prof-main">
        <div className="phead">
            <div className="phead__meta">
                <div className="phead__name">{to.title || "Онлайн"}</div>
                <div className="phead__sub">{rooms.length} {to.roomsCount || "комнат"}</div>
            </div>
            <button className="btn btn--accent" onClick={() => setCreateOpen(true)}><Icon n="plus" sm /> {to.create || "Создать"}</button>
        </div>
        {rooms.length ? (
            <div className="panel"><div className="panel__body">
                {rooms.map((r) => (
                    <div className="setrow" key={r.id} style={{ cursor: r.state === "lobby" && r.players < r.max ? "pointer" : "default", opacity: r.state === "lobby" ? 1 : 0.55 }}
                        onClick={() => { if (r.state === "lobby" && r.players < r.max) send({ type: "join", roomId: r.id }); }}>
                        <span className="setrow__ic"><Icon n="play" sm /></span>
                        <span className="setrow__meta">
                            <span className="setrow__t">{r.name}</span>
                            <span className="setrow__d">
                                {(to.games?.[r.game]) || r.game} · {r.count} {to.wordsShort || "сл."}{r.source === "dict" ? ` · ${to.sourceDict || "мои словари"}` : `${r.source === "ai" ? ` · ${to.sourceAi || "AI"}` : ""}${r.level ? ` · ${r.level}` : ""}${r.topic ? ` · ${t.topics?.[r.topic] || r.topic}` : ""}`}
                                {r.state !== "lobby" ? ` · ${to.inGame || "идёт игра"}` : ""}
                            </span>
                        </span>
                        <b>{r.players}/{r.max}</b>
                    </div>
                ))}
            </div></div>
        ) : <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>{to.noRooms || "Пока нет открытых комнат"}</p>}

        <RoomForm open={createOpen} onClose={() => setCreateOpen(false)} t={t} to={to} dicts={dictList}
            initial={savedPrefs} onConfirm={(name, settings) => {
                send({ type: "create", name, settings });
                api.setOnlinePrefs(settings).catch(() => {});
                setCreateOpen(false);
            }} />
    </main>;
};

const RoomForm = ({ open, onClose, t, to, initial, initialName = "", title, confirmLabel, onConfirm, dicts = [] }) => {
    const [name, setName] = useState(initialName);
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, ...(initial || {}) });
    useEffect(() => { if (open) { setS({ ...DEFAULT_SETTINGS, ...(initial || {}) }); setName(initialName); } }, [open]); // eslint-disable-line
    const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
    const topics = t.topics || {};

    return <Modal open={open} onClose={onClose} title={title || to.create || "Создать комнату"} footer={<>
        <button className="btn btn--ghost" onClick={onClose}>{t.cancel}</button>
        <button className="btn btn--accent" onClick={() => onConfirm(name, s)}>{confirmLabel || to.create || "Создать"}</button>
    </>}>
        <div className="field"><label className="label">{to.roomName || "Название"}</label>
            <input className="input" value={name} maxLength={40} placeholder={to.roomName || "Название"} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label className="label">{to.direction || "Направление"}</label>
            <select className="input" value={s.dir} onChange={(e) => set("dir", e.target.value)}>
                <option value="no2int">{to.dirNo2Int || "Норвежское → перевод"}</option>
                <option value="int2no">{to.dirInt2No || "Перевод → норвежское"}</option>
            </select></div>
        <div className="field"><label className="label">{to.wordSource || "Источник слов"}</label>
            <select className="input" value={s.source} onChange={(e) => set("source", e.target.value)}>
                <option value="pool">{to.sourcePool || "Общий пул"}</option>
                <option value="dict">{to.sourceDict || "Мои словари"}</option>
                <option value="ai">{to.sourceAi || "AI-подбор"}</option>
            </select></div>
        {s.source === "dict" && (
            <div className="field"><label className="label">{to.dictionary || "Словарь"}</label>
                <select className="input" value={s.dictId} onChange={(e) => set("dictId", e.target.value)}>
                    <option value="">{to.allDicts || "Все словари"}</option>
                    {dicts.map((d) => <option key={d.id} value={d.id}>{d.dictName === "default" ? t.defaultDict : d.dictName} ({d.words?.length || 0})</option>)}
                </select></div>
        )}
        {s.source !== "dict" && <>
            <div className="field"><label className="label">{to.level || "Уровень"}</label>
                <select className="input" value={s.level} onChange={(e) => set("level", e.target.value)}>
                    <option value="">{to.anyLevel || "Любой"}</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select></div>
            <div className="field"><label className="label">{to.topic || "Тема"}</label>
                <select className="input" value={s.topic} onChange={(e) => set("topic", e.target.value)}>
                    <option value="">{to.anyTopic || "Любая"}</option>
                    {Object.keys(topics).map((k) => <option key={k} value={k}>{topics[k]}</option>)}
                </select></div>
        </>}
        <div className="field"><label className="label">{to.words || "Слов"}: {s.count}</label>
            <input type="range" min={3} max={20} value={s.count} onChange={(e) => set("count", +e.target.value)} style={{ width: "100%" }} /></div>
        <div className="field"><label className="label">{to.questionTime || "Время на вопрос"}: {s.qtime}{to.secUnit || "с"}</label>
            <input type="range" min={5} max={30} value={s.qtime} onChange={(e) => set("qtime", +e.target.value)} style={{ width: "100%" }} /></div>
        <div className="field"><label className="label">{to.maxPlayers || "Макс. игроков"}: {s.maxPlayers}</label>
            <input type="range" min={2} max={8} value={s.maxPlayers} onChange={(e) => set("maxPlayers", +e.target.value)} style={{ width: "100%" }} /></div>
        <div className="setrow">
            <span className="setrow__meta"><span className="setrow__t">{to.private || "Приватная"}</span><span className="setrow__d">{to.privateDesc || "Не показывать в списке"}</span></span>
            <span className={`toggle${s.private ? " is-on" : ""}`} onClick={() => set("private", !s.private)} />
        </div>
    </Modal>;
};

export default OnlinePage;
