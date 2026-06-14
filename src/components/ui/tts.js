// Озвучка норвежских слов через серверный Gemini TTS (кэш на сервере).
// Возвращает Promise: resolve при старте воспроизведения, reject при ошибке.
// Фолбэк — Web Speech API.
import api from "../tools/api.js";

let _audio = null;

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
    try {
        if (_audio) _audio.pause();
        _audio = new Audio(api.ttsUrl(t));
        _audio.onplaying = () => resolve();
        _audio.onerror = () => { webSpeech(t); reject(new Error("audio")); };
        _audio.play().catch(() => { webSpeech(t); reject(new Error("play")); });
    } catch (e) {
        webSpeech(t);
        reject(e);
    }
});

export default speakNorwegian;
