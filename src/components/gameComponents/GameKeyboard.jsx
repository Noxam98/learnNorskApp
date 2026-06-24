// Экранная клавиатура «как Gboard»: поп-ап превью буквы, хаптик, ВВОД символа на pointerup
// (над той же клавишей; уход пальца — без ввода). Контролируемая: родитель владеет введённой
// строкой и решает submit. Два режима:
//  • «сборка» (gated): задан remainingOf/needed → активны только буквы слова, бейдж-счётчик
//    повторов, лишние приглушены (подсказка). Используется в «Собери из букв».
//  • свободный: без remainingOf → все буквы активны, без подсказок. Используется в «Вводе» (норвежское слово).
import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon.jsx";
import { useSystemStore, VIBE_MS } from "../../store/systemStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import api from "../tools/api.js";

// Норвежская раскладка QWERTY (нижний регистр).
export const KBD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "å"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ø", "æ"],
    ["z", "x", "c", "v", "b", "n", "m"],
];
export const KBD_SET = new Set(KBD_ROWS.flat());

// Физическая клавиатура (ПК): позиция клавиши (e.code) → буква НАШЕЙ норв. раскладки.
// По code, а НЕ по e.key — чтобы НЕ зависеть от раскладки ОС (рус/eng/no дают тот же результат).
const CODE_MAP = {
    KeyQ: "q", KeyW: "w", KeyE: "e", KeyR: "r", KeyT: "t", KeyY: "y", KeyU: "u", KeyI: "i", KeyO: "o", KeyP: "p", BracketLeft: "å",
    KeyA: "a", KeyS: "s", KeyD: "d", KeyF: "f", KeyG: "g", KeyH: "h", KeyJ: "j", KeyK: "k", KeyL: "l", Semicolon: "ø", Quote: "æ",
    KeyZ: "z", KeyX: "x", KeyC: "c", KeyV: "v", KeyB: "b", KeyN: "n", KeyM: "m",
    Minus: "-", Slash: "-", Space: " ",
};

