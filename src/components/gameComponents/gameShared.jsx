// @ts-check
// Общие утилиты и презентационные части для игр (Ввод/Выбор/Изучение).
// Игровая ЛОГИКА живёт в своих файлах (InputGame.jsx, ChoiceGame.jsx, StudyGame.jsx),
// здесь только переиспользуемая «обвязка».
import { useEffect, useState, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { posMeta, chipPrefix } from "../ui/pos.js";
import { useSystemStore } from "../../store/systemStore.jsx";

// Блокировка скролла фона на время полноэкранной активности (игра/карточки/экзамен).
// Ref-counted: при наложении маунтов (переход между шагами) не «протекает» — фон
// разблокируется ТОЛЬКО когда отпущен последний замок, и восстанавливается ИСХОДНОЕ значение.
let _lockN = 0;
let _prevLock = null;
export function useScrollLock() {
    useEffect(() => {
        if (_lockN++ === 0) {
            const b = document.body, h = document.documentElement;
            _prevLock = { bo: b.style.overflow, ho: h.style.overflow, ob: b.style.overscrollBehavior };
            b.style.overflow = "hidden"; h.style.overflow = "hidden"; b.style.overscrollBehavior = "none";
        }
        return () => {
            if (--_lockN <= 0) {
                _lockN = 0;
                if (_prevLock) {
                    const b = document.body, h = document.documentElement;
                    b.style.overflow = _prevLock.bo; h.style.overflow = _prevLock.ho; b.style.overscrollBehavior = _prevLock.ob;
                    _prevLock = null;
                }
            }
        };
    }, []);
}

// Норвежское слово с приставкой по настройкам: артикль (en/ei/et) у сущ., «å» у глаг. Иначе — как есть.
// Применять там, где слово ВЫВОДИТСЯ для чтения (вопрос/карточка/раскрытый ответ), а не в вариантах
// выбора (там приставка выдала бы верный вариант) и не в строке ввода (артикль не печатают).
export const noWithPrefix = (no, word, { articles = true, verbAa = true } = {}) => {
    const pfx = chipPrefix(posMeta(word?.part_of_speech).key, word?.forms, { articles, verbAa });
    return pfx ? `${pfx} ${no}` : no;
};

export const ENDONYM = { ru: "русский", ukr: "українську", en: "English", pl: "polski", lt: "lietuvių" };

// Честный «Не знаю» в заданиях: подсветит верный ответ, но засчитает как НЕ угадано.
export const DUNNO = { ru: "Не знаю", ukr: "Не знаю", en: "I don't know", pl: "Nie wiem", lt: "Nežinau" };

/** @type {import('react').CSSProperties} */
export const PLAY_STYLE = { position: "fixed", inset: 0, zIndex: 90, overflow: "hidden" };

export const filterChosenWords = (dictList) =>
    dictList.flatMap((d) => d.words.filter((w) => w?.gameData?.isChoosedToGame));

export const pickWord = (pool, excludeIds) => {
    const left = pool.filter((w) => !excludeIds.includes(w.id));
    return left.length ? left[Math.floor(Math.random() * left.length)] : null;
};

export const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// Снисходительная сверка ввода: å≈a, ø≈o, æ≈ae + срезаем прочие диакритики (é→e).
// Норвежская раскладка не у всех — печать без спецсимволов засчитывается.
export const foldLoose = (s) => (s || "").trim().toLowerCase()
    .replace(/å/g, "a").replace(/ø/g, "o").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

// \u041b\u0451\u0433\u043a\u0430\u044f \u043d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u041e\u041f\u0415\u0427\u0410\u0422\u041e\u041a \u043f\u043e \u0420\u0415\u0410\u041b\u042c\u041d\u042b\u041c \u043a\u043b\u0430\u0432\u0438\u0448\u0430\u043c: \u0440\u0435\u0433\u0438\u0441\u0442\u0440 + \u043f\u0440\u043e\u0431\u0435\u043b\u044b, \u043d\u043e \u00e5/\u00f8/\u00e6
// \u0421\u041e\u0425\u0420\u0410\u041d\u042f\u0415\u041c (\u0432 \u043e\u0442\u043b\u0438\u0447\u0438\u0435 \u043e\u0442 foldLoose, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0441\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0438\u0445 \u0432 a/o/ae). \u041d\u0443\u0436\u043d\u043e, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0441\u0435\u0434\u0441\u0442\u0432\u043e \u043a\u043b\u0430\u0432\u0438\u0448
// \u0441\u0447\u0438\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u043c \u043a\u043d\u043e\u043f\u043a\u0430\u043c (\u00e5 \u0440\u044f\u0434\u043e\u043c \u0441 \u00f8/p/\u00e6), \u0430 \u043d\u0435 \u043f\u043e \u0441\u0432\u0451\u0440\u043d\u0443\u0442\u044b\u043c a/o \u2014 \u0438\u043d\u0430\u0447\u0435 \u043f\u0440\u043e\u043c\u0430\u0445 \u00e5\u2192\u00f8 \u0442\u0435\u0440\u044f\u043b\u0441\u044f.
export const foldLight = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

export const uniq = (arr) => {
    const s = new Set();
    return arr.filter((x) => x && !s.has(x.toLowerCase()) && s.add(x.toLowerCase()));
};

// Слоты «импровизированного инпута» (build-line) с мигающим курсором. tpl=true (после ошибки) —
// ШАБЛОН: тусклые ещё-не-введённые буквы цели + красным символ не на своём месте/лишний. tpl=false —
// просто набранное. typedArr/targetChars — массивы символов. Используют BuildGame и InputGame.
export const tplSlots = (typedArr, targetChars, { tpl = false, caret = false } = {}) => {
    const slots = [];
    const n = tpl ? Math.max(targetChars.length, typedArr.length) : typedArr.length;
    const caretAt = caret ? typedArr.length : -1;
    for (let i = 0; i < n; i++) {
        if (i === caretAt) slots.push(<span key="caret" className="build-line__caret" />);
        const ch = typedArr[i];
        if (ch != null) {
            const bad = tpl && (i >= targetChars.length || ch !== targetChars[i]);
            slots.push(<span key={i} className={bad ? "build-line__bad" : undefined}>{ch === " " ? " " : ch}</span>);
        } else if (tpl && i < targetChars.length) {
            slots.push(<span key={i} className="build-line__ghost">{targetChars[i] === " " ? " " : targetChars[i]}</span>);
        }
    }
    if (caretAt >= n) slots.push(<span key="caret" className="build-line__caret" />);
    return slots;
};

// «Отличается не более чем на одну правку» (OSA-1): подстановка одного символа, пропуск/лишний
// символ ИЛИ перестановка двух соседних. Для снисходительного зачёта опечаток.
// Строки сравнивать УЖЕ свёрнутыми (foldLoose). a === b обрабатываем выше как точное совпадение.
// adjacent(c1,c2) (необязательно): если задан — ОДНУ замену прощаем только когда клавиши соседние
// (палец соскользнул); пропуск/лишняя/перестановка — независимо от клавиш (механический слип).
/**
 * @param {string} a
 * @param {string} b
 * @param {((c1: string, c2: string) => boolean) | null} [adjacent]
 */
export const withinOneEdit = (a, b, adjacent = null) => {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la === lb) {
        const idx = [];
        for (let i = 0; i < la; i++) if (a[i] !== b[i]) { idx.push(i); if (idx.length > 2) return false; }
        if (idx.length <= 1) {
            if (idx.length === 0) return true;
            return adjacent ? !!adjacent(a[idx[0]], b[idx[0]]) : true;   // одна замена (с предикатом — только соседние)
        }
        // перестановка двух соседних
        return idx.length === 2 && idx[1] === idx[0] + 1 && a[idx[0]] === b[idx[1]] && a[idx[1]] === b[idx[0]];
    }
    // длины различаются на 1 → пропуск/лишний символ: short вкладывается в long с одним пропуском
    const [s, l] = la < lb ? [a, b] : [b, a];
    let i = 0, j = 0, skipped = false;
    while (i < s.length && j < l.length) {
        if (s[i] === l[j]) { i++; j++; }
        else { if (skipped) return false; skipped = true; j++; }
    }
    return true;
};

