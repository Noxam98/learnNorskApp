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
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import api from "../tools/api.js";
import { langGuard } from "../../interface/i18nGuard.js";

// Локализованные aria-label служебных клавиш (⌫/✓/пробел) на 7 языках. Локально (как CellsGame.L),
// чтобы не трогать общий словарь. Раньше были хардкод-строки backspace/check/space (англ. для всех).
const KBD_LBL = langGuard({
    ru:  { backspace: "Стереть", check: "Проверить", space: "Пробел" },
    en:  { backspace: "Backspace", check: "Check", space: "Space" },
    ukr: { backspace: "Стерти", check: "Перевірити", space: "Пробіл" },
    pl:  { backspace: "Backspace", check: "Sprawdź", space: "Spacja" },
    lt:  { backspace: "Trinti", check: "Tikrinti", space: "Tarpas" },
    lv:  { backspace: "Dzēst", check: "Pārbaudīt", space: "Atstarpe" },
    ar:  { backspace: "مسح", check: "تحقّق", space: "مسافة" },
}, "GameKeyboard.KBD_LBL");

// Норвежская раскладка QWERTY (нижний регистр).
export const KBD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "å"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ø", "æ"],
    ["z", "x", "c", "v", "b", "n", "m"],
];
export const KBD_SET = new Set(KBD_ROWS.flat());

// Карта соседства клавиш (для «клавиатурных» опечаток — палец соскользнул на соседнюю клавишу).
// Выводим из раскладки с учётом «ступеньки» рядов (полу-клавиша): соседи = по горизонтали в ряду
// + диагонали сверху/снизу (≈6 клавиш). keysAdjacent(a, b) — соседние ли клавиши a и b.
const _KEY_ADJ = (() => {
    // Реальная вёрстка: ряды 0 и 1 по 11 клавиш и оба ЦЕНТРИРОВАНЫ → выровнены (a ровно под q, без
    // ступеньки); ряд 2 (7 клавиш) центрирован → сдвиг (11−7)/2 = 2. (Раньше тут была ступенька QWERTY
    // [0,0.5,1.0], не совпадавшая с вёрсткой → ассист целил не на тех соседей.)
    const ROW_OFF = [0, 0, 2];
    const pos = /** @type {Record<string,{r:number,x:number}>} */ ({});
    KBD_ROWS.forEach((row, r) => row.forEach((ch, c) => { pos[ch] = { r, x: c + ROW_OFF[r] }; }));
    const adj = /** @type {Record<string, Set<string>>} */ ({});
    const keys = Object.keys(pos);
    for (const a of keys) {
        adj[a] = new Set();
        for (const b of keys) {
            if (a === b) continue;
            const dr = Math.abs(pos[a].r - pos[b].r), dx = Math.abs(pos[a].x - pos[b].x);
            if (dr === 0 ? dx === 1 : (dr === 1 && dx <= 0.5 + 1e-9)) adj[a].add(b);
        }
    }
    return adj;
})();
export const keysAdjacent = (a, b) => !!(a && b && _KEY_ADJ[a]?.has(b));

// «Ассист» от опечаток: незаметно для юзера расширяем зону тапа ОЖИДАЕМОЙ след. буквы (assistKey)
// на ASSIST_PX пикселей во все стороны. Тап по краю СОСЕДНЕЙ клавиши (палец слегка соскользнул)
// у границы с ожидаемой → засчитывается как ожидаемая. Глубина «захвата» в соседнюю клавишу ≈
// ASSIST_PX − зазор-ряда (~5px), т.е. пара миллиметров у границы — не крадём осознанные тапы по центру.
const ASSIST_PX = 12;

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
 *   assistKey?: string | null,
 * }} props
 */