// Сноска «можно печатать с клавиатуры» — показываем ОДИН раз (localStorage), только на ПК и
// только когда юзер начал набор с ЭКРАННОЙ (тыкает мышью). Чтобы не мешать каждый раз.
const HINT_KEY = "kbd_phys_hint_seen";
const KBD_HINT = {
    ru: "Можно печатать с клавиатуры", en: "You can type on your keyboard",
    ukr: "Можна друкувати з клавіатури", pl: "Możesz pisać na klawiaturze", lt: "Galima rinkti klaviatūra",
};
const GOT_IT = { ru: "Понял", en: "Got it", ukr: "Зрозуміло", pl: "Rozumiem", lt: "Supratau" };
let _hintShownSession = false;   // тост-подсказку показываем максимум раз за сессию (не мешать каждое слово)
// Только лептоп/десктоп-вёрстка: мышь (hover+точный указатель) И широкий экран (не мобильный layout ≤640px).
const _isDesktop = () => { try { return window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)").matches; } catch { return false; } };

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
    const [isDesktop] = useState(_isDesktop);
    const uiLang = useSystemStore((s) => s.currentLanguage);   // язык ИНТЕРФЕЙСА (не клавиш) — для текста тоста
    const hintSeenDB = useAuthStore((s) => s.user?.gamePrefs?.kbdHintSeen);   // флаг из БД (между устройствами)
    const seenRef = useRef(undefined);
    if (seenRef.current === undefined) { try { seenRef.current = !!hintSeenDB || !!localStorage.getItem(HINT_KEY); } catch { seenRef.current = !!hintSeenDB; } }
    // «Понял» / первый физ-ввод → убрать тост и запомнить навсегда: localStorage + БД (gamePrefs).
    const persistSeen = () => {
        try { useSystemStore.getState().showToast(""); } catch { /* */ }   // скрыть тост-подсказку
        if (seenRef.current) return;
        seenRef.current = true;
        try { localStorage.setItem(HINT_KEY, "1"); } catch { /* no-op */ }
        api.setGamePrefs({ kbdHintSeen: true }).catch(() => { /* офлайн — localStorage уже хватит */ });
    };
    // ПК: показать СИСТЕМНЫЙ тост (с кнопкой «Понял», не гаснет сам) ОДИН раз за сессию, когда юзер
    // начал набор МЫШЬЮ по экранной клавише (если ещё не нажимал «Понял»). Триггер — из keyDown.
    const maybeShowHint = () => {
        if (!isDesktop || seenRef.current || _hintShownSession) return;
        _hintShownSession = true;
        try {
            useSystemStore.getState().showToast(KBD_HINT[uiLang] || KBD_HINT.en, "info", {
                persist: true, action: { label: GOT_IT[uiLang] || GOT_IT.en, onClick: persistSeen },
            });
        } catch { /* */ }
    };

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
        maybeShowHint();   // начал набор мышью на ПК → подсказать про физ-клавиатуру
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

    // ✓ «Проверить»: как буквы — поп-ап на нажатии (другого цвета), а СРАБАТЫВАЕТ на ОТПУСКАНИИ
    // (уход пальца с кнопки — без отправки). Раньше отправлял на pointerdown.
    const GO = "go";
    const goPressRef = useRef(false);
    const goDown = (e) => { e?.preventDefault(); if (!canSubmit) return; goPressRef.current = true; setPop(GO); buzz(); pressTsRef.current = Date.now(); };
    const goUp = (e) => {
        e?.currentTarget?.blur?.();
        if (goPressRef.current && canSubmit) { onSubmit?.(); if (Date.now() - pressTsRef.current >= 200) buzz(); }
        goPressRef.current = false; setPop((p) => (p === GO ? null : p));
    };
    const goCancel = () => { goPressRef.current = false; setPop((p) => (p === GO ? null : p)); };

    // ── Физическая клавиатура (ПК): печать + СИНХРОН с экранной (поп-ап над нажатой клавишей) ──
    // Раскладка-независимо: мапим по e.code. Буквы НЕ из слова в «сборке» НЕ блокируем — пробрасываем
    // в onType (игра подсветит их красным). Свежие колбэки/флаги читаем через ref (слушатель — один раз).
    const physRef = useRef({});
    physRef.current = { onType, onBackspace, onSubmit, canBackspace, canSubmit, buzz, persistSeen };
    useEffect(() => {
        const isField = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        // воспользовались физ-клавиатурой → сноска больше не нужна (скрыть + запомнить навсегда, в т.ч. в БД)
        const markPhys = () => physRef.current.persistSeen?.();
        const down = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || isField(e.target)) return;
            const p = physRef.current;
            if (e.code === "Backspace") { e.preventDefault(); if (p.canBackspace) { p.onBackspace?.(); p.buzz(); setPop(BK); markPhys(); } return; }
            if (e.code === "Enter" || e.code === "NumpadEnter") { e.preventDefault(); if (p.canSubmit && !e.repeat) { p.onSubmit?.(); p.buzz(); setPop(GO); markPhys(); } return; }
            if (e.repeat) return;                     // буквы — один ввод на нажатие
            const c = CODE_MAP[e.code];
            if (!c) return;
            e.preventDefault();
            p.onType?.(c); p.buzz(); setPop(c); markPhys();   // ВВОД на keydown; поп-ап = синхрон с экранной
        };
        const up = (e) => {
            if (e.code === "Backspace") return setPop((x) => (x === BK ? null : x));
            if (e.code === "Enter" || e.code === "NumpadEnter") return setPop((x) => (x === GO ? null : x));
            const c = CODE_MAP[e.code];
            if (c) setPop((x) => (x === c ? null : x));
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, []);

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
            {/* «Не знаю» — НАД клавиатурой (а не клавишей среди букв): единообразно во всех экранных
                клавиатурах, чтобы случайно не задеть. Неприметная, в правом углу над панелью. */}
            {showDunno && onDunno && (
                <button type="button" className="kbd-dunno" onClick={(e) => { onDunno(); e.currentTarget.blur(); }}>{dunnoLabel}</button>
            )}
            {KBD_ROWS.map((row, ri) => {
                const last = ri === KBD_ROWS.length - 1;
                return (
                    <div className={"kbd__row" + (last ? " kbd__row--last" : "")} key={ri}>
                        {/* нижний буквенный ряд короче — слева заглушка для баланса с ⌫ справа (по центру) */}
                        {last && <span className="kbd__key kbd__key--filler" aria-hidden="true" />}
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
                    onPointerDown={goDown} onPointerUp={goUp} onPointerLeave={goCancel} onPointerCancel={goCancel}>
                    <Icon n="check" />
                    {pop === GO && <span className="kbd__pop kbd__pop--go" aria-hidden="true"><Icon n="check" /></span>}
                </button>
            </div>
        </div>
    );
}

export default GameKeyboard;
