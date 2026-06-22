// Общие утилиты и презентационные части для игр (Ввод/Выбор/Изучение).
// Игровая ЛОГИКА живёт в своих файлах (InputGame.jsx, ChoiceGame.jsx, StudyGame.jsx),
// здесь только переиспользуемая «обвязка».
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { posMeta, chipPrefix } from "../ui/pos.js";

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

// Верхняя панель: бренд, счётчики верно/ошибки, выход.
export const PlayTopBar = ({ correctCount, wrongCount, onExit, t }) => (
    <div className="ptop">
        <a className="ptop__brand" onClick={onExit} style={{ cursor: "pointer" }}>
            <BrandMark />
            <span className="brand__name">Lære<b>·</b>Norsk</span>
        </a>
        <div className="pstats">
            <span className="stat stat--ok"><Icon n="check" sm /> {correctCount}</span>
            <span className="stat stat--err"><Icon n="x" sm /> {wrongCount}</span>
        </div>
        <a className="pexit" onClick={onExit} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
    </div>
);

// Сегментный прогресс-бар (сегмент на слово, цвет по результату).
export const ProgressSegments = ({ segs }) => (
    <div className="pbar pbar--seg" aria-hidden="true">
        {segs.map((s, i) => <span key={i} className={`pseg${s ? " is-" + s : ""}`} />)}
    </div>
);

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
