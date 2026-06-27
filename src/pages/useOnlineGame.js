// Контроллер раздела «Онлайн»: WebSocket-соединение и разбор протокола (комнаты / квиз / гонка)
// в состояние + действия поверх send. Вся сетевая логика и игровое состояние — здесь;
// OnlinePage.jsx остаётся чистым набором экранов. Вынесено из OnlinePage.jsx.
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../components/tools/api.js";
import { useSystemStore } from "../store/systemStore.jsx";
import { playSound } from "../components/tools/sound.js";
import { startRaceMusic, stopRaceMusic, playGallop, playFall } from "../components/tools/raceAudio.js";

export function useOnlineGame(lang, to) {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [room, setRoom] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [question, setQuestion] = useState(null);
    const [chosen, setChosen] = useState(null);
    const [reveal, setReveal] = useState(null);
    const [podium, setPodium] = useState(null);
    const [preparing, setPreparing] = useState(false);  // сервер готовит набор слов (AI-подбор)
    const [answered, setAnswered] = useState([]);  // имена ответивших на текущий вопрос
    const answeredRef = useRef([]);
    const roomRef = useRef(null);                   // актуальная комната для колбэков WS
    const [podiumGame, setPodiumGame] = useState("quiz"); // тип игры для подиума

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

    const answer = (i, ev) => {
        if (chosen != null || reveal) return;
        if (ev?.currentTarget?.blur) ev.currentTarget.blur();   // на смартфоне снимаем фокус с кнопки
        playSound("select");
        setChosen(i);
        send({ type: "answer", q: question.i, choice: i });
    };

    // Ответ в гонке: payload {token, text} (печать) или {token, choice} (выбор)
    const answerRace = useCallback((payload) => { send({ type: "answer", ...payload }); }, [send]);

    return {
        connected, rooms, room, countdown, question, chosen, reveal, podium, podiumGame,
        preparing, answered, racePos, raceWord, raceTotal, raceFeedback, raceStreak, raceGrace, raceGo,
        send, answer, answerRace, setPodium,
    };
}
