// Озвучка норвежских слов только через серверный TTS (кэш на сервере).
// Браузерный Web Speech фолбэк отключён намеренно — он давал «гугловый»
// женский голос поверх серверного.
import api from "../tools/api.js";

let _audio = null;     // текущий <audio>
let _reject = null;    // reject ожидающего окончания фрагмента (для прерывания очереди)
let _gen = 0;          // поколение воспроизведения: новый запуск отменяет предыдущие

// Останавливает текущее аудио. Если кто-то ждёт его окончания (очередь) —
// реджектим этот промис как «прервано», чтобы очередь не пошла дальше.
const stopAudio = () => {
    if (_reject) { const r = _reject; _reject = null; r(new Error("interrupted")); }
    try {
        if (_audio) { _audio.onended = _audio.onerror = _audio.onplaying = null; _audio.pause(); _audio.src = ""; }
    } catch { /* */ }
    _audio = null;
    // На всякий случай глушим любую зависшую браузерную реплику.
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* */ }
};

// Код языка озвучки из языка интерфейса (украинский: ukr → uk).
export const ttsLang = (uiLang) => ({ ru: "ru", ukr: "uk", en: "en", pl: "pl", lt: "lt" }[uiLang] || uiLang);

// Проиграть один фрагмент. waitEnd=false → резолв на старте воспроизведения
// (как было); waitEnd=true → резолв по окончании (нужно для очереди фрагментов).
const play = (text, lang, waitEnd) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { resolve(); return; }

    stopAudio();

    const audio = new Audio(api.ttsUrl(t, lang));
    _audio = audio;

    audio.onerror = () => { if (_reject === reject) _reject = null; reject(new Error("audio")); };
    if (waitEnd) {
        _reject = reject; // позволяем прервать ожидание окончания извне (stopAudio)
        audio.onended = () => { if (_reject === reject) _reject = null; resolve(); };
    } else {
        audio.onplaying = () => resolve(); // одиночный режим: аудио играет дальше само
    }
    audio.play().catch((e) => reject(e));
});

// Озвучка текста. lang не задан → норвежский (как было); задан → голос перевода.
// Бамп поколения отменяет любую запущенную очередь.
export const speakText = (text, lang) => { _gen++; return play(text, lang, false); };

// Озвучить фрагменты подряд: следующий стартует после окончания предыдущего.
// segments: [{ text, lang }] (lang не задан → норвежский). Если запуск перебили
// (клик по другой карточке/стоп) — очередь завершается, перевод не «доигрывается».
export const speakSequence = async (segments) => {
    const my = ++_gen;
    const list = (segments || []).filter((s) => (s?.text || "").trim());
    for (const seg of list) {
        if (my !== _gen) return;                 // нас отменил новый запуск
        try { await play(seg.text, seg.lang, true); }
        catch { return; }                        // прервано или нет звука — дальше не идём
        if (my !== _gen) return;
    }
};

// Прогреть озвучку заранее (бэкенд сгенерит и закеширует в Tigris, браузер — в
// HTTP-кеш), чтобы последующее воспроизведение было мгновенным. Без звука.
export const prefetchTts = (text, lang) => {
    const t = (text || "").trim();
    if (!t) return;
    try { fetch(api.ttsUrl(t, lang)).catch(() => {}); } catch { /* */ }
};

export const speakNorwegian = (text) => speakText(text);

export default speakNorwegian;
