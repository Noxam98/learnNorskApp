// Звуки игры (Kenney «Interface Sounds», CC0). Воспроизведение через HTMLAudioElement
// с клонированием (чтобы звуки могли накладываться). Глобально гасится тумблером soundOn.
import { useSystemStore } from "../../store/systemStore.jsx";

const FILES = {
    tick: "/sounds/tick.wav",
    select: "/sounds/select.wav",
    correct: "/sounds/correct.wav",
    wrong: "/sounds/wrong.wav",
    start: "/sounds/start.wav",
    question: "/sounds/question.wav",
};
const VOL = { tick: 0.4, select: 0.35, correct: 1, wrong: 0.8, start: 0.9, question: 0.45 };

const cache = {};
function base(name) {
    if (!cache[name] && FILES[name]) {
        const a = new Audio(FILES[name]);
        a.preload = "auto";
        cache[name] = a;
    }
    return cache[name];
}

export function preloadSounds() {
    Object.keys(FILES).forEach(base);
}

export function playSound(name) {
    try {
        if (!useSystemStore.getState().soundOn) return;
        const b = base(name);
        if (!b) return;
        const a = b.cloneNode(true);
        a.volume = VOL[name] ?? 1;
        a.play().catch(() => {});
    } catch { /* no-op */ }
}

// Фанфара победителя: восходящий «maximize» + бодрый «confirmation».
export function playWin() {
    playSound("start");
    setTimeout(() => playSound("correct"), 180);
}
