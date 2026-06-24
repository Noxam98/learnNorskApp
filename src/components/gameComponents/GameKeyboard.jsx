// Экранная клавиатура «как Gboard»: поп-ап превью буквы, хаптик, ВВОД символа на pointerup
// (над той же клавишей; уход пальца — без ввода). Контролируемая: родитель владеет введённой
// строкой и решает submit. Два режима:
//  • «сборка» (gated): задан remainingOf/needed → активны только буквы слова, бейдж-счётчик
//    повторов, лишние приглушены (подсказка). Используется в «Собери из букв».
//  • свободный: без remainingOf → все буквы активны, без подсказок. Используется в «Вводе» (норвежское слово).
import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { useSystemStore, VIBE_MS } from "../../store/systemStore.jsx";

// Норвежская раскладка QWERTY (нижний регистр).
export const KBD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "å"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ø", "æ"],
    ["z", "x", "c", "v", "b", "n", "m"],
];
export const KBD_SET = new Set(KBD_ROWS.flat());

/**
 * @param {{
 *   lang?: string,
 *   remainingOf?: ((c: string) => number) | null,
 *   needed?: Record<string, number> | null,
 *   extras?: string[],
 *   canSubmit?: boolean, canBackspace?: boolean,
 *   onType?: (c: string) => void, onBackspace?: () => void, onSubmit?: () => void,
 *   onDunno?: (() => void) | null, dunnoLabel?: string, showDunno?: boolean, leftFiller?: boolean,
 * }} props
 */
export function GameKeyboard({
    lang, remainingOf, needed, extras = /** @type {string[]} */([]),
    canSubmit = false, canBackspace = false,
    onType, onBackspace, onSubmit, onDunno, dunnoLabel, showDunno = false, leftFiller = false,
}) {
    const vibration = useSystemStore((s) => s.vibration);
    const vibeStrength = useSystemStore((s) => s.vibrationStrength);
    const buzz = () => { if (!vibration) return; try { navigator.vibrate?.(VIBE_MS[vibeStrength] || VIBE_MS.mid); } catch { /* нет вибро — ок */ } };
    const [pop, setPop] = useState(null);
    const pressingRef = useRef(null);
    const pressTsRef = useRef(0);   // момент нажатия — для вибрации «на отпускании» при долгом тапе (≥200мс)
    const kbdRef = useRef(null);

    // Гасим системный long-press жест Android (его haptic-тик «через секунду» + callout): нативный
    // touchstart c preventDefault. React вешает touch-листенеры пассивно — preventDefault там молча
    // игнорируется, поэтому только ref + addEventListener с { passive:false }. Клавиши работают на
    // pointer-событиях, так что ввод/поп-ап не страдают. Исключаем «Не знаю» — она на onClick,
    // а preventDefault на touchstart убил бы синтетический click.
    useEffect(() => {
        const el = kbdRef.current;
        if (!el) return;
        const onTouchStart = (e) => { if (!e.target.closest(".kbd__key--dunno")) e.preventDefault(); };
        el.addEventListener("touchstart", onTouchStart, { passive: false });
        return () => el.removeEventListener("touchstart", onTouchStart);
    }, []);
    const gated = typeof remainingOf === "function";
    const active = (c) => !gated || remainingOf(c) > 0;             // свободный режим — всё активно
    const isOff = (c) => gated && (needed?.[c] || 0) === 0;          // буква не из слова (подсказка)
    const isSpent = (c) => gated && (needed?.[c] || 0) > 0 && remainingOf(c) <= 0;
    const badge = (c) => (gated && (needed?.[c] || 0) > 1) ? remainingOf(c) : null;

    const keyDown = (c, e) => {
        e?.preventDefault();
        if (!active(c)) return;
        pressingRef.current = c; setPop(c);
        pressTsRef.current = Date.now();
        buzz();   // одна вибрация на нажатие
    };
    const keyUp = (c, e) => {
        if (pressingRef.current === c) {
            if (active(c)) onType?.(c);
            if (Date.now() - pressTsRef.current >= 200) buzz();   // долгий тап (≥200мс) — вибрация и на отпускании
        }
        pressingRef.current = null; setPop(null);
        e?.currentTarget?.blur?.();   // снять фокус после отпускания — клавиша не «залипает» подсвеченной
    };
    const keyCancel = (c) => { if (pressingRef.current === c) { pressingRef.current = null; setPop(null); } };

    // ⌫ «Стереть»: одиночный тап — удалить символ; удержание — авто-повтор (после паузы 400мс,
    // далее каждые 60мс), свой поп-ап с иконкой. Повтор работает за счёт функционального setState
    // в родителях (onBackspace = s => s.slice(0,-1)).
    const BK = "bk";   // сентинел поп-апа для ⌫
    const bkTimer = useRef(null);
    const bkEndRef = useRef(null);   // хранит ИМЕННО навешенный на window обработчик отпускания
    const bkStop = () => {
        const t = bkTimer.current;
        if (t) { clearTimeout(t.to); clearInterval(t.iv); bkTimer.current = null; }
        if (bkEndRef.current) {
            window.removeEventListener("pointerup", bkEndRef.current);
            window.removeEventListener("pointercancel", bkEndRef.current);
            bkEndRef.current = null;
        }
        setPop((p) => (p === BK ? null : p));
    };
    const bkDown = (e) => {
        e?.preventDefault();
        if (!canBackspace) return;
        bkStop();
        buzz(); onBackspace?.(); setPop(BK);
        // отпускание ловим на window — кнопка может стать disabled (поле опустело) и не дать pointerup
        const end = () => bkStop();
        bkEndRef.current = end;
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        bkTimer.current = { to: setTimeout(() => {
            bkTimer.current = { to: null, iv: setInterval(() => { onBackspace?.(); buzz(); }, 60) };
        }, 400), iv: null };
    };
    useEffect(() => bkStop, []);   // подчистить таймеры/слушатели при размонтировании

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
        <div className="kbd" ref={kbdRef} onContextMenu={(e) => e.preventDefault()}>
            {KBD_ROWS.map((row, ri) => {
                const last = ri === KBD_ROWS.length - 1;
                return (
                    <div className={"kbd__row" + (last ? " kbd__row--last" : "")} key={ri}>
                        {/* левый край нижнего ряда: «Не знаю» (Сборка) ИЛИ нейтральная заглушка (Ввод —
                            «Не знаю» вынесена в неприметный угол, а пустоту закрываем, чтоб не мозолила) */}
                        {last && showDunno && onDunno && (
                            <button type="button" className="kbd__key kbd__key--dunno" onClick={(e) => { onDunno(); e.currentTarget.blur(); }}>{dunnoLabel}</button>
                        )}
                        {last && leftFiller && !(showDunno && onDunno) && (
                            <span className="kbd__key kbd__key--filler" aria-hidden="true" />
                        )}
                        {row.map((c) => symKey(c))}
                        {/* ⌫ — в конце последнего буквенного ряда (как в Gboard) */}
                        {last && (
                            <button className="kbd__key kbd__key--act" disabled={!canBackspace} aria-label="backspace"
                                onPointerDown={bkDown} onPointerLeave={bkStop}
                                onPointerUp={(e) => e.currentTarget.blur()}>
                                <Icon n="arrow-left" />
                                {pop === BK && <span className="kbd__pop kbd__pop--icon" aria-hidden="true"><Icon n="arrow-left" /></span>}
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
