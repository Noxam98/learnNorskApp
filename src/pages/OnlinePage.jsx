import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import confetti from "canvas-confetti";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { useWordsStore } from "../store/wordStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { StageTimer } from "../components/online/StageTimer.jsx";
import { Countdown } from "../components/online/Countdown.jsx";
import { PlayerTag } from "../components/online/PlayerTag.jsx";
import RaceScreen, { RacePodium } from "../components/online/RaceScreen.jsx";
import { RaceRunner, ANIMAL_LIST, ANIMAL_COLORS, animalLabel } from "../components/online/RaceRunner.jsx";
import api from "../components/tools/api.js";
import { playSound, playWin, preloadSounds } from "../components/tools/sound.js";
import { startRaceMusic, stopRaceMusic, playGallop, playFall } from "../components/tools/raceAudio.js";
import { hyphenate, hyLang } from "../components/ui/hyphenate.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SETTINGS = { game: "quiz", answer: "type", dir: "no2int", source: "pool", dictId: "", level: "", topic: "", count: 7, qtime: 15, maxPlayers: 4, private: false };

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

// Варианты для «игровых» анимаций: стаггер-появление карточек вариантов.
const OPT_LIST = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const OPT_ITEM = { hidden: { opacity: 0, y: 28, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 22 } } };