// Тумблер «автопереход» прямо в шапке игры: тап переключает авто-переход после верного ответа
// (выкл — листать тапом/пробелом). Иконка тускнеет, когда выключено (как кнопка звука).
const AutoAdvanceToggle = ({ t }) => {
    const autoAdvance = useSystemStore((s) => s.autoAdvance);
    return (
        <button className={"ptop__snd" + (autoAdvance ? "" : " is-off")}
            title={t.autoAdvanceTip} aria-label={t.autoAdvanceTip} aria-pressed={autoAdvance}
            onClick={(e) => { e.stopPropagation(); useSystemStore.getState().setAutoAdvance(!autoAdvance); }}>
            <Icon n="fast-forward" sm />
        </button>
    );
};

// Регулятор громкости звука прямо в окне игры/экзамена: кнопка-иконка открывает
// поповер с ползунком 0..100%. 0% = выкл (synced с soundOn). Закрытие — тап вне.
const SoundControl = ({ t }) => {
    const [open, setOpen] = useState(false);
    const soundOn = useSystemStore((s) => s.soundOn);
    const soundVolume = useSystemStore((s) => s.soundVolume);
    const pct = soundOn ? Math.round((soundVolume ?? 1) * 100) : 0;
    const ref = useRef(/** @type {HTMLDivElement | null} */(null));
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("pointerdown", onDoc, true);
        return () => document.removeEventListener("pointerdown", onDoc, true);
    }, [open]);
    const setPct = (v) => useSystemStore.getState().setSoundVolume(v / 100);
    return (
        <div className="ptop__snd-wrap" ref={ref}>
            <button className={"ptop__snd" + (pct === 0 ? " is-off" : "")} title={t.gameSounds} aria-label={t.gameSounds}
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
                <Icon n="volume" sm />
            </button>
            {open && (
                <div className="snd-pop" onClick={(e) => e.stopPropagation()}>
                    <Icon n="volume" sm className={pct === 0 ? "snd-pop__mute" : ""} />
                    <input type="range" min="0" max="100" step="5" value={pct}
                        onChange={(e) => setPct(Number(e.target.value))} aria-label={t.gameSounds} />
                    <span className="snd-pop__val">{pct}%</span>
                </div>
            )}
        </div>
    );
};

