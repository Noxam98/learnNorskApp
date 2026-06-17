import { useEffect, useRef, useState, useCallback } from "react";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import api from "../components/tools/api.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const DEFAULT_SETTINGS = { game: "quiz", dir: "no2int", level: "", topic: "", count: 7, maxPlayers: 4, private: false };

// Короткий бип через Web Audio (для обратного отсчёта). Без аудио-ассетов.
let _ac = null;
function beep(freq = 880, dur = 0.09) {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        _ac = _ac || new Ctx();
        if (_ac.state === "suspended") _ac.resume();
        const o = _ac.createOscillator(), g = _ac.createGain();
        o.frequency.value = freq; o.connect(g); g.connect(_ac.destination);
        g.gain.setValueAtTime(0.18, _ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + dur);
        o.start(); o.stop(_ac.currentTime + dur);
    } catch { /* no-op */ }
}

export const OnlinePage = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[lang];
    const to = t.online || {};
    const savedPrefs = useAuthStore((s) => s.user?.onlinePrefs);

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
                    setRoom(m.room);
                    if (m.room.state === "lobby") { setCountdown(null); setQuestion(null); setReveal(null); }
                    break;
                case "countdown": setCountdown(m.sec); beep(m.sec === 1 ? 1320 : 880); break;
                case "question": setQuestion(m); setChosen(null); setReveal(null); setPodium(null); setCountdown(null); break;
                case "reveal": setReveal(m); break;
                case "ended": setPodium(m.podium); setQuestion(null); setReveal(null); break;
                case "left": setRoom(null); setQuestion(null); setReveal(null); setPodium(null); setCountdown(null); break;
                case "error": case "game_error":
                    useSystemStore.getState().showToast(to[m.msg] || to.genericError || "—"); break;
                default: break;
            }
        };
        return () => { try { ws.close(); } catch { /* no-op */ } };
    }, [lang]); // eslint-disable-line

    const myReady = room?.players?.find((p) => p.isYou)?.ready;

    const answer = (i) => { if (chosen == null) { setChosen(i); send({ type: "answer", q: question.i, choice: i }); } };

    // ---------- Рендер ----------
    if (!connected) {
        return <main className="shell" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
            <p className="muted">{to.connecting || "…"}</p>
        </main>;
    }

    // Подиум (конец игры) — поверх всего
    if (room && podium) {
        return <main className="shell prof-main"><div className="panel"><div className="panel__head">
            <span className="panel__title">{to.podium || "Итоги"}</span></div>
            <div className="panel__body">
                {podium.map((p) => (
                    <div className="setrow" key={p.name}>
                        <span className="setrow__ic" style={{ fontWeight: 700 }}>{p.place}</span>
                        <span className="setrow__meta"><span className="setrow__t">{p.name}</span></span>
                        <b>{p.score}</b>
                    </div>
                ))}
                <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-4)" }}
                    onClick={() => setPodium(null)}>{to.toLobby || "В лобби"}</button>
            </div></div></main>;
    }

    // В комнате
    if (room) {
        // Обратный отсчёт
        if (countdown != null) {
            return <main className="play" data-state="asking" style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="muted">{to.starting || "Старт через"}</div>
                    <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{countdown}</div>
                </div>
            </main>;
        }
        // Игра идёт — вопрос
        if (question) {
            const opts = question.options || [];
            return <main className="play" data-state="asking" style={{ position: "fixed", inset: 0, zIndex: 90, overflow: "auto" }}>
                <div className="pstage"><div className="qcard">
                    <div className="qcount">{to.question || "Вопрос"} {question.i + 1} / {question.total}</div>
                    <h1 className="qword">{question.prompt}</h1>
                    <div className="choices">
                        {opts.map((opt, i) => {
                            let cls = "";
                            if (reveal) cls = i === reveal.correct ? " is-correct" : (i === chosen ? " is-wrong" : "");
                            else if (i === chosen) cls = " is-selected";
                            return <button key={i} className={`choice${cls}`} disabled={chosen != null || !!reveal}
                                onClick={() => answer(i)}>{opt}</button>;
                        })}
                    </div>
                    {reveal && (
                        <div style={{ marginTop: "var(--sp-4)" }}>
                            <div className="qhint">{reveal.gained > 0 ? `+${reveal.gained}` : "—"}</div>
                            <div className="panel" style={{ marginTop: "var(--sp-3)" }}>
                                <div className="panel__head"><span className="panel__title">{to.leaderboard || "Лидеры"}</span></div>
                                <div className="panel__body">
                                    {reveal.standings.map((s) => (
                                        <div className="setrow" key={s.name}>
                                            <span className="setrow__ic" style={{ fontWeight: 700 }}>{s.place}</span>
                                            <span className="setrow__meta"><span className="setrow__t">{s.name}</span></span>
                                            <b>{s.score}</b>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {!reveal && chosen != null && <div className="qhint" style={{ marginTop: "var(--sp-4)" }}>{to.waitOthers || "Ждём остальных…"}</div>}
                </div></div>
            </main>;
        }
        // Лобби
        const s = room.settings;
        return <main className="shell prof-main">
            <div className="phead">
                <div className="phead__meta">
                    <div className="phead__name">{room.name}</div>
                    <div className="phead__sub">
                        {(to.games?.[s.game]) || s.game} · {s.dir === "int2no" ? (to.dirInt2No || "перевод → норв.") : (to.dirNo2Int || "норв. → перевод")} · {s.count} {to.wordsShort || "сл."}
                        {s.level ? ` · ${s.level}` : ""}{s.topic ? ` · ${t.topics?.[s.topic] || s.topic}` : ""}
                    </div>
                </div>
                <button className="btn btn--outline" onClick={() => send({ type: "leave" })}><Icon n="arrow-left" sm /> {to.leave || "Выйти"}</button>
            </div>
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
                                {(to.games?.[r.game]) || r.game} · {r.count} {to.wordsShort || "сл."}{r.level ? ` · ${r.level}` : ""}{r.topic ? ` · ${t.topics?.[r.topic] || r.topic}` : ""}
                                {r.state !== "lobby" ? ` · ${to.inGame || "идёт игра"}` : ""}
                            </span>
                        </span>
                        <b>{r.players}/{r.max}</b>
                    </div>
                ))}
            </div></div>
        ) : <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>{to.noRooms || "Пока нет открытых комнат"}</p>}

        <CreateRoom open={createOpen} onClose={() => setCreateOpen(false)} t={t} to={to}
            initial={savedPrefs} onCreate={(name, settings) => {
                send({ type: "create", name, settings });
                api.setOnlinePrefs(settings).catch(() => {});
                setCreateOpen(false);
            }} />
    </main>;
};

