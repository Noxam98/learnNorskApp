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

// Код языка озвучки из языка интерфейса (украинский: ukr → uk).
export const ttsLang = (uiLang) => ({ ru: "ru", ukr: "uk", en: "en", pl: "pl", lt: "lt" }[uiLang] || uiLang);

// Озвучка текста. lang не задан → норвежский (как было); задан → голос перевода.
export const speakText = (text, lang) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { resolve(); return; }

    stopAll();

    const audio = new Audio(api.ttsUrl(t, lang));
    _audio = audio;

    audio.onplaying = () => resolve();
    audio.onerror = () => reject(new Error("audio"));
    audio.play().catch((e) => reject(e));
});

// Прогреть озвучку заранее (бэкенд сгенерит и закеширует в Tigris, браузер — в
// HTTP-кеш), чтобы последующее воспроизведение было мгновенным. Без звука.
export const prefetchTts = (text, lang) => {
    const t = (text || "").trim();
    if (!t) return;
    try { fetch(api.ttsUrl(t, lang)).catch(() => {}); } catch { /* */ }
};

export const speakNorwegian = (text) => speakText(text);

export default speakNorwegian;