// Верхняя панель: бренд, счётчики верно/ошибки (или произвольный centerNode — напр. «N/30»
// в экзамене, где ✓/✗ по ходу не показываем), регулятор громкости, выход.
// Маленький ненавязчивый значок «повтор» — для слов из повторений (а не новых). Только иконка ↻
// (подпись — в title/aria, по наведению/тапу), чтобы не мешать на экранах, где почти всё — повторы.
const REPEAT_LBL = { ru: "повтор", ukr: "повтор", en: "review", pl: "powtórka", lt: "kartojimas" };
export const RepeatBadge = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const txt = REPEAT_LBL[lang] || REPEAT_LBL.en;
    return (
        <span title={txt} aria-label={txt} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
            color: "var(--fjord-600)", background: "var(--fjord-50)", border: "1px solid var(--fjord-300)",
            width: 26, height: 26, borderRadius: "var(--r-full)",
        }}>
            <Icon n="repeat" sm />
        </span>
    );
};

/** @param {{correctCount?:number, wrongCount?:number, onExit?:any, t:any, centerNode?:any, tag?:any}} props */
export const PlayTopBar = ({ correctCount, wrongCount, onExit, t, centerNode = null, tag = null }) => {
    return (
        <div className="ptop">
            <a className="ptop__brand" onClick={onExit} style={{ cursor: "pointer" }}>
                <BrandMark />
                <span className="brand__name">Lære<b>·</b>Norsk</span>
            </a>
            {tag}
            <div className="pstats">
                {centerNode != null ? centerNode : (
                    <>
                        <span className="stat stat--ok"><Icon n="check" sm /> {correctCount}</span>
                        <span className="stat stat--err"><Icon n="x" sm /> {wrongCount}</span>
                    </>
                )}
            </div>
            <AutoAdvanceToggle t={t} />
            <SoundControl t={t} />
            <a className="pexit" onClick={onExit} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
        </div>
    );
};

// Ранг ступени рампы слова для цвета сегмента: 0 — карточка (серый), 1..4 — зелёный по нарастанию,
// 4 = ввод с клавиатуры (самый насыщенный). cell — клетка рампы (card/choice_*/build_*/input_* | cloze_1..3).
const RAMP_RANK = { card: 0, study: 0, choice_no2int: 1, choice_int2no: 2, build_int2no: 3, input_int2no: 4, cloze_1: 1, cloze_2: 2, cloze_3: 3 };
export const stageRank = (cell) => RAMP_RANK[cell || "card"] ?? 0;

