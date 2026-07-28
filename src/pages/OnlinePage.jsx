import { useEffect, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig, useReducedMotion } from "framer-motion";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { StageTimer } from "../components/online/StageTimer.jsx";
import { Countdown } from "../components/online/Countdown.jsx";
import { PlayerTag } from "../components/online/PlayerTag.jsx";
import RaceScreen, { RacePodium } from "../components/online/RaceScreen.jsx";
import { RaceRunner, ANIMAL_LIST, ANIMAL_COLORS, animalLabel } from "../components/online/RaceRunner.jsx";
import { RoomForm } from "../components/online/RoomForm.jsx";
import api from "../components/tools/api.js";
import { playWin, preloadSounds } from "../components/tools/sound.js";
import { hyphenate, hyLang } from "../components/ui/hyphenate.js";
import { useOnlineGame } from "./useOnlineGame.js";

const sourceMeta = (s, to, t) => {
    if (s.source === "dict") return s.dictName || s.sourceName || to.sourceDict || "Мой набор";
    if (s.source === "selected") return to.sourceSelected || "Выбрано вручную";
    return [s.level, s.topic ? (t.topics?.[s.topic] || s.topic) : null].filter(Boolean).join(" · ")
        || to.anyTopic || "Любая тема";
};

// Точный ручной список относится к одной комнате: не подставляем его молча в следующую.
const saveOnlinePrefs = (settings) => {
    let prefs = { ...settings, poolIds: [], dictPoolIds: [] };
    if (settings.source === "selected") prefs = { ...prefs, source: "pool", count: 7 };
    if (settings.source === "dict" && settings.dictMode === "selected") {
        prefs = { ...prefs, dictMode: "random", count: 7 };
    }
    api.setOnlinePrefs(prefs).catch(() => {});
};


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
// canvas-confetti грузим лениво — только когда реально салютуем.
function fireConfetti() {
    import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 90, startVelocity: 45, origin: { y: 0.35 } });
        const end = Date.now() + 1200;
        (function frame() {
            confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
            confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    }).catch(() => { /* */ });
}

// Варианты для «игровых» анимаций: стаггер-появление карточек вариантов.
const OPT_LIST = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const OPT_ITEM = { hidden: { opacity: 0, y: 28, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 22 } } };

// Лёгкий оверлей поверх сохранённого экрана: соединение временно потеряно, идёт реконнект.
// Не заменяет весь UI (стейт игры/лобби сохранён), лишь сообщает о переподключении.
function ReconnectingOverlay({ label }) {
    return (
        <div role="status" aria-live="polite" style={{ position: "fixed", left: 0, right: 0, top: "calc(env(safe-area-inset-top, 0px) + 10px)", display: "flex", justifyContent: "center", zIndex: 9999, pointerEvents: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", fontSize: "var(--fs-13)", fontWeight: 700 }}>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                    style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--ember-600)", display: "inline-block" }} />
                {label}
            </div>
        </div>
    );
}

