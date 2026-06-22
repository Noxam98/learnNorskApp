// Экранная клавиатура «как Gboard»: поп-ап превью буквы, хаптик, ВВОД символа на pointerup
// (над той же клавишей; уход пальца — без ввода). Контролируемая: родитель владеет введённой
// строкой и решает submit. Два режима:
//  • «сборка» (gated): задан remainingOf/needed → активны только буквы слова, бейдж-счётчик
//    повторов, лишние приглушены (подсказка). Используется в «Собери из букв».
//  • свободный: без remainingOf → все буквы активны, без подсказок. Используется в «Вводе» (норвежское слово).
import { useState, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";

// Норвежская раскладка QWERTY (нижний регистр).
export const KBD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "å"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ø", "æ"],
    ["z", "x", "c", "v", "b", "n", "m"],
];
export const KBD_SET = new Set(KBD_ROWS.flat());

export function GameKeyboard({
    lang, remainingOf, needed, extras = [],
    canSubmit = false, canBackspace = false,
    onType, onBackspace, onSubmit, onDunno, dunnoLabel, showDunno = false,
}) {
    const [pop, setPop] = useState(null);
    const pressingRef = useRef(null);
    const gated = typeof remainingOf === "function";
    const active = (c) => !gated || remainingOf(c) > 0;             // свободный режим — всё активно
    const isOff = (c) => gated && (needed?.[c] || 0) === 0;          // буква не из слова (подсказка)
    const isSpent = (c) => gated && (needed?.[c] || 0) > 0 && remainingOf(c) <= 0;
    const badge = (c) => (gated && (needed?.[c] || 0) > 1) ? remainingOf(c) : null;

    const keyDown = (c, e) => {
        e?.preventDefault();
        if (!active(c)) return;
        pressingRef.current = c; setPop(c);
        try { navigator.vibrate?.(8); } catch { /* нет вибро — ок */ }
    };
    const keyUp = (c, e) => {
        if (pressingRef.current === c) { if (active(c)) onType?.(c); try { navigator.vibrate?.(8); } catch { /* */ } }
        pressingRef.current = null; setPop(null);
        e?.currentTarget?.blur?.();   // снять фокус после отпускания — клавиша не «залипает» подсвеченной
    };
    const keyCancel = (c) => { if (pressingRef.current === c) { pressingRef.current = null; setPop(null); } };

    // Клавиша-символ (буква/дефис/пробел). cls — доп. класс (напр. для пробела).
    const symKey = (c, cls = "", ariaLabel) => {
        const b = badge(c);
        return (
            <button key={c || "space"} className={"kbd__key" + cls + (isOff(c) ? " is-off" : "") + (isSpent(c) ? " is-spent" : "")}
                disabled={isOff(c) || isSpent(c)} aria-label={ariaLabel}
                onPointerDown={(e) => keyDown(c, e)} onPointerUp={(e) => keyUp(c, e)}
                onPointerLeave={() => keyCancel(c)} onPointerCancel={() => keyCancel(c)} lang={lang}>
                {c === " " ? "" : c}
                {b != null && <span className="kbd__count">{b}</span>}
                {pop === c && <span className="kbd__pop" aria-hidden="true">{c === " " ? "␣" : c}</span>}
            </button>
        );
    };

    return (
        <div className="kbd" onContextMenu={(e) => e.preventDefault()}>
            {KBD_ROWS.map((row, ri) => {
                const last = ri === KBD_ROWS.length - 1;
                return (
                    <div className={"kbd__row" + (last ? " kbd__row--last" : "")} key={ri}>
                        {/* «Не знаю» — заполняет пустоту слева в нижнем ряду (честный пропуск) */}
                        {last && showDunno && onDunno && (
                            <button type="button" className="kbd__key kbd__key--dunno" onClick={(e) => { onDunno(); e.currentTarget.blur(); }}>{dunnoLabel}</button>
                        )}
                        {row.map((c) => symKey(c))}
                        {/* ⌫ — в конце последнего буквенного ряда (как в Gboard) */}
                        {last && (
                            <button className="kbd__key kbd__key--act" disabled={!canBackspace} aria-label="backspace"
                                onPointerDown={(e) => { e.preventDefault(); try { navigator.vibrate?.(8); } catch { /* */ } onBackspace?.(); }}
                                onPointerUp={(e) => e.currentTarget.blur()}>
                                <Icon n="arrow-left" />
                            </button>
                        )}
                    </div>
                );
            })}
            <div className="kbd__row kbd__row--act">
                {/* спец-символы (дефис и т.п.), кроме пробела — отдельными клавишами */}
                {extras.filter((c) => c !== " ").map((c) => symKey(c))}
                {/* пробел — всегда в клавиатуре */}
                {symKey(" ", " kbd__key--space", "space")}
                <button className="kbd__key kbd__key--go" disabled={!canSubmit} aria-label="check"
                    onPointerDown={(e) => { e.preventDefault(); onSubmit?.(); }}
                    onPointerUp={(e) => e.currentTarget.blur()}><Icon n="check" /></button>
            </div>
        </div>
    );
}

export default GameKeyboard;