// Транспонировка звуков «вход в задание»/«верно» по стадии рампы (rank 0..4): чем дальше слово
// по рампе — тем выше тон (та же узнаваемая фраза). Диатоника до-ре-ми-фа-соль (полутоны).
const RANK_SEMIS = [0, 2, 4, 5, 7];
export const semisOf = (rank) => RANK_SEMIS[rank] ?? 0;

// Сегментный прогресс-бар (сегмент на слово). Сегмент — строка (легаси: "ok"/"err"/"now"/"done"/
// "card") ИЛИ объект { state, rank }: пройденные слова красятся ЦВЕТОМ СТАДИИ (rank 0 серый …
// 4 насыщенный зелёный), текущее — акцент «ты здесь», предстоящие — пустые (появляются по мере прохождения).
/**
 * @param {{ segs: import('../../types.js').ProgressSeg[], status?: import('../../types.js').GameStatus }} props
 */
export const ProgressSegments = ({ segs, status }) => {
    // Лайфцикл ТЕКУЩЕГО сегмента: пока вопрос не отвечен (ASKING) — мигает «будущим» зелёным
    // (цвет следующей стадии); сразу после ответа ~1с — нейтральный (ждём итог); затем верно →
    // зелёный своей стадии, неверно → оранжевый (как было). resolved = прошла ли секунда ожидания.
    const [resolved, setResolved] = useState(false);
    useEffect(() => {
        if (status === "CORRECT" || status === "INCORRECT") {
            setResolved(false);
            const id = setTimeout(() => setResolved(true), 1000);
            return () => clearTimeout(id);
        }
        setResolved(false);
    }, [status]);

    return (
        <div className="pbar pbar--seg" aria-hidden="true">
            {segs.map((s, i) => {
                const isObj = s && typeof s === "object";
                const state = isObj ? (s.state || "") : (s || "");
                const r = isObj ? (s.rank ?? 0) : 0;
                let cls = "pseg";
                if (isObj) {
                    if (state === "now") {
                        if (status === "CORRECT" || status === "INCORRECT") {
                            if (!resolved) cls += " is-pending";                    // ждём итог — нейтральный
                            else if (status === "CORRECT") cls += " pseg--st" + r;  // верно → зелёный стадии
                            else cls += " is-wrong";                                // неверно → оранжевый
                        } else {
                            cls += " pseg--st" + Math.min(r + 1, 4) + " is-blink";  // ASKING → мигает будущим зелёным
                        }
                    } else if (state === "err") cls += " is-wrong";                 // пройдено с ошибкой → оранжевый
                    else if (state !== "future") cls += " pseg--st" + r;            // пройдено верно → зелёный стадии
                    // future → базовый «пустой» сегмент
                } else if (state) {
                    cls += " is-" + state;
                }
                return <span key={i} className={cls} />;
            })}
        </div>
    );
};

// Экран «нет слов для игры».
export const NoWords = ({ t, onBack }) => (
    <div className="play" data-state="asking" style={PLAY_STYLE}>
        <div className="pstage">
            <p className="qprompt">{t.noWordsToPlay}</p>
            <button className="gbtn gbtn--accent" onClick={onBack}>
                <Icon n="arrow-left" sm /> {t.backToWordSelection}
            </button>
        </div>
    </div>
);

// Итоговый экран.
export const FinishScreen = ({ score, knownFirstTry, missedCount, total, t, onRestart, onExit }) => (
    <div className="finish" style={{ display: "block" }}>
        <div className="qcount">{t.gameFinished}</div>
        <div className="finish__score">{score}%</div>
        <div className="finish__sub">{knownFirstTry} / {total}</div>
        <div className="finish__grid">
            <div className="fstat"><div className="fstat__n ok">{knownFirstTry}</div><div className="fstat__l">{t.guessedStats?.[0]}</div></div>
            <div className="fstat"><div className="fstat__n err">{missedCount}</div><div className="fstat__l">{t.mistakesMade}</div></div>
            <div className="fstat"><div className="fstat__n">{total}</div><div className="fstat__l">{t.word}</div></div>
        </div>
        <div className="pcta">
            <button className="gbtn gbtn--accent" onClick={onRestart}><Icon n="play" sm /> {t.playAgain}</button>
            <button className="gbtn gbtn--ghost" onClick={onExit}><Icon n="arrow-left" sm /> {t.backToWordSelection}</button>
        </div>
    </div>
);
