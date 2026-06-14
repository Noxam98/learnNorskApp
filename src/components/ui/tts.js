// Озвучка норвежских слов.
// 1) Google Translate TTS (tl=no) — натуральное норвежское произношение, работает без
//    норвежского системного голоса (проигрывается через <audio>, CORS для media не нужен).
// 2) Фолбэк — Web Speech API с норвежским голосом, если он есть в системе.

let _audio = null;

const webSpeech = (text) => {
    try {
        const synth = window.speechSynthesis;
        if (!synth) return false;
        const voices = synth.getVoices() || [];
        const nb = voices.find((v) => /^(nb|nn|no)\b/i.test(v.lang) || /nor(wegian|sk)/i.test(v.name));
        const u = new SpeechSynthesisUtterance(text);
        if (nb) { u.voice = nb; u.lang = nb.lang; } else { u.lang = "nb-NO"; }
        u.rate = 0.9;
        synth.cancel();
        synth.speak(u);
        return true;
    } catch {
        return false;
    }
};

export const speakNorwegian = (text) => {
    const t = (text || "").trim();
    if (!t) return;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=no&q=${encodeURIComponent(t)}`;
    try {
        if (_audio) { _audio.pause(); }
        _audio = new Audio(url);
        _audio.play().catch(() => webSpeech(t)); // фолбэк при блокировке/ошибке
    } catch {
        webSpeech(t);
    }
};

// Прогреть список голосов (Web Speech подгружает их асинхронно).
if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

export default speakNorwegian;
