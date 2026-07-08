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
    // Три состояния соединения: connecting (первый коннект) / online / reconnecting (разрыв, ждём переподключения).
    // Сокет больше НЕ одноразовый: onclose планирует реконнект с экспоненциальным backoff.
    const [status, setStatus] = useState("connecting");
    const connected = status === "online";
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
    const raceGoTimer = useRef(null);

    // Инфраструктура реконнекта.
    const reconnectTimer = useRef(null);
    const attemptRef = useRef(0);        // счётчик попыток для backoff
    const closedRef = useRef(false);     // намеренный размонтаж — НЕ переподключаться
    const langRef = useRef(lang);        // актуальный язык для URL нового сокета
    const toRef = useRef(to);            // актуальные i18n-строки для тостов ошибок (без пересоздания сокета)
    toRef.current = to;

    const send = useCallback((obj) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    }, []);

    // Полный сброс игрового состояния гонки/квиза (используется на left и на входе в лобби).
    const resetGameState = useCallback(() => {
        setQuestion(null); setReveal(null); setCountdown(null); setPreparing(false);
        setRaceWord(null); setRacePos([]); setRaceGrace(null); setRaceGo(false);
        setRaceFeedback(null); setRaceStreak(0);
        stopRaceMusic();
    }, []);

    const connect = useCallback(() => {
        if (closedRef.current) return;
        const ws = new WebSocket(api.onlineSocketUrl(langRef.current));
        wsRef.current = ws;
        ws.onopen = () => {
            if (wsRef.current !== ws) return;   // StrictMode / устаревший сокет
            attemptRef.current = 0;
            setStatus("online");
            ws.send(JSON.stringify({ type: "watch" }));
            // Восстановление после разрыва: если были в комнате — просим сервер вернуть нас туда.
            const rid = roomRef.current?.id;
            if (rid) ws.send(JSON.stringify({ type: "rejoin", roomId: rid }));
        };
        ws.onclose = (ev) => {
            if (wsRef.current !== ws) return;
            if (closedRef.current) return;      // намеренное закрытие при unmount — не реконнектим
            // Фатальные коды: 4401 (не авторизован) / 4409 (слишком много соединений/вкладок) —
            // авто-реконнект бесполезен (снова получим то же) → НЕ зацикливаемся, показываем
            // терминальное «связь потеряна» с ручной кнопкой «Переподключиться».
            if (ev && (ev.code === 4401 || ev.code === 4409)) {
                closedRef.current = true;
                setStatus("dropped");
                return;
            }
            setStatus("reconnecting");
            const n = Math.min(attemptRef.current++, 4);      // 0..4
            const delay = Math.min(1000 * 2 ** n, 15000);     // 1s → 2s → 4s → 8s → 15s (кап)
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = setTimeout(connect, delay);
        };
        ws.onmessage = (e) => {
            if (wsRef.current !== ws) return;   // сообщения устаревшего сокета игнорируем
            let m; try { m = JSON.parse(e.data); } catch { return; }
            switch (m.type) {
                case "rooms": setRooms(m.rooms || []); break;
                case "room":
                    if (!m.room) break;
                    roomRef.current = m.room;
                    setRoom(m.room);
                    if (m.room.state === "lobby") resetGameState();
                    break;
                case "countdown": setCountdown(m.sec); playSound(m.sec === 1 ? "start" : "tick"); break;
                case "preparing": setPreparing(true); setCountdown(null); break;
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
                    clearTimeout(raceGoTimer.current);
                    raceGoTimer.current = setTimeout(() => setRaceGo(false), 1100);
                    break;
                case "race_word": setRaceWord(m); break;
                case "race_result": {
                    setRaceFeedback(m.correct ? "right" : "wrong");
                    setRaceStreak((s) => (m.correct ? s + 1 : 0));
                    if (m.correct) playGallop(); else playFall();   // топот / падение
                    clearTimeout(fbTimer.current);
                    fbTimer.current = setTimeout(() => setRaceFeedback(null), 600);
                    break;
                }
                case "race_pos": setRacePos(m.positions || []); break;
                case "race_grace": setRaceGrace({ sec: m.sec, leader: m.leader, total: m.total || 25 }); break;
                case "ended":
                    setPodium(m.podium); setPodiumGame(m.game || "quiz");
                    // Гасим игровое состояние симметрично left (кроме podium), иначе после «В лобби»
                    // остаётся stale racePos и RaceScreen рендерится пустым.
                    setQuestion(null); setReveal(null); setCountdown(null); setPreparing(false);
                    setRaceWord(null); setRacePos([]); setRaceGrace(null); setRaceGo(false);
                    setRaceFeedback(null); setRaceStreak(0);
                    stopRaceMusic();
                    break;
                case "left":
                    setRoom(null); roomRef.current = null; setPodium(null);
                    resetGameState();
                    break;
                case "error": case "game_error": {
                    // Гасим переходные экраны, чтобы ошибка не «зависала» под спиннером/отсчётом.
                    setPreparing(false); setCountdown(null); setReveal(null);
                    const T = toRef.current || {};
                    useSystemStore.getState().showToast(T[m.msg] || T.genericError || "Ошибка связи");
                    break;
                }
                default: break;
            }
        };
    }, [resetGameState]);

    // Единожды при монтировании: подключаемся. Смена языка сокет НЕ пересоздаёт (см. эффект ниже),
    // иначе фон/блип рвал бы соединение. При unmount — намеренное закрытие без реконнекта.
    useEffect(() => {
        closedRef.current = false;
        connect();
        return () => {
            closedRef.current = true;
            clearTimeout(reconnectTimer.current);
            clearTimeout(fbTimer.current);
            clearTimeout(raceGoTimer.current);
            stopRaceMusic();
            try { wsRef.current?.close(); } catch { /* no-op */ }
        };
    }, [connect]);

    // Смена языка интерфейса — сообщением по живому сокету, без разрыва соединения.
    useEffect(() => {
        langRef.current = lang;
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "set_lang", lang }));
    }, [lang]);

    // Ручной реконнект: кнопка «Переподключиться» после фатального обрыва (4401/4409) или по желанию.
    const reconnect = useCallback(() => {
        closedRef.current = false;
        attemptRef.current = 0;
        clearTimeout(reconnectTimer.current);
        setStatus("reconnecting");
        connect();
    }, [connect]);

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
        status, connected, rooms, room, countdown, question, chosen, reveal, podium, podiumGame,
        preparing, answered, racePos, raceWord, raceTotal, raceFeedback, raceStreak, raceGrace, raceGo,
        send, answer, answerRace, setPodium, reconnect,
    };
}
