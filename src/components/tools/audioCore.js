// Ядро синтез-звука: единый AudioContext, общий шумовой буфер, проверка тумблера.
// Используется sound.js (UI-звуки) и raceAudio.js (гонка).
import { useSystemStore } from "../../store/systemStore.jsx";

let ctx = null;
export function ac() {
    if (typeof window === "undefined") return null;
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}

export function soundEnabled() {
    try { return useSystemStore.getState().soundOn; } catch { return false; }
}

// Общий множитель громкости 0..1 (для синтез-звуков и TTS). Не зависит от soundOn:
// ручная озвучка по кнопке играет на этом уровне даже при выключенных игровых звуках;
// 0 = полная тишина. Игровые звуки дополнительно гасятся soundEnabled() в playSound.
export function soundLevel() {
    try {
        const v = useSystemStore.getState().soundVolume;
        const n = Math.max(0, Math.min(1, Number(v)));
        return isNaN(n) ? 1 : n;
    } catch { return 1; }
}

let noiseBuf = null;
export function noise(c) {
    if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    return s;
}

// Тональный голос с экспоненциальной огибающей. glideTo — необяз. конечная частота (порт./глайд).
export function tone(c, dest, { type = "sine", freq, to, t, dur, peak = 0.3, attack = 0.012 }) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
}

export const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
