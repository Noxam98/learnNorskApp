// Звук «Гонки слов» — синтез через Web Audio API (без аудиофайлов):
//   • фоновая музыка в духе Kahoot (бодрый зацикленный аккордовый луп)
//   • «тыгыдык» — топот при продвижении вперёд
//   • падение — при ошибке (зверь спотыкается)
//   • зевок — на простое (холостые звери)
// Всё глушится глобальным тумблером soundOn.
import { ac, noise, soundEnabled as on } from "./audioCore.js";

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

// ---------------- фоновая музыка (зацикленный секвенсор, 4 такта) ----------------
let music = null;   // {gain, timer, step, until}
const BPM = 126;
const STEP = 60 / BPM / 4;               // 16-я нота
const STEPS = 64;                        // 4 такта по 16
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   // midi → Гц
// 8 полутактов: Am F C G | Am F Dm E — с разворотом доминанты в конце
const CHORDS = [
    { bass: 45, tones: [57, 60, 64] },   // Am
    { bass: 41, tones: [53, 57, 60] },   // F
    { bass: 36, tones: [48, 52, 55] },   // C
    { bass: 43, tones: [55, 59, 62] },   // G
    { bass: 45, tones: [57, 60, 64] },   // Am
    { bass: 41, tones: [53, 57, 60] },   // F
    { bass: 38, tones: [50, 53, 57] },   // Dm
    { bass: 40, tones: [52, 56, 59] },   // E  (доминанта → обратно в Am)
];
// мелодия-мотив (midi или 0=пауза), оживает во 2-м и 4-м тактах
const MEL = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,                  // т.1 — тихо
    72, 0, 71, 0, 69, 0, 72, 0, 71, 0, 69, 0, 67, 0, 0, 0,           // т.2 — фраза
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,                  // т.3 — тихо
    69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 71, 0, 69, 0, 67, 0,          // т.4 — взлёт + спуск
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

// синтез-ударные
function kick(c, dest, t) {
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    const g = c.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.2);
}
function snare(c, dest, t) {
    const n = noise(c);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    n.connect(hp).connect(g).connect(dest); n.start(t); n.stop(t + 0.14);
    const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = 190;
    const og = c.createGain();
    og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og).connect(dest); o.start(t); o.stop(t + 0.09);
}
function hat(c, dest, t, open) {
    const n = noise(c);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.12 : 0.035));
    n.connect(hp).connect(g).connect(dest); n.start(t); n.stop(t + (open ? 0.13 : 0.04));
}

export function startRaceMusic() {
    if (music) return;
    const c = ac(); if (!c) return;
    const gain = c.createGain();
    gain.gain.value = on() ? 0.16 : 0.0001;
    gain.connect(c.destination);
    music = { gain, timer: null, step: 0, until: c.currentTime };
    const lookahead = 0.1;
    const tick = () => {
        if (!music) return;
        const cc = ac(); if (!cc) return;
        music.gain.gain.setTargetAtTime(on() ? 0.16 : 0.0001, cc.currentTime, 0.05);
        while (music.until < cc.currentTime + lookahead) {
            const t = music.until;
            const s = music.step % STEPS;
            const bar = Math.floor(s / 16);                 // 0..3
            const half = Math.floor(s / 8) % 8;             // полутакт → аккорд
            const ch = CHORDS[half];
            const beat = s % 4;

            // бас: на доли, в конце фразы — проходящая нота
            if (beat === 0) {
                const last = bar === 3 && s % 16 >= 12;     // ходовая в финале лупа
                const bn = last ? ch.bass + ((s % 16) - 12) : ch.bass;
                voice(cc, music.gain, "triangle", NOTE(bn) / 2, t, 0.26, 0.55);
            }
            // арпеджио — 8-е, направление меняется по тактам
            if (s % 2 === 0) {
                const i = (s / 2) % ch.tones.length;
                const idx = bar % 2 ? ch.tones.length - 1 - i : i;
                voice(cc, music.gain, "square", NOTE(ch.tones[idx]), t, 0.15, 0.1);
            }
            // мелодия
            if (MEL[s]) voice(cc, music.gain, "triangle", NOTE(MEL[s]), t, 0.26, 0.16);
            // ударные
            if (s % 8 === 0) kick(cc, music.gain, t);                 // 1 и 3 доля
            if (s % 8 === 4) snare(cc, music.gain, t);                // 2 и 4 доля
            if (bar === 3 && s % 16 >= 14) snare(cc, music.gain, t);  // фил в конце
            if (s % 2 === 0) hat(cc, music.gain, t, s % 8 === 6);     // хэт, иногда открытый

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
