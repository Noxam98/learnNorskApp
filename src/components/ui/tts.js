// Озвучка норвежских слов только через серверный TTS (кэш на сервере).
// Браузерный Web Speech фолбэк отключён намеренно — он давал «гугловый»
// женский голос поверх серверного. Возвращает Promise: resolve при старте
// воспроизведения, reject при ошибке (без какой-либо озвучки).
import api from "../tools/api.js";

let _audio = null;

// Полностью останавливает текущую серверную озвучку.
const stopAll = () => {
    try { if (_audio) { _audio.pause(); _audio.src = ""; } } catch { /* */ }
    _audio = null;
    // На всякий случай глушим любую зависшую браузерную реплику.
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* */ }
};

export const speakNorwegian = (text) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { resolve(); return; }

    stopAll();

    const audio = new Audio(api.ttsUrl(t));
    _audio = audio;

    audio.onplaying = () => resolve();
    audio.onerror = () => reject(new Error("audio"));
    audio.play().catch((e) => reject(e));
});

export default speakNorwegian;
