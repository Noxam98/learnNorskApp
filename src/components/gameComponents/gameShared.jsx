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

export const uniq = (arr) => {
    const s = new Set();
    return arr.filter((x) => x && !s.has(x.toLowerCase()) && s.add(x.toLowerCase()));
};

// Регулятор громкости звука прямо в окне игры/экзамена: кнопка-иконка открывает
// поповер с ползунком 0..100%. 0% = выкл (synced с soundOn). Закрытие — тап вне.
const SoundControl = ({ t }) => {
    const [open, setOpen] = useState(false);
    const soundOn = useSystemStore((s) => s.soundOn);
    const soundVolume = useSystemStore((s) => s.soundVolume);
    const pct = soundOn ? Math.round((soundVolume ?? 1) * 100) : 0;
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
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
export const PlayTopBar = ({ correctCount, wrongCount, onExit, t, centerNode = null }) => {
    return (
        <div className="ptop">
            <a className="ptop__brand" onClick={onExit} style={{ cursor: "pointer" }}>
                <BrandMark />
                <span className="brand__name">Lære<b>·</b>Norsk</span>
            </a>
            <div className="pstats">
                {centerNode != null ? centerNode : (
                    <>
                        <span className="stat stat--ok"><Icon n="check" sm /> {correctCount}</span>
                        <span className="stat stat--err"><Icon n="x" sm /> {wrongCount}</span>
                    </>
                )}
            </div>
            <SoundControl t={t} />
            <a className="pexit" onClick={onExit} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
        </div>
    );
};

// Ранг ступени рампы слова для цвета сегмента: 0 — карточка (серый), 1..4 — зелёный по нарастанию,
// 4 = ввод с клавиатуры (самый насыщенный). cell — клетка рампы (card/choice_*/build_*/input_* | cloze_1..3).
const RAMP_RANK = { card: 0, study: 0, choice_no2int: 1, choice_int2no: 2, build_int2no: 3, input_int2no: 4, cloze_1: 1, cloze_2: 2, cloze_3: 3 };
export const stageRank = (cell) => RAMP_RANK[cell || "card"] ?? 0;

// Сегментный прогресс-бар (сегмент на слово). Сегмент — строка (легаси: "ok"/"err"/"now"/"done"/
// "card") ИЛИ объект { state, rank }: пройденные слова красятся ЦВЕТОМ СТАДИИ (rank 0 серый …
// 4 насыщенный зелёный), текущее — акцент «ты здесь», предстоящие — пустые (появляются по мере прохождения).
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
