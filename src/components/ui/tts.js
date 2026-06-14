// Озвучка норвежских слов через серверный Gemini TTS (кэш на сервере).
// Возвращает Promise: resolve при старте воспроизведения, reject при ошибке.
// Фолбэк — Web Speech API.
import api from "../tools/api.js";

let _audio = null;

// Полностью останавливает любую текущую озвучку: серверное аудио и Web Speech.
const stopAll = () => {
    try { if (_audio) { _audio.pause(); _audio.src = ""; } } catch { /* */ }
    _audio = null;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* */ }
};

const webSpeech = (text) => {
    try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const voices = synth.getVoices() || [];
        const nb = voices.find((v) => /^(nb|nn|no)\b/i.test(v.lang) || /nor(wegian|sk)/i.test(v.name));
        const u = new SpeechSynthesisUtterance(text);
        if (nb) { u.voice = nb; u.lang = nb.lang; } else { u.lang = "nb-NO"; }
        u.rate = 0.9;
        synth.cancel();
        synth.speak(u);
    } catch { /* нет TTS */ }
};

export const speakNorwegian = (text) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { resolve(); return; }

    // Глушим всё предыдущее (в т.ч. зависший Web Speech), прежде чем играть новое.
    stopAll();

    let settled = false; // исход решаем ровно один раз: либо сервер, либо фолбэк
    const audio = new Audio(api.ttsUrl(t));
    _audio = audio;

    const fallback = (err) => {
        if (settled) return;   // аудио уже заиграло — фолбэк не нужен
        settled = true;
        webSpeech(t);
        reject(err);
    };

    audio.onplaying = () => {
        if (settled) return;
        settled = true;        // успех зафиксирован: поздний onerror больше не даст женский голос
        resolve();
    };
    audio.onerror = () => fallback(new Error("audio"));
    audio.play().catch(() => fallback(new Error("play")));
});

export default speakNorwegian;
