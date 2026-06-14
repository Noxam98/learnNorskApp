// Озвучка норвежских слов через серверный Gemini TTS (натуральное произношение, кэш на сервере).
// Фолбэк — Web Speech API, если серверное аудио недоступно.
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

export const speakNorwegian = (text) => {
    const t = (text || "").trim();
    if (!t) return;
    try {
        if (_audio) _audio.pause();
        _audio = new Audio(api.ttsUrl(t));
        _audio.play().catch(() => webSpeech(t));
    } catch {
        webSpeech(t);
    }
};

export default speakNorwegian;