export function GameKeyboard({
    lang, remainingOf, needed, extras = /** @type {string[]} */([]),
    canSubmit = false, canBackspace = false,
    onType, onBackspace, onSubmit, onDunno, dunnoLabel, showDunno = false,
    assistKey = null,
}) {
    const vibration = useSystemStore((s) => s.vibration);
    const vibeStrength = useSystemStore((s) => s.vibrationStrength);
    const kbdAssist = useSystemStore((s) => s.kbdAssist);          // расширять зону тапа ожидаемой буквы
    const showZones = useSystemStore((s) => s.kbdAssistZones);     // отладка: подсвечивать зону
    const buzz = () => { if (!vibration) return; try { navigator.vibrate?.(VIBE_MS[vibeStrength] || VIBE_MS.mid); } catch { /* нет вибро — ок */ } };
    const [pop, setPop] = useState(null);
    const pressingRef = useRef(null);
    const typeAsRef = useRef(null);   // что реально ВВЕСТИ на отпускании: ассист мог перенацелить с нажатой на ожидаемую
    const pointerIdRef = useRef(null);   // мультитач: ведём только ПОСЛЕДНИЙ палец; новое касание коммитит предыдущий
    const pressTsRef = useRef(0);   // момент нажатия — для вибрации «на отпускании» при долгом тапе (≥200мс)
    const kbdRef = useRef(null);
    const [isDesktop] = useState(_isDesktop);
    const uiLang = useSystemStore((s) => s.currentLanguage);   // язык ИНТЕРФЕЙСА (не клавиш) — для текста тоста
    const t = interfaceTranslate[uiLang] || interfaceTranslate.en;
    const kl = KBD_LBL[uiLang] || KBD_LBL.en;   // локализованные подписи служебных клавиш (⌫/✓/пробел)
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
            useSystemStore.getState().showToast(t.kbdHint, "info", {
                persist: true, action: { label: t.kbdGotIt, onClick: persistSeen },
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

    // Ожидаемая след. буква (от родителя) — только если это реальная клавиша нашей раскладки и активна.
    // Для подсветки зоны (отладка) считаем независимо от kbdAssist; перенацеливание тапа — только при kbdAssist.
    const predicted = (assistKey && KBD_SET.has(assistKey) && active(assistKey)) ? assistKey : null;

    // Перенацеливание у границы: нажата соседняя к ожидаемой клавиша (c), а палец попал в расширенную
    // (±ASSIST_PX) зону ожидаемой → вернуть ожидаемую. Иначе — нажатую как есть.
    const correctKey = (c, e) => {
        if (!kbdAssist || !predicted || predicted === c || !keysAdjacent(c, predicted)) return c;
        if (!e || e.clientX == null) return c;
        const el = kbdRef.current?.querySelector(`[data-k="${predicted}"]`);
        if (!el) return c;
        const r = el.getBoundingClientRect();
        const m = ASSIST_PX;
        const inZone = e.clientX >= r.left - m && e.clientX <= r.right + m
            && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
        return inZone ? predicted : c;
    };

    // ── Ввод букв = СЛЕЖЕНИЕ за пальцем по контейнеру (а не «нажми ровно по кнопке») ──
    // pressingRef — идёт ли трекинг; typeAsRef — клавиша ПОД ПАЛЬЦЕМ сейчас (null = вне клавиатуры).
    // Палец ведёт подсветку к БЛИЖАЙШЕЙ клавише (геометрия точка→прямоугольник, кламп у краёв: левее
    // «a»/в паддинг-полосе → «a»); коммит — клавиша под пальцем НА ОТПУСКАНИИ; отпустил дальше ROUTE_PX
    // от любой клавиши («где клавиатуры нет») → НЕ вводим.
    const ROUTE_PX = 30;
    const nearestKey = (x, y) => {
        const kbd = kbdRef.current;
        if (kbd == null || x == null) return null;
        let best = null, bestD = Infinity;
        kbd.querySelectorAll(".kbd__row [data-k]").forEach((el) => {
            const k = el.getAttribute("data-k");
            if (k == null || isOff(k) || isSpent(k)) return;   // только доступные клавиши
            const r = el.getBoundingClientRect();
            const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = k; }
        });
        return bestD <= ROUTE_PX * ROUTE_PX ? best : null;
    };
    const setActive = (k) => {
        if (typeAsRef.current === k) return;
        typeAsRef.current = k;
        setPop(k);   // подсветка (анимация .kbd__pop) на текущей клавише под пальцем
    };
    const commitActive = () => {   // зафиксировать клавишу под текущим пальцем (если валидна и доступна)
        const k = typeAsRef.current;
        if (k != null && active(k)) {
            onType?.(k);
            if (Date.now() - pressTsRef.current >= 200) buzz();
        }
    };
    const trackDown = (e) => {
        // ⌫/✓/«Не знаю» — у них свои обработчики; буквы/пробел ведём здесь
        if (e.target.closest(".kbd__key--act, .kbd__key--go, .kbd-dunno")) return;
        e.preventDefault();
        if (pressingRef.current) commitActive();   // МУЛЬТИТАЧ: новое касание ЗАВЕРШАЕТ предыдущее
        pressingRef.current = true;
        pointerIdRef.current = e.pointerId;         // ведём именно этот (последний) палец
        pressTsRef.current = Date.now();
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* no-op */ }
        const k0 = nearestKey(e.clientX, e.clientY);
        setActive(k0 ? correctKey(k0, e) : null);   // переход с клавиши прежнего пальца на новую
        buzz();
        maybeShowHint();
    };
    const trackMove = (e) => {
        if (!pressingRef.current || e.pointerId !== pointerIdRef.current) return;   // только активный палец
        const k0 = nearestKey(e.clientX, e.clientY);
        setActive(k0 ? correctKey(k0, e) : null);   // подсветка едет за пальцем; вне поля → null
    };
    const trackEnd = (e, commit) => {
        if (!pressingRef.current || e.pointerId !== pointerIdRef.current) return;   // коммитит только активный палец
        pressingRef.current = false;
        pointerIdRef.current = null;
        if (commit) commitActive();   // клавиша под пальцем; null (вне поля) → ничего
        typeAsRef.current = null; setPop(null);
    };

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
    // Раскладка-независимо: мапим по e.code. В «сборке» (gated) уважаем то же гейтирование, что и
    // экранные клавиши: буква не из слова / израсходованная (active(c)=false) — ИГНОРИРУЕТСЯ (экранная
    // такая клавиша disabled; физическая раньше вставляла её всё равно). Свежие колбэки/флаги/active
    // читаем через ref (слушатель навешиваем один раз).
    const physRef = useRef({});
    physRef.current = { onType, onBackspace, onSubmit, canBackspace, canSubmit, buzz, persistSeen, active };
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
            if (p.active && !p.active(c)) return;     // gated: off-word/израсходованная буква — как disabled на экране
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
            <button key={c || "space"} data-k={c} className={"kbd__key" + cls + (isOff(c) ? " is-off" : "") + (isSpent(c) ? " is-spent" : "")}
                disabled={isOff(c) || isSpent(c)} aria-label={ariaLabel} lang={lang} tabIndex={-1}>
                {c === " " ? "" : c}
                {b != null && <span className="kbd__count">{b}</span>}
                {pop === c && <span className="kbd__pop" aria-hidden="true">{c === " " ? "␣" : c}</span>}
                {/* отладка (админ): зона тапа ожидаемой буквы — ровно расширение на ASSIST_PX (inset отрицателен) */}
                {showZones && predicted === c && <span className="kbd__zone" aria-hidden="true" style={{ inset: -ASSIST_PX }} />}
            </button>
        );
    };

    return (
        <div className="kbd" ref={kbdRef} onContextMenu={(e) => e.preventDefault()}
            onPointerDown={trackDown} onPointerMove={trackMove}
            onPointerUp={(e) => trackEnd(e, true)} onPointerCancel={(e) => trackEnd(e, false)}>
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
                            <button className="kbd__key kbd__key--act" disabled={!canBackspace} aria-label={kl.backspace}
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
                {symKey(" ", " kbd__key--space", kl.space)}
                <button className="kbd__key kbd__key--go" disabled={!canSubmit} aria-label={kl.check}
                    onPointerDown={goDown} onPointerUp={goUp} onPointerLeave={goCancel} onPointerCancel={goCancel}>
                    <Icon n="check" />
                    {pop === GO && <span className="kbd__pop kbd__pop--go" aria-hidden="true"><Icon n="check" /></span>}
                </button>
            </div>
        </div>
    );
}

export default GameKeyboard;