const CreateRoom = ({ open, onClose, t, to, initial, onCreate }) => {
    const [name, setName] = useState("");
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, ...(initial || {}) });
    useEffect(() => { if (open) setS({ ...DEFAULT_SETTINGS, ...(initial || {}) }); }, [open]); // eslint-disable-line
    const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
    const topics = t.topics || {};

    return <Modal open={open} onClose={onClose} title={to.create || "Создать комнату"} footer={<>
        <button className="btn btn--ghost" onClick={onClose}>{t.cancel}</button>
        <button className="btn btn--accent" onClick={() => onCreate(name, s)}>{to.create || "Создать"}</button>
    </>}>
        <div className="field"><label className="label">{to.roomName || "Название"}</label>
            <input className="input" value={name} maxLength={40} placeholder={to.roomName || "Название"} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label className="label">{to.direction || "Направление"}</label>
            <select className="input" value={s.dir} onChange={(e) => set("dir", e.target.value)}>
                <option value="no2int">{to.dirNo2Int || "Норвежское → перевод"}</option>
                <option value="int2no">{to.dirInt2No || "Перевод → норвежское"}</option>
            </select></div>
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
        <div className="field"><label className="label">{to.words || "Слов"}: {s.count}</label>
            <input type="range" min={3} max={20} value={s.count} onChange={(e) => set("count", +e.target.value)} style={{ width: "100%" }} /></div>
        <div className="field"><label className="label">{to.maxPlayers || "Макс. игроков"}: {s.maxPlayers}</label>
            <input type="range" min={2} max={8} value={s.maxPlayers} onChange={(e) => set("maxPlayers", +e.target.value)} style={{ width: "100%" }} /></div>
        <div className="setrow">
            <span className="setrow__meta"><span className="setrow__t">{to.private || "Приватная"}</span><span className="setrow__d">{to.privateDesc || "Не показывать в списке"}</span></span>
            <span className={`toggle${s.private ? " is-on" : ""}`} onClick={() => set("private", !s.private)} />
        </div>
    </Modal>;
};

export default OnlinePage;