export const OnlinePage = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const theme = useSystemStore((s) => s.theme);
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
    const [preparing, setPreparing] = useState(false);  // сервер готовит набор слов (AI-подбор)
    const [answered, setAnswered] = useState([]);  // имена ответивших на текущий вопрос
    const answeredRef = useRef([]);
    const roomRef = useRef(null);                   // актуальная комната для колбэков WS
    const [podiumGame, setPodiumGame] = useState("quiz"); // тип игры для подиума
    // --- состояние гонки ---
    const [racePos, setRacePos] = useState([]);     // позиции машин/зверей всех игроков
    const [raceWord, setRaceWord] = useState(null); // моё текущее слово
    const [raceTotal, setRaceTotal] = useState(0);
    const [raceFeedback, setRaceFeedback] = useState(null); // 'right' | 'wrong' | null (вспышка)
    const [raceStreak, setRaceStreak] = useState(0);
    const [raceGrace, setRaceGrace] = useState(null); // {sec, leader} — окно добивания
    const [raceGo, setRaceGo] = useState(false);    // вспышка «Поехали!»
    const fbTimer = useRef(null);

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
                    if (m.room.state === "lobby") {
                        setCountdown(null); setQuestion(null); setReveal(null); setPreparing(false);
                        setRaceWord(null); setRacePos([]); setRaceGrace(null); setRaceGo(false); setRaceFeedback(null); setRaceStreak(0);
                        stopRaceMusic();
                    }
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
                // --- гонка ---
                case "race_go":
                    setRaceTotal(m.total); setPreparing(false); setCountdown(null);
                    setRaceGo(true); startRaceMusic();   // звук старта уже сыграл отсчёт на «1»
                    setTimeout(() => setRaceGo(false), 1100);
                    break;
                case "race_word": setRaceWord(m); break;
                case "race_result": {
                    setRaceFeedback(m.correct ? "right" : "wrong");
                    setRaceStreak((s) => (m.correct ? s + 1 : 0));
                    if (m.correct) playGallop(); else playFall();   // топот / падение
                    if (fbTimer.current) clearTimeout(fbTimer.current);
                    fbTimer.current = setTimeout(() => setRaceFeedback(null), 600);
                    break;
                }
                case "race_pos": setRacePos(m.positions || []); break;
                case "race_grace": setRaceGrace({ sec: m.sec, leader: m.leader, total: m.total || 25 }); break;
                case "ended":
                    setPodium(m.podium); setPodiumGame(m.game || "quiz");
                    setQuestion(null); setReveal(null); setPreparing(false);
                    setRaceWord(null); setRaceGrace(null); setRaceGo(false); stopRaceMusic();
                    break;
                case "left":
                    setRoom(null); setQuestion(null); setReveal(null); setPodium(null); setCountdown(null); setPreparing(false);
                    setRaceWord(null); setRacePos([]); setRaceGrace(null); setRaceGo(false); stopRaceMusic();
                    break;
                case "error": case "game_error":
                    useSystemStore.getState().showToast(to[m.msg] || to.genericError || "—"); break;
                default: break;
            }
        };
        return () => { stopRaceMusic(); try { ws.close(); } catch { /* no-op */ } };
    }, [lang]); // eslint-disable-line

    const myReady = room?.players?.find((p) => p.isYou)?.ready;

    const answer = (i, ev) => {
        if (chosen != null || reveal) return;
        if (ev?.currentTarget?.blur) ev.currentTarget.blur();   // на смартфоне снимаем фокус с кнопки
        playSound("select");
        setChosen(i);
        send({ type: "answer", q: question.i, choice: i });
    };

    // Ответ в гонке: payload {token, text} (печать) или {token, choice} (выбор)
    const answerRace = useCallback((payload) => { send({ type: "answer", ...payload }); }, [send]);

    // Аудио предзагружаем при входе в комнату — к старту игры всё закешировано.
    useEffect(() => { if (room) preloadSounds(); }, [room?.id]); // eslint-disable-line

    // Новый вопрос — снять фокус с кнопки прошлого экрана (иначе на мобиле она подсвечена).
    useEffect(() => {
        if (question && document.activeElement?.blur) document.activeElement.blur();
    }, [question?.i]);

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

    // Подиум гонки — собственный визуал (зверюшки/места по прогрессу)
    if (room && podium && podiumGame === "race") {
        const meName = room.players?.find((p) => p.isYou)?.name;
        return <RacePodium podium={podium} lang={lang} theme={theme} meName={meName} onLobby={() => { setPodium(null); }} />;
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
        // Обратный отсчёт — переиспользуемый компонент
        if (countdown != null) {
            return <main style={SCREEN}><Countdown sec={countdown} label={to.starting || "Старт через"} /></main>;
        }
        // Гонка слов — отдельный экран (дорожки + поле ответа + оверлеи).
        // Не завязываемся на room.state: сервер для играющих не шлёт room-detail
        // со state=playing (только список комнат) — ориентируемся на данные гонки.
        if (room.settings.game === "race" && (raceWord || racePos.length || raceGo)) {
            return <RaceScreen positions={racePos} total={raceTotal} word={raceWord}
                feedback={raceFeedback} streak={raceStreak} grace={raceGrace} goFlash={raceGo}
                lang={lang} theme={theme} roomName={room.name}
                onAnswer={answerRace} onExit={() => send({ type: "leave" })} />;
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
                        <StageTimer seconds={question.time || 15} runKey={question.i} paused={!!reveal} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: "var(--sp-5)", minHeight: 26 }}>
                        {!reveal && (room.players || []).map((p) => <PlayerTag key={p.name} name={p.name} dim={!answered.includes(p.name)} />)}
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
                                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                                {opts.map((opt, i) => {
                                    let kind = "idle";
                                    if (reveal) kind = i === reveal.correct ? "correct" : (i === chosen ? "wrong" : "dim");
                                    else if (i === chosen) kind = "selected";
                                    const revAnim = !reveal ? undefined
                                        : kind === "correct" ? { opacity: 1, scale: [1, 1.05, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 24px var(--success)", "0 0 0 rgba(0,0,0,0)"] }
                                            : kind === "wrong" ? { opacity: 1, x: [0, -8, 8, -5, 5, 0] }
                                                : { opacity: 0.6 };
                                    const voters = reveal ? (reveal.votes?.[question.keys?.[i]] || []) : [];
                                    // Слово — сверху; аватарки выбравших — в зарезервированной полосе СНИЗУ кнопки
                                    // (всегда есть, поэтому высота кнопки постоянна и ничего не прыгает; слово не перекрыто).
                                    return <motion.button key={i} variants={OPT_ITEM} animate={revAnim} lang={optLang}
                                        whileTap={!reveal && chosen == null ? { scale: 0.94 } : undefined}
                                        transition={{ duration: 0.5 }}
                                        style={{ ...choiceStyle(kind), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 72 }}
                                        disabled={chosen != null || !!reveal} onClick={(e) => answer(i, e)}>
                                        <span style={{ flex: 1, display: "flex", alignItems: "center" }}>{hyphenate(opt, optLang)}</span>
                                        <span style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", alignItems: "center", minHeight: 24, width: "100%" }}>
                                            {reveal && voters.map((n) => <PlayerTag key={n} name={n} />)}
                                        </span>
                                    </motion.button>;
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
        // AI-набор готовится → «Готов»/старт заблокированы, на кнопке статус + лоадер
        const aiBusy = s.source === "ai" && room.aiStatus && room.aiStatus !== "ready";
        const aiStatusLabel = room.aiStatus === "indexing" ? (to.aiIndexing || "Индексация слов…")
            : room.aiStatus === "error" ? (to.aiError || "Ошибка генерации")
                : (to.aiGenerating || "Нейросеть подбирает слова…");
        const spinner = <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", display: "inline-block", verticalAlign: "-3px" }} />;
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

            <RoomForm open={editOpen} onClose={() => setEditOpen(false)} theme={theme} t={t} to={to} dicts={dictList}
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
                            <span className="setrow__ic">
                                {s.game === "race" && p.animal
                                    ? <span style={{ width: 22, height: 22, display: "inline-grid", placeItems: "center", borderRadius: 7, background: ANIMAL_COLORS[p.animal], color: "#fff", fontSize: 11, fontWeight: 800 }}>{(p.name || "·").charAt(0).toUpperCase()}</span>
                                    : <Icon n={p.ready ? "check" : "user"} sm />}
                            </span>
                            <span className="setrow__meta">
                                <span className="setrow__t">{p.name}{p.isYou ? ` (${to.you || "вы"})` : ""}{p.isHost ? " ★" : ""}{s.game === "race" && p.animal ? ` · ${animalLabel(p.animal, lang)}` : ""}</span>
                                <span className="setrow__d">{p.ready ? (to.ready || "готов") : (to.notReady || "не готов")}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {s.game === "race" && (() => {
                const myAnimal = room.players.find((p) => p.isYou)?.animal;
                return (
                    <div className="panel" style={{ marginTop: "var(--sp-3)" }}>
                        <div className="panel__head"><span className="panel__title">{to.chooseRunner || "Выбери бегуна"}</span></div>
                        <div className="panel__body">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                {ANIMAL_LIST.map((a) => {
                                    const sel = a === myAnimal;
                                    return (
                                        <button key={a} onClick={() => send({ type: "pick_animal", animal: a })}
                                            style={{
                                                position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                                                padding: "12px 6px 8px", borderRadius: 14, cursor: "pointer",
                                                background: "var(--surface)", color: "var(--ink-2)",
                                                border: `2px solid ${sel ? "var(--ember-600)" : "var(--border)"}`,
                                                boxShadow: sel ? "0 0 0 3px color-mix(in srgb, var(--ember-600) 22%, transparent)" : "none",
                                            }}>
                                            <span style={{ height: 44, display: "flex", alignItems: "flex-end" }}>
                                                <RaceRunner state="neutral" animal={a} color={ANIMAL_COLORS[a]} />
                                            </span>
                                            <span style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: sel ? "var(--ink)" : "var(--ink-2)" }}>{animalLabel(a, lang)}</span>
                                            {sel && <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "var(--ember-600)", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}>✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}
            {room.aiStatus === "error" && amHost ? (
                // ошибка генерации → хост может повторить
                <button className="btn btn--accent btn--block btn--lg" style={{ marginTop: "var(--sp-4)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    onClick={() => send({ type: "retry_ai" })}>
                    <Icon n="play" sm /> {to.aiRetry || "Повторить генерацию"}
                </button>
            ) : (
                <button className={`btn btn--block btn--lg ${aiBusy ? "btn--accent" : myReady ? "btn--ghost" : "btn--accent"}`}
                    style={{ marginTop: "var(--sp-4)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    disabled={aiBusy}
                    onClick={() => !aiBusy && send({ type: "ready", ready: !myReady })}>
                    {aiBusy
                        ? <>{room.aiStatus !== "error" && spinner} {aiStatusLabel}</>
                        : (myReady ? (to.cancelReady || "Не готов") : (to.imReady || "Я готов"))}
                </button>
            )}
            {amHost && (
                <button className="btn btn--primary btn--block" style={{ marginTop: "var(--sp-3)" }}
                    disabled={aiBusy}
                    onClick={() => !aiBusy && send({ type: "force_start" })}>
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

        <RoomForm open={createOpen} onClose={() => setCreateOpen(false)} theme={theme} t={t} to={to} dicts={dictList}
            initial={savedPrefs} onConfirm={(name, settings) => {
                send({ type: "create", name, settings });
                api.setOnlinePrefs(settings).catch(() => {});
                setCreateOpen(false);
            }} />
    </main>;
};

// ---------- Контролы окна создания комнаты (адаптация дизайн-макета room-modal) ----------
const Field = ({ label, hint, dep, children }) => (
    <div className={"rf" + (dep ? " rf--dep" : "")}>
        <div className="rf__lbl">{dep && <span className="rf__link" aria-hidden="true">↳</span>}<span className="rf__lbltxt">{label}</span>{hint && <span className="rf__hint">{hint}</span>}</div>
        {children}
    </div>
);

const Seg = ({ value, options, onChange }) => (
    <div className="rmseg" role="radiogroup">
        {options.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
                className={"rmseg__btn" + (o.value === value ? " is-on" : "")} onClick={() => onChange(o.value)}>
                {o.icon && <span className="rmseg__i" aria-hidden="true">{o.icon}</span>}<span className="rmseg__t">{o.label}</span>
            </button>
        ))}
    </div>
);

const ModeSeg = ({ value, onChange, cards }) => (
    <div className="rmmode" role="radiogroup">
        {cards.map((c) => (
            <button key={c.value} type="button" role="radio" aria-checked={c.value === value}
                className={"rmmode__card" + (c.value === value ? " is-on" : "")} onClick={() => onChange(c.value)}>
                <span className="rmmode__emoji" aria-hidden="true">{c.emoji}</span>
                <span className="rmmode__body"><b>{c.label}</b><span>{c.desc}</span></span>
                <span className="rmmode__tick" aria-hidden="true">✓</span>
            </button>
        ))}
    </div>
);

const RSlider = ({ value, min, max, step = 1, unit, onChange }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="rslider">
            <input type="range" min={min} max={max} step={step} value={value} style={{ "--pct": pct + "%" }} onChange={(e) => onChange(Number(e.target.value))} />
            <span className="rslider__val">{value}{unit ? <i>{unit}</i> : null}</span>
        </div>
    );
};

const RToggle = ({ value, onChange, label, desc }) => (
    <button type="button" className="rtoggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
        <span className="rtoggle__txt"><b>{label}</b><span>{desc}</span></span>
        <span className={"rtoggle__sw" + (value ? " is-on" : "")}><span className="rtoggle__knob" /></span>
    </button>
);

const Reveal = ({ open, children }) => (
    <div className={"reveal" + (open ? " is-open" : "")} aria-hidden={!open}><div className="reveal__in">{children}</div></div>
);

// Кастомный дропдаун с поповером (fixed — не режется overflow модалки)
const Sel = ({ value, options, onChange, placeholder }) => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [pop, setPop] = useState(null);
    const ref = useRef(null);
    const sel = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) { setPop(null); return; }
        const place = () => {
            const el = ref.current; if (!el) return;
            const r = el.getBoundingClientRect();
            const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
            const up = below < 220 && above > below;
            setPop({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, maxH: Math.min(280, Math.max(160, up ? above : below)), up });
        };
        place();
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest(".dd__pop")) setOpen(false); };
        // скролл страницы/тела модалки — двигаем поповер за триггером (не закрываем);
        // скролл внутри самого списка игнорируем
        const onScroll = (e) => { if (e.target?.closest?.(".dd__pop")) return; place(); };
        const onResize = () => setOpen(false);
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("touchstart", onDoc);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("touchstart", onDoc);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [open]); // eslint-disable-line

    const choose = (v) => { onChange(v); setOpen(false); };
    return (
        <div className={"dd" + (open ? " is-open" : "")} ref={ref}>
            <button type="button" className="dd__trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="dd__val">
                    {sel ? <>{sel.emoji && <span className="dd__emoji">{sel.emoji}</span>}<span className="dd__valtxt">{sel.label}</span>{sel.sub && <span className="dd__valsub">{sel.sub}</span>}</>
                        : <span className="dd__placeholder">{placeholder || "—"}</span>}
                </span>
                <span className="dd__chev" aria-hidden="true"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </button>
            {open && pop && (
                <div className={"dd__pop" + (pop.up ? " dd__pop--up" : "")} role="listbox"
                    style={{ left: pop.left, top: pop.top, width: pop.width, maxHeight: pop.maxH, transform: pop.up ? "translateY(-100%)" : "none" }}>
                    {options.map((o, i) => (
                        <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                            className={"dd__opt" + (o.value === value ? " is-sel" : "") + (i === active ? " is-active" : "")}
                            onMouseEnter={() => setActive(i)} onClick={() => choose(o.value)}>
                            {o.emoji && <span className="dd__optemoji">{o.emoji}</span>}
                            <span className="dd__opttxt">{o.label}</span>
                            {o.sub && <span className="dd__optsub">{o.sub}</span>}
                            {o.value === value && <span className="dd__check" aria-hidden="true">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const RoomForm = ({ open, onClose, theme, t, to, initial, initialName = "", title, confirmLabel, onConfirm, dicts = [] }) => {
    const [name, setName] = useState(initialName);
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, ...(initial || {}) });
    const topics = t.topics || {};
    // своя тема: s.topic держит финальное значение (свободный текст), customMode — только UI
    const [customMode, setCustomMode] = useState(false);
    useEffect(() => {
        if (open) {
            const init = { ...DEFAULT_SETTINGS, ...(initial || {}) };
            setS(init); setName(initialName);
            setCustomMode(!!init.topic && !topics[init.topic]);
        }
    }, [open]); // eslint-disable-line
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]); // eslint-disable-line
    if (!open) return null;
    const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
    const setSource = (v) => setS((p) => {
        const next = { ...p, source: v };
        if (v !== "ai" && customMode) { setCustomMode(false); next.topic = ""; }
        return next;
    });

    const showLevelTheme = s.source !== "dict";
    const isAI = s.source === "ai";
    const topicVal = s.topic || "";   // бэкенд может вернуть null
    const invalid = customMode && isAI && !topicVal.trim();

    const levelOpts = [{ value: "", label: to.anyLevel || "Любой" }, ...LEVELS.map((l) => ({ value: l, label: l }))];
    const themeOpts = [{ value: "", label: to.anyTopic || "Любая" },
        ...Object.keys(topics).map((k) => ({ value: k, label: topics[k] })),
        ...(isAI ? [{ value: "__custom__", label: (to.customTopic || "Своя тема").replace("✏️ ", ""), emoji: "✏️" }] : [])];
    const dictOpts = [{ value: "", label: to.allDicts || "Все словари" },
        ...dicts.map((d) => ({ value: String(d.id), label: d.dictName === "default" ? t.defaultDict : d.dictName, sub: `${d.words?.length || 0} ${to.wordsShort || "сл."}` }))];

    return (
        <div className="roomwrap" data-theme={theme} style={{ zIndex: 100 }}>
            <div className="scrim" onClick={onClose} />
            <div className="modal" role="dialog" aria-modal="true">
                <div className="modal__head">
                    <h2 className="modal__title">{title || to.create || "Создать комнату"}</h2>
                    <button className="modal__x" aria-label={t.cancel} onClick={onClose}>✕</button>
                </div>
                <div className="modal__body">
                    {/* Группа 1 — что играем */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secWhat || "Что играем"}</div>
                        <div className="grp">
                            <Field label={to.roomName || "Название"}>
                                <input className="rtext" maxLength={40} placeholder={to.roomName || "Название"} value={name} onChange={(e) => setName(e.target.value)} />
                                <span className="rtext__count">{name.length}/40</span>
                            </Field>
                            <Field label={to.gameType || "Режим игры"}>
                                <ModeSeg value={s.game} onChange={(v) => set("game", v)} cards={[
                                    { value: "quiz", emoji: "🎯", label: to.games?.quiz || "Викторина", desc: to.quizDesc || "" },
                                    { value: "race", emoji: "🦊", label: to.games?.race || "Гонка слов", desc: to.raceDesc || "" },
                                ]} />
                            </Field>
                            <Reveal open={s.game === "race"}>
                                <Field label={to.answerMode || "Ответ"} dep>
                                    <Seg value={s.answer} onChange={(v) => set("answer", v)} options={[
                                        { value: "type", label: to.answerType || "Печать", icon: "⌨" },
                                        { value: "choice", label: to.answerChoice || "Выбор", icon: "☰" },
                                    ]} />
                                </Field>
                            </Reveal>
                            <Field label={to.direction || "Направление"}>
                                <Seg value={s.dir} onChange={(v) => set("dir", v)} options={[
                                    { value: "no2int", label: to.dirNo2Int || "Норв. → перевод", icon: "🇳🇴" },
                                    { value: "int2no", label: to.dirInt2No || "Перевод → норв.", icon: "🔤" },
                                ]} />
                            </Field>
                        </div>
                    </section>

                    {/* Группа 2 — откуда слова */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secWords || "Откуда слова"}</div>
                        <div className="grp">
                            <Field label={to.wordSource || "Источник слов"}>
                                <Seg value={s.source} onChange={setSource} options={[
                                    { value: "pool", label: to.sourcePool || "Пул", icon: "🌐" },
                                    { value: "dict", label: to.sourceDict || "Словари", icon: "📚" },
                                    { value: "ai", label: to.sourceAi || "AI", icon: "✨" },
                                ]} />
                            </Field>
                            <Reveal open={s.source === "dict"}>
                                <Field label={to.dictionary || "Словарь"} dep>
                                    <Sel value={String(s.dictId || "")} options={dictOpts} onChange={(v) => set("dictId", v)} />
                                </Field>
                            </Reveal>
                            <Reveal open={showLevelTheme}>
                                <div className="rf rf--dep">
                                    <div className="rf__lbl"><span className="rf__link" aria-hidden="true">↳</span><span className="rf__lbltxt">{to.level || "Уровень"} · {to.topic || "Тема"}</span></div>
                                    <div className="rcols">
                                        <Sel value={s.level || ""} options={levelOpts} onChange={(v) => set("level", v)} />
                                        <Sel value={customMode ? "__custom__" : topicVal} options={themeOpts} onChange={(v) => {
                                            if (v === "__custom__") { setCustomMode(true); set("topic", ""); }
                                            else { setCustomMode(false); set("topic", v); }
                                        }} />
                                    </div>
                                    <Reveal open={customMode && isAI}>
                                        <div className="rcustom">
                                            <input className={"rtext" + (invalid ? " is-invalid" : "")} maxLength={60} placeholder={to.customTopicPh || ""}
                                                value={topicVal} onChange={(e) => set("topic", e.target.value)} />
                                            <span className="rtext__count">{topicVal.length}/60</span>
                                            <div className="rcustom__hint">✨ {to.aiHint || ""}</div>
                                        </div>
                                    </Reveal>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* Группа 3 — параметры партии */}
                    <section className="grpwrap">
                        <div className="grp__h">{to.secParty || "Параметры партии"}</div>
                        <div className="grp">
                            <Field label={to.words || "Слов"}><RSlider value={s.count} min={3} max={20} onChange={(v) => set("count", v)} /></Field>
                            <Reveal open={s.game !== "race"}>
                                <Field label={to.questionTime || "Время на вопрос"} dep><RSlider value={s.qtime} min={5} max={30} unit={to.secUnit || "с"} onChange={(v) => set("qtime", v)} /></Field>
                            </Reveal>
                            <Field label={to.maxPlayers || "Макс. игроков"}><RSlider value={s.maxPlayers} min={2} max={8} onChange={(v) => set("maxPlayers", v)} /></Field>
                            <RToggle value={s.private} onChange={(v) => set("private", v)} label={to.private || "Приватная"} desc={to.privateDesc || "Не показывать в списке"} />
                        </div>
                    </section>
                </div>
                <div className="modal__foot">
                    <button className="rmbtn rmbtn--ghost" onClick={onClose}>{t.cancel}</button>
                    <button className="rmbtn rmbtn--primary" disabled={invalid} onClick={() => !invalid && onConfirm(name, s)}>{confirmLabel || to.create || "Создать"}</button>
                </div>
            </div>
        </div>
    );
};

export default OnlinePage;
