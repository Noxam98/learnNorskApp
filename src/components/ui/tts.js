// Озвучка норвежских слов только через серверный TTS (кэш на сервере).
// Браузерный Web Speech фолбэк отключён намеренно — он давал «гугловый»
// женский голос поверх серверного.
import api from "../tools/api.js";
import { soundLevel } from "../tools/audioCore.js";

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
const play = (text, lang, waitEnd, onTick) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { if (onTick) onTick(1); resolve(); return; }

    stopAudio();

    const audio = new Audio(api.ttsUrl(t, lang));
    audio.volume = soundLevel();   // общий уровень громкости (0 = тишина)
    _audio = audio;

    // Прогресс воспроизведения (onTick 0..1) по РЕАЛЬНОМУ времени аудио. Ведём setInterval'ом (а НЕ
    // rAF — он тормозится в неактивной вкладке), читая currentTime/duration. duration обычно конечная;
    // если нет — оценка по длине слова, чтобы кольцо всё равно ехало.
    let timer = 0;
    const estDur = Math.max(0.6, t.length * 0.09 + 0.4);
    const stopTimer = () => { if (timer) { clearInterval(timer); timer = 0; } };
    const tick = () => {
        // нас сменило новое воспроизведение / поставили на паузу — гасим СВОЙ таймер (иначе два
        // таймера дерутся за кольцо после быстрого повторного клика → дёрганье/не доходит до конца)
        if (audio !== _audio || audio.paused || audio.ended) { stopTimer(); return; }
        const d = audio.duration;
        const p = (isFinite(d) && d > 0.1) ? (audio.currentTime / d) : Math.min(0.95, audio.currentTime / estDur);
        if (onTick) onTick(Math.min(0.999, p));
    };

    audio.onerror = () => { stopTimer(); if (_reject === reject) _reject = null; reject(new Error("audio")); };
    if (waitEnd) {
        _reject = reject; // позволяем прервать ожидание окончания извне (stopAudio)
        audio.onended = () => { stopTimer(); if (onTick) onTick(1); if (_reject === reject) _reject = null; resolve(); };
    } else {
        audio.onplaying = () => resolve(); // одиночный режим: аудио играет дальше само
    }
    audio.play().then(() => { if (onTick) timer = setInterval(tick, 25); }).catch((e) => { stopTimer(); reject(e); });
});

// Озвучка текста. lang не задан → норвежский (как было); задан → голос перевода.
// Бамп поколения отменяет любую запущенную очередь.
export const speakText = (text, lang) => { _gen++; return play(text, lang, false); };

// Как speakText, но промис резолвится по ОКОНЧАНИИ воспроизведения (а не на старте).
// onTick(0..1) — необяз. прогресс по реальному времени аудио (для кольца). Прерывание → реджект.
export const speakTextEnd = (text, lang, onTick) => { _gen++; return play(text, lang, true, onTick); };

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
