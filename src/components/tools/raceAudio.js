// Звук «Гонки слов» — синтез через Web Audio API (без аудиофайлов):
//   • фоновая музыка в духе Kahoot (бодрый зацикленный аккордовый луп)
//   • «тыгыдык» — топот при продвижении вперёд
//   • падение — при ошибке (зверь спотыкается)
//   • зевок — на простое (холостые звери)
// Всё глушится глобальным тумблером soundOn.
import { useSystemStore } from "../../store/systemStore.jsx";

let ctx = null;
function ac() {
    if (typeof window === "undefined") return null;
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}
const on = () => { try { return useSystemStore.getState().soundOn; } catch { return false; } };

// короткий шумовой буфер для перкуссии (топот/падение)
let noiseBuf = null;
function noise(c) {
    if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    return s;
}

// один «цок» копыта: тело-синус с быстрым спадом высоты + щелчок шума
function hoof(c, t, dest, freq, gain) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.07);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 0.13);

    const n = noise(c);
    const nf = c.createBiquadFilter();
    nf.type = "bandpass"; nf.frequency.value = 1800; nf.Q.value = 0.8;
    const ng = c.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(nf).connect(ng).connect(dest);
    n.start(t); n.stop(t + 0.06);
}

// «тыгыдык» — два сдвоенных цока
export function playGallop() {
    if (!on()) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const out = c.createGain(); out.gain.value = 0.5; out.connect(c.destination);
    hoof(c, t, out, 230, 0.6);
    hoof(c, t + 0.085, out, 300, 0.5);
    hoof(c, t + 0.20, out, 215, 0.5);
    hoof(c, t + 0.285, out, 285, 0.42);
}

// падение — нисходящий «вуу» + шлепок
export function playFall() {
    if (!on()) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const out = c.createGain(); out.gain.value = 0.45; out.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.45);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
    o.connect(lp).connect(g).connect(out);
    o.start(t); o.stop(t + 0.52);
    // шлепок в конце
    const n = noise(c);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t + 0.42);
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.45);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    const nf = c.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 700;
    n.connect(nf).connect(ng).connect(out);
    n.start(t + 0.42); n.stop(t + 0.62);
}

// зевок — фильтрованная пила, вверх-вниз по высоте и громкости
export function playYawn() {
    if (!on()) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const out = c.createGain(); out.gain.value = 0.22; out.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(330, t + 0.4);
    o.frequency.linearRampToValueAtTime(150, t + 1.0);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 4;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.linearRampToValueAtTime(1100, t + 0.4);
    bp.frequency.linearRampToValueAtTime(400, t + 1.0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.05);
    o.connect(bp).connect(g).connect(out);
    o.start(t); o.stop(t + 1.1);
}

// ---------------- фоновая музыка (зацикленный секвенсор) ----------------
let music = null;   // {gain, timer, step, until}
const BPM = 124;
const STEP = 60 / BPM / 4;               // 16-я нота
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   // midi → Гц
// 2 такта: аккорды vi-IV-I-V (Am-F-C-G) — узнаваемый бодрый луп
const BASS = [45, 45, 41, 41, 36, 36, 43, 43];          // по полутакту (8-я)
const ARP = [
    [57, 60, 64], [57, 60, 64], [53, 57, 60], [53, 57, 60],
    [48, 52, 55], [48, 52, 55], [55, 59, 62], [55, 59, 62],
];

function voice(c, dest, type, freq, t, dur, peak) {
    const o = c.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
}

export function startRaceMusic() {
    if (music) return;
    const c = ac(); if (!c) return;
    const gain = c.createGain();
    gain.gain.value = on() ? 0.14 : 0.0001;
    gain.connect(c.destination);
    music = { gain, timer: null, step: 0, until: c.currentTime };
    const lookahead = 0.1;
    const tick = () => {
        if (!music) return;
        const cc = ac(); if (!cc) return;
        // держим громкость в такт тумблеру
        music.gain.gain.setTargetAtTime(on() ? 0.14 : 0.0001, cc.currentTime, 0.05);
        while (music.until < cc.currentTime + lookahead) {
            const t = music.until;
            const s = music.step % 32;
            const half = Math.floor(s / 4) % 8;
            if (s % 4 === 0) voice(cc, music.gain, "triangle", NOTE(BASS[half]) / 2, t, 0.28, 0.5);   // бас
            if (s % 2 === 0) {                                                                          // арпеджио
                const chord = ARP[half]; const n = chord[(s / 2) % chord.length];
                voice(cc, music.gain, "square", NOTE(n), t, 0.16, 0.12);
            }
            if (s % 4 === 2) voice(cc, music.gain, "triangle", 2000, t, 0.03, 0.05);                   // хэт-щёлк
            music.until += STEP; music.step++;
        }
    };
    tick();
    music.timer = setInterval(tick, 25);
}

export function stopRaceMusic() {
    if (!music) return;
    clearInterval(music.timer);
    try { const c = ac(); music.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.1); } catch { /* no-op */ }
    const g = music.gain;
    setTimeout(() => { try { g.disconnect(); } catch { /* no-op */ } }, 400);
    music = null;
}
