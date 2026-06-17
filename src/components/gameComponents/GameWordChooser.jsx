import { useMemo, useState } from "react";
import { useWordsStore } from "../../store/wordStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { wordCount } from "../tools/plural.js";
import { posMeta, posLabel, chipPrefix } from "../ui/pos.js";

const MIN_WORDS = 10;       // для режимов с проверкой ответа
const MIN_WORDS_STUDY = 1;  // для флешкарт достаточно одного
const ENDONYM = { ru: "Русский", ukr: "Українська", en: "English", pl: "Polski", lt: "Lietuvių" };
// Тип игры: study (флешкарты), input (ввод), choice (выбор)
const TYPES = [
    { key: "study", icon: "layers" },
    { key: "input", icon: "edit" },
    { key: "choice", icon: "check-square" },
];
const TYPE_LABELS = {
    ru:  { study: "Изучение", input: "Ввод", choice: "Выбор" },
    ukr: { study: "Вивчення", input: "Введення", choice: "Вибір" },
    en:  { study: "Study", input: "Typing", choice: "Choice" },
    pl:  { study: "Nauka", input: "Wpisywanie", choice: "Wybór" },
    lt:  { study: "Mokymasis", input: "Įvedimas", choice: "Pasirinkimas" },
};
const TYPE_DESC = {
    ru:  { study: "Карточки: смотри и листай", input: "Печатай перевод", choice: "Выбирай из вариантов" },
    ukr: { study: "Картки: дивись і гортай", input: "Друкуй переклад", choice: "Обирай варіант" },
    en:  { study: "Flashcards: look & flip", input: "Type the translation", choice: "Pick an option" },
    pl:  { study: "Fiszki: patrz i przewijaj", input: "Wpisz tłumaczenie", choice: "Wybierz wariant" },
    lt:  { study: "Kortelės: žiūrėk ir versk", input: "Įrašyk vertimą", choice: "Pasirink variantą" },
};
const ROW_LABELS = {
    ru:  { type: "Режим", dir: "Направление", audio: "Звук" },
    ukr: { type: "Режим", dir: "Напрямок", audio: "Звук" },
    en:  { type: "Mode", dir: "Direction", audio: "Audio" },
    pl:  { type: "Tryb", dir: "Kierunek", audio: "Dźwięk" },
    lt:  { type: "Režimas", dir: "Kryptis", audio: "Garsas" },
};
const SOUND_LABEL = {
    ru: "Озвучивать слова", ukr: "Озвучувати слова", en: "Play audio",
    pl: "Odtwarzaj dźwięk", lt: "Įgarsinti žodžius",
};
const STEP_MODE = {
    ru: "Выбери режим игры", ukr: "Обери режим гри", en: "Choose game mode",
    pl: "Wybierz tryb gry", lt: "Pasirink žaidimo režimą",
};
const STEP_WORDS = {
    ru: "Выбери слова", ukr: "Обери слова", en: "Choose words",
    pl: "Wybierz słowa", lt: "Pasirink žodžius",
};
const SETUP_TITLE = {
    ru: "Настройка игры", ukr: "Налаштування гри", en: "Game setup",
    pl: "Ustawienia gry", lt: "Žaidimo nustatymai",
};