export const OnlinePage = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const theme = useSystemStore((s) => s.theme);
    const t = interfaceTranslate[lang];
    const to = t.online || {};
    const savedPrefs = useAuthStore((s) => s.user?.onlinePrefs);

    // Вся сетевая логика и игровое состояние — в контроллере useOnlineGame (см. useOnlineGame.js).
    const {
        status, rooms, room, countdown, question, chosen, reveal, podium, podiumGame,
        preparing, answered, racePos, raceWord, raceTotal, raceFeedback, raceStreak, raceGrace, raceGo,
        raceRecover,
        send, answer, answerRace, recoverRace, setPodium, reconnect,
    } = useOnlineGame(lang, to);
    const reduce = useReducedMotion();   // prefers-reduced-motion → гасим салют/крупные анимации
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const myReady = room?.players?.find((p) => p.isYou)?.ready;

    // Аудио предзагружаем при входе в комнату — к старту игры всё закешировано.
    useEffect(() => { if (room) preloadSounds(); }, [room?.id]); // eslint-disable-line

    // Новый вопрос — снять фокус с кнопки прошлого экрана (иначе на мобиле она подсвечена).
    useEffect(() => {
        if (question && document.activeElement?.blur) document.activeElement.blur();
    }, [question?.i]);

    // Салют синхронно с выездом первого места на подиуме (строки появляются со стаггером).
    useEffect(() => {
        if (!podium) return;
        const id = setTimeout(() => { if (!reduce) fireConfetti(); playWin(); }, 400);
        return () => clearTimeout(id);
    }, [podium, reduce]);

    // ---------- Рендер ----------
    // Экраны считаем в content, поверх — лёгкий оверлей «переподключение…» (стейт сохранён, не сбрасываем).
    const content = (() => {
    // Самый первый коннект — полноэкранный спиннер (в стиле экрана подготовки набора).
    if (status === "connecting") {
        return <main style={SCREEN}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                style={{ width: 46, height: 46, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--ember-600)", marginBottom: "var(--sp-4)" }} />
            <div className="muted">{to.connecting || "Подключение…"}</div>
        </main>;
    }

    // Фатальный обрыв (4401/4409): авто-реконнекта нет — терминальный экран с ручной кнопкой.
    if (status === "dropped") {
        return <main style={SCREEN}>
            <Icon n="globe" style={{ width: 40, height: 40, color: "var(--ink-3)", marginBottom: "var(--sp-3)" }} />
            <div style={{ fontWeight: 800, marginBottom: "var(--sp-2)" }}>{to.connLost || "Связь потеряна"}</div>
            <button className="btn btn--accent" onClick={reconnect}>
                <Icon n="repeat" sm /> {to.reconnectBtn || "Переподключиться"}
            </button>
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
            // Для гонки отсчёт рисуем внутри лесного .race-контейнера — цельный вход в гонку
            // (без резкой смены «плоское лобби → лес»).
            if (room?.settings?.game === "race") {
                return <div className="race" data-theme={theme} style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center" }}>
                    <Countdown sec={countdown} label={to.starting || "Старт через"} />
                </div>;
            }
            return <main style={SCREEN}><Countdown sec={countdown} label={to.starting || "Старт через"} /></main>;
        }
        // Гонка слов — отдельный экран (дорожки + поле ответа + оверлеи).
        // Не завязываемся на room.state: сервер для играющих не шлёт room-detail
        // со state=playing (только список комнат) — ориентируемся на данные гонки.
        if (room?.settings?.game === "race" && (raceWord || racePos.length || raceGo)) {
            return <RaceScreen positions={racePos} total={raceTotal} word={raceWord}
                feedback={raceFeedback} streak={raceStreak} grace={raceGrace} goFlash={raceGo}
                recover={raceRecover} onRecover={recoverRace}
                lang={lang} theme={theme} roomName={room.name}
                onAnswer={answerRace} onExit={() => send({ type: "leave" })} />;
        }
        // Сервер собирает вопросы и дистракторы из выбранных слов Базы.
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
                                    // keys теперь приходят в сообщении reveal, а не в вопросе (контракт бэка).
                                    const voters = reveal ? (reveal.votes?.[reveal.keys?.[i]] || []) : [];
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
                            <motion.div role="status" aria-live="assertive" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 12 }}
                                style={{ textAlign: "center", fontWeight: 900, fontSize: "var(--fs-28)", color: reveal.gained > 0 ? "var(--success)" : "var(--danger)", margin: "0 0 var(--sp-5)" }}>
                                {/* Текст «Верно/Неверно» — не только цвет (доступность). */}
                                {reveal.gained > 0 ? `${to.answerCorrect || "Верно"} +${reveal.gained}` : (to.answerWrong || "Неверно")}
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
        const s = room.settings || {};
        const roster = room.players || [];
        const amHost = !!roster.find((p) => p.isYou)?.isHost;
        const enoughPlayers = roster.length >= 2;   // «Готов»/старт бессмысленны в одиночку
        return <main className="shell prof-main">
            <div className="phead">
                <div className="phead__meta">
                    <div className="phead__name">{room.name}</div>
                    <div className="phead__sub">
                        {(to.games?.[s.game]) || s.game} · {s.dir === "int2no" ? (to.dirInt2No || "перевод → норв.") : (to.dirNo2Int || "норв. → перевод")} · {s.count} {to.wordsShort || "сл."}
                        {` · ${sourceMeta(s, to, t)}`}
                    </div>
                </div>
                {amHost && <button className="btn btn--ghost" onClick={() => setEditOpen(true)} title={to.roomSettings || "Настройки комнаты"}><Icon n="settings" sm /></button>}
                <button className="btn btn--outline" onClick={() => send({ type: "leave" })}><Icon n="arrow-left" sm /> {to.leave || "Выйти"}</button>
            </div>

            <RoomForm open={editOpen} onClose={() => setEditOpen(false)} theme={theme} lang={lang} t={t} to={to}
                title={to.roomSettings || "Настройки комнаты"} confirmLabel={t.save}
                initial={s} initialName={room.name}
                onConfirm={(name, settings) => {
                    send({ type: "update_settings", name, settings });
                    saveOnlinePrefs(settings);
                    setEditOpen(false);
                }} />
            <div className="panel">
                <div className="panel__head"><span className="panel__title">{to.players || "Игроки"} {roster.length}/{s.maxPlayers}</span></div>
                <div className="panel__body">
                    {roster.map((p) => (
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
                const myAnimal = roster.find((p) => p.isYou)?.animal;
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
            <button className={`btn btn--block btn--lg ${myReady ? "btn--ghost" : "btn--accent"}`}
                style={{ marginTop: "var(--sp-4)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                disabled={!enoughPlayers}
                onClick={() => enoughPlayers && send({ type: "ready", ready: !myReady })}>
                {myReady ? (to.cancelReady || "Не готов") : (to.imReady || "Я готов")}
            </button>
            {amHost && (
                <button className="btn btn--primary btn--block" style={{ marginTop: "var(--sp-3)" }}
                    disabled={!enoughPlayers}
                    onClick={() => enoughPlayers && send({ type: "force_start" })}>
                    <Icon n="play" sm /> {to.startNow || "Старт (хост)"}
                </button>
            )}
            {!enoughPlayers && <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-3)" }}>{to.needPlayers || "Нужно ≥2 игроков"}</p>}
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
                {rooms.map((r) => {
                    const isOpen = r.state === "lobby" && r.players < r.max;
                    // Полная/идущая комната кликается впустую → бейдж + приглушение, клик заблокирован.
                    const badge = r.state !== "lobby" ? (to.inGame || "идёт игра")
                        : (r.players >= r.max ? (to.full || "заполнено") : null);
                    return (
                        <div className="setrow" key={r.id} aria-disabled={!isOpen}
                            style={{ cursor: isOpen ? "pointer" : "default", opacity: isOpen ? 1 : 0.55 }}
                            onClick={() => { if (isOpen) send({ type: "join", roomId: r.id }); }}>
                            <span className="setrow__ic"><Icon n="play" sm /></span>
                            <span className="setrow__meta">
                                <span className="setrow__t">{r.name}</span>
                                <span className="setrow__d">
                                    {(to.games?.[r.game]) || r.game} · {r.count} {to.wordsShort || "сл."} · {sourceMeta(r, to, t)}
                                </span>
                            </span>
                            {badge && <span style={{ fontSize: "var(--fs-11)", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--surface-3)", color: "var(--ink-3)", whiteSpace: "nowrap", marginRight: 6 }}>{badge}</span>}
                            <b>{r.players}/{r.max}</b>
                        </div>
                    );
                })}
            </div></div>
        ) : (
            // Пустое состояние — единый паттерн: иконка + заголовок + подсказка + акцентная кнопка.
            <div style={{ textAlign: "center", padding: "var(--sp-8) var(--sp-4)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)" }}>
                <Icon n="globe" style={{ width: 48, height: 48, color: "var(--ink-3)" }} />
                <h2 style={{ margin: 0, fontSize: "var(--fs-20)" }}>{to.noRooms || "Пока нет открытых комнат"}</h2>
                <p className="muted" style={{ margin: 0, maxWidth: 320 }}>{to.noRoomsHint || "Создайте комнату и позовите друзей."}</p>
                <button className="btn btn--accent btn--lg" style={{ marginTop: "var(--sp-3)" }} onClick={() => setCreateOpen(true)}>
                    <Icon n="plus" sm /> {to.create || "Создать комнату"}
                </button>
            </div>
        )}

        <RoomForm open={createOpen} onClose={() => setCreateOpen(false)} theme={theme} lang={lang} t={t} to={to}
            initial={savedPrefs} onConfirm={(name, settings) => {
                send({ type: "create", name, settings });
                saveOnlinePrefs(settings);
                setCreateOpen(false);
            }} />
    </main>;
    })();

    // MotionConfig reducedMotion="user" глушит transform/layout-анимации всего дерева онлайна
    // (Countdown/StageTimer/PlayerTag/варианты) при prefers-reduced-motion — один узел вместо правок в каждом.
    return <MotionConfig reducedMotion="user">
        {content}
        {status === "reconnecting" && <ReconnectingOverlay label={to.reconnecting || "Переподключение…"} />}
    </MotionConfig>;
};


export default OnlinePage;
