// Озвучка норвежских слов только через серверный TTS (кэш на сервере).
// Браузерный Web Speech фолбэк отключён намеренно — он давал «гугловый»
// женский голос поверх серверного.
import api from "../tools/api.js";
import { soundLevel } from "../tools/audioCore.js";
import { ttsLangOf } from "../../interface/languages.js";

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

// Код языка озвучки из языка интерфейса (укр: ukr → uk) — из единого реестра языков.
export const ttsLang = (uiLang) => ttsLangOf(uiLang);

// Проиграть один фрагмент. waitEnd=false → резолв на старте воспроизведения
// (как было); waitEnd=true → резолв по окончании (нужно для очереди фрагментов).
// onMeta(durSec) — необяз.: ОДИН раз на старте отдаём длительность аудио наружу, чтобы потребитель
// сам прокрутил анимацию прогресса по этой длине (без поллинга currentTime десятки раз в секунду).
const play = (text, lang, waitEnd, onMeta) => new Promise((resolve, reject) => {
    const t = (text || "").trim();
    if (!t) { resolve(); return; }

    stopAudio();

    const audio = new Audio(api.ttsUrl(t, lang));
    audio.volume = soundLevel();   // общий уровень громкости (0 = тишина)
    _audio = audio;

    const estDur = Math.max(0.6, t.length * 0.09 + 0.4);  // запасная оценка, если длительность не известна

    audio.onerror = () => { if (_reject === reject) _reject = null; reject(new Error("audio")); };
    if (waitEnd) {
        _reject = reject; // позволяем прервать ожидание окончания извне (stopAudio)
        audio.onended = () => { if (_reject === reject) _reject = null; resolve(); };
    } else {
        audio.onplaying = () => resolve(); // одиночный режим: аудио играет дальше само
    }
    audio.play().then(() => {
        if (!onMeta || audio !== _audio) return;
        // длительность отдаём, как только она известна; если метаданные ещё не подъехали — ждём их
        const fire = () => { if (audio !== _audio) return; const d = audio.duration; onMeta(isFinite(d) && d > 0.1 ? d : estDur); };
        if (isFinite(audio.duration) && audio.duration > 0.1) fire();
        else audio.addEventListener("loadedmetadata", fire, { once: true });
    }).catch((e) => { reject(e); });
});

// Озвучка текста. lang не задан → норвежский (как было); задан → голос перевода.
// Бамп поколения отменяет любую запущенную очередь.
export const speakText = (text, lang) => { _gen++; return play(text, lang, false); };

// Как speakText, но промис резолвится по ОКОНЧАНИИ воспроизведения (а не на старте).
// onMeta(durSec) — необяз.: длительность аудио на старте (для анимации кольца). Прерывание → реджект.
export const speakTextEnd = (text, lang, onMeta) => { _gen++; return play(text, lang, true, onMeta); };

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
    // no-cors: префетч лишь ГРЕЕТ HTTP-кеш для последующего <audio> (тоже no-cors media). Ответ мы не
    // читаем, поэтому CORS-режим здесь не нужен и только вреден — на любом сетевом сбое (напр. рестарт
    // бэка при деплое) обычный fetch сыпал «No Access-Control-Allow-Origin» в консоль. no-cors молчит.
    try { fetch(api.ttsUrl(t, lang), { mode: "no-cors" }).catch(() => {}); } catch { /* */ }
};

export const speakNorwegian = (text) => speakText(text);

export default speakNorwegian;
