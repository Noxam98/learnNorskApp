// UI-звуки игры — полностью синтезируются через Web Audio (без аудиофайлов),
// гасятся глобальным тумблером soundOn. API сохранён: playSound(name)/preloadSounds()/playWin().
import { ac, soundEnabled, soundLevel, noise, tone, MIDI } from "./audioCore.js";

function out(c, vol) { const g = c.createGain(); g.gain.value = vol * soundLevel(); g.connect(c.destination); return g; }

// Короткий шумовой щелчок (для тиков/кликов)
function click(c, dest, t, hp, peak, dur) {
    const n = noise(c);
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(dest); n.start(t); n.stop(t + dur + 0.01);
}

const SOUNDS = {
    // тик отсчёта — сухой высокий клик
    tick(c) { const o = out(c, 0.5); const t = c.currentTime; tone(c, o, { type: "square", freq: MIDI(96), to: MIDI(91), t, dur: 0.05, peak: 0.18 }); click(c, o, t, 5000, 0.12, 0.03); },
    // клик по варианту — мягкий блип
    select(c) { const o = out(c, 0.5); const t = c.currentTime; tone(c, o, { type: "triangle", freq: MIDI(79), t, dur: 0.08, peak: 0.22 }); },
    // правильно — восходящее трезвучие (мажор). semis: транспонировка по стадии слова (0..) —
    // чем дальше слово по рампе, тем выше «верно» (та же узнаваемая фраза, выше по высоте).
    correct(c, { semis = 0 } = {}) { const o = out(c, 0.6); const t = c.currentTime; const s = semis; tone(c, o, { type: "triangle", freq: MIDI(72 + s), t, dur: 0.12, peak: 0.32 }); tone(c, o, { type: "triangle", freq: MIDI(76 + s), t: t + 0.1, dur: 0.16, peak: 0.32 }); tone(c, o, { type: "sine", freq: MIDI(79 + s), t: t + 0.2, dur: 0.22, peak: 0.28 }); },
    // вход в задание — короткий мягкий подъём (квинта). semis: транспонировка по стадии слова —
    // на появлении слова слышно, на какой оно ступени рампы (карточка ниже всех → ввод выше всех).
    enter(c, { semis = 0 } = {}) { const o = out(c, 0.4); const t = c.currentTime; const s = semis; tone(c, o, { type: "triangle", freq: MIDI(64 + s), to: MIDI(71 + s), t, dur: 0.16, peak: 0.18 }); },
    // ошибка — нисходящее «бз-з» (минор). semis: транспонировка по стадии слова — чем выше слово
    // было по рампе, тем с большей высоты «падает» звук (зеркало растущего «верно»)
    wrong(c, { semis = 0 } = {}) { const o = out(c, 0.55); const t = c.currentTime; const s = semis; tone(c, o, { type: "sawtooth", freq: MIDI(58 + s), to: MIDI(53 + s), t, dur: 0.18, peak: 0.26 }); tone(c, o, { type: "sawtooth", freq: MIDI(54 + s), to: MIDI(49 + s), t: t + 0.13, dur: 0.24, peak: 0.24 }); },
    // принято с опечаткой — мягкий нейтральный «динь-дынь» (не мажор «верно», не минор «ошибка»):
    // два близких тёплых тона на месте, без подъёма/спада — «почти, но ок»
    typo(c) { const o = out(c, 0.5); const t = c.currentTime; tone(c, o, { type: "triangle", freq: MIDI(71), t, dur: 0.1, peak: 0.26 }); tone(c, o, { type: "triangle", freq: MIDI(69), t: t + 0.11, dur: 0.16, peak: 0.24 }); },
    // старт — восходящая фанфара
    start(c) { const o = out(c, 0.6); const t = c.currentTime; [60, 64, 67, 72].forEach((n, i) => tone(c, o, { type: "square", freq: MIDI(n), t: t + i * 0.07, dur: 0.18, peak: 0.22 })); },
    // появление вопроса — мягкий «вверх» свуш
    question(c) { const o = out(c, 0.45); const t = c.currentTime; tone(c, o, { type: "triangle", freq: MIDI(64), to: MIDI(76), t, dur: 0.22, peak: 0.22 }); },
    // финиш экрана/раунда — короткий бодрый аккорд
    finish(c) { const o = out(c, 0.6); const t = c.currentTime; [60, 64, 67].forEach((n) => tone(c, o, { type: "triangle", freq: MIDI(n), t, dur: 0.4, peak: 0.2 })); tone(c, o, { type: "sine", freq: MIDI(72), t: t + 0.12, dur: 0.4, peak: 0.22 }); },
    // слово ВЫУЧЕНО (прошло всю рампу) — торжественный мажорный разлив вверх + «блеск» сверху
    mastered(c) { const o = out(c, 0.65); const t = c.currentTime; [72, 76, 79, 84].forEach((n, i) => tone(c, o, { type: "triangle", freq: MIDI(n), t: t + i * 0.09, dur: 0.22, peak: 0.3 })); tone(c, o, { type: "sine", freq: MIDI(91), t: t + 0.42, dur: 0.36, peak: 0.2 }); },
    // переворот карточки (одиночная «учёба»)
    flip(c) { const o = out(c, 0.4); const t = c.currentTime; tone(c, o, { type: "triangle", freq: MIDI(67), to: MIDI(74), t, dur: 0.1, peak: 0.18 }); },
};

export function preloadSounds() { ac(); }   // просто «разбудить» контекст

export function playSound(name, opts) {
    if (!soundEnabled()) return;
    const c = ac(); if (!c) return;
    const fn = SOUNDS[name];
    if (fn) try { fn(c, opts); } catch { /* no-op */ }
}

// Фанфара победителя: старт + радостный аккорд
export function playWin() {
    playSound("start");
    setTimeout(() => playSound("finish"), 220);
}