const DictGroup = ({ dictItem, currentLanguage, t, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen);
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const toggleChooseToGame = useWordsStore((s) => s.ToggleChooseToGame);
    const selectFullDictToGame = useWordsStore((s) => s.selectFullDictToGame);
    const words = dictItem.words;
    if (words.length === 0) return null;
    const selected = words.filter((w) => w?.gameData?.isChoosedToGame).length;
    const allOn = selected === words.length;
    const name = dictItem.dictName === "default" ? t.defaultDict : dictItem.dictName;

    return (
        <div className={`dgroup ${open ? "is-open" : "is-collapsed"}`}>
            <div className="dgroup__head" onClick={() => setOpen((p) => !p)}>
                <span className="dgroup__ic"><Icon n="layers" /></span>
                <span className="dgroup__meta">
                    <span className="dgroup__name">{name}</span>
                    <span className="dgroup__sub">{wordCount(words.length, currentLanguage)}</span>
                </span>
                {open && (
                    <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); selectFullDictToGame(dictItem.dictName, !allOn); }}>
                        {allOn ? t.cancelChoosingAll : t.chooseAll}
                    </button>
                )}
                {selected > 0 && <span className="dgroup__sel">{selected}</span>}
                <Icon n="chevron-down" className="dgroup__chev" />
            </div>
            <div className="dgroup__body">
                {words.map((w) => {
                    const on = !!w?.gameData?.isChoosedToGame;
                    const { cls, key } = posMeta(w.part_of_speech);
                    const prefix = chipPrefix(key, w.forms, { articles: showArticles, verbAa: showVerbAa });
                    return (
                        <div key={w.id} className={`wcard${on ? " is-selected" : ""}`} onClick={() => toggleChooseToGame(w.id)}>
                            <div className="wcard__body">
                                <span className="wcard__word">
                                    {prefix && <span className="muted" style={{ fontWeight: 400 }}>{prefix} </span>}
                                    {w.translate?.no?.[0]}
                                </span>
                                <span className="wcard__meta"><span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, t)}</span></span>
                                <span className="wcard__tr">{w.translate?.[currentLanguage]?.join(", ")}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const GameWordChooser = ({ setGameState, mode, setMode, gameType, setGameType, sound, setSound }) => {
    const dictList = useWordsStore((state) => state.dictList);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const endonym = ENDONYM[currentLanguage] || currentLanguage;
    const tl = TYPE_LABELS[currentLanguage] || TYPE_LABELS.en;
    const td = TYPE_DESC[currentLanguage] || TYPE_DESC.en;
    const rl = ROW_LABELS[currentLanguage] || ROW_LABELS.en;
    const stepMode = STEP_MODE[currentLanguage] || STEP_MODE.en;
    const stepWords = STEP_WORDS[currentLanguage] || STEP_WORDS.en;
    const setupTitle = SETUP_TITLE[currentLanguage] || SETUP_TITLE.en;

    const minWords = gameType === "study" ? MIN_WORDS_STUDY : MIN_WORDS;
    const chosen = useMemo(
        () => dictList.reduce((acc, d) => acc + d.words.filter((w) => w?.gameData?.isChoosedToGame).length, 0),
        [dictList]
    );
    const ready = chosen >= minWords;
    const pct = Math.min(100, Math.round((chosen / minWords) * 100));
    const firstWithWords = dictList.findIndex((d) => d.words.length > 0);

    const MODES = [
        { key: "no2int", from: "Norsk", to: endonym },
        { key: "int2no", from: endonym, to: "Norsk" },
    ];

    return (
        <>
            <main className="shell sel-main">
                <div className="sel-head">
                    <span className="eyebrow"><Icon n="target" sm /> {t.startGame}</span>
                    <h1 className="h1">{setupTitle}</h1>
                </div>

                {/* Шаг 1 — режим игры */}
                <section className="sel-section">
                    <h2 className="sel-section__title"><span className="sel-section__num">1</span> {stepMode}</h2>
                    <p className="sel-section__sub">{tl[gameType]} — {td[gameType]}</p>
                    <div className="gsetup">
                        <div className="gsetup__block">
                            <span className="gsetup__lbl">{rl.type}</span>
                            <div className="modeseg" role="tablist">
                                {TYPES.map((ty) => (
                                    <button key={ty.key} className={`modeseg__btn${gameType === ty.key ? " is-on" : ""}`} onClick={() => setGameType(ty.key)}>
                                        <Icon n={ty.icon} sm className="modeseg__arrow" /> {tl[ty.key]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="gsetup__block">
                            <span className="gsetup__lbl">{rl.dir}</span>
                            <div className="modeseg" role="tablist">
                                {MODES.map((m) => (
                                    <button key={m.key} className={`modeseg__btn${mode === m.key ? " is-on" : ""}`} onClick={() => setMode(m.key)}>
                                        {m.from} <Icon n="arrow-right" sm className="modeseg__arrow" /> {m.to}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="gsetup__block">
                            <span className="gsetup__lbl">{rl.audio}</span>
                            <div className="modeseg" role="tablist">
                                <button className={`modeseg__btn${sound ? " is-on" : ""}`} onClick={() => setSound(!sound)}>
                                    <Icon n="volume" sm className="modeseg__arrow" /> {SOUND_LABEL[currentLanguage] || SOUND_LABEL.en}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Шаг 2 — слова */}
                <section className="sel-section">
                    <h2 className="sel-section__title"><span className="sel-section__num">2</span> {stepWords}</h2>
                    <div className="dictgroups">
                        {dictList.map((dictItem, i) => (
                            <DictGroup key={dictItem.dictName} dictItem={dictItem} currentLanguage={currentLanguage} t={t} defaultOpen={i === firstWithWords} />
                        ))}
                    </div>
                </section>
            </main>

            <div className="startbar">
                <div className="shell startbar__row">
                    <div className="progress">
                        <div className="progress__top">
                            <span className="muted">{t.selectedWords}</span>
                            <span><b>{chosen}</b> / {t.minimumWord} {minWords}</span>
                        </div>
                        <div className="progress__bar"><span className={`progress__fill${ready ? " is-ready" : ""}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <span className="startbar__hint">
                        {ready ? t.canStart : `${t.chooseMore} ${Math.max(0, minWords - chosen)}`}
                    </span>
                    <div className="grow hide-mobile" />
                    <button className={`btn btn--accent btn--lg${ready ? "" : " is-disabled"}`} onClick={() => ready && setGameState("playing")}>
                        <Icon n="play" sm /> {t.startGame}
                    </button>
                </div>
            </div>
        </>
    );
};
