import { useEffect, useMemo, useState } from "react";
import { useWordsStore } from "../../store/wordStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { Dropdown } from "../ui/Dropdown.jsx";
import { wordCount } from "../tools/plural.js";
import { posMeta, posLabel, chipPrefix } from "../ui/pos.js";
import api from "../tools/api.js";

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
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Источник слов: из словаря пользователя или AI-подбор по уровню/теме
const SOURCE_LABELS = {
    ru:  { dict: "Из словаря", ai: "AI-подбор" },
    ukr: { dict: "Зі словника", ai: "AI-підбір" },
    en:  { dict: "From dictionary", ai: "AI selection" },
    pl:  { dict: "Ze słownika", ai: "Dobór AI" },
    lt:  { dict: "Iš žodyno", ai: "AI parinkimas" },
};
const AI_LABELS = {
    ru:  { level: "Уровень", anyLevel: "Любой", topic: "Тема", anyTopic: "Любая", count: "Слов",
           custom: "✏️ Своя тема", customPh: "Например: космос, кулинария, IT…",
           sub: "Нейросеть подберёт слова по уровню и теме — сыграй и сразу проверь себя",
           gen: "Сгенерировать и играть", generating: "Генерирую слова…", err: "Не удалось — попробуй ещё раз" },
    ukr: { level: "Рівень", anyLevel: "Будь-який", topic: "Тема", anyTopic: "Будь-яка", count: "Слів",
           custom: "✏️ Своя тема", customPh: "Наприклад: космос, кулінарія, IT…",
           sub: "Нейромережа підбере слова за рівнем і темою — зіграй і одразу перевір себе",
           gen: "Згенерувати і грати", generating: "Генерую слова…", err: "Не вдалося — спробуй ще раз" },
    en:  { level: "Level", anyLevel: "Any", topic: "Topic", anyTopic: "Any", count: "Words",
           custom: "✏️ Custom topic", customPh: "e.g. space, cooking, IT…",
           sub: "AI picks words by level and topic — play and test yourself right away",
           gen: "Generate & play", generating: "Generating words…", err: "Failed — try again" },
    pl:  { level: "Poziom", anyLevel: "Dowolny", topic: "Temat", anyTopic: "Dowolny", count: "Słów",
           custom: "✏️ Własny temat", customPh: "np. kosmos, gotowanie, IT…",
           sub: "AI dobierze słowa według poziomu i tematu — zagraj i od razu się sprawdź",
           gen: "Generuj i graj", generating: "Generuję słowa…", err: "Nie udało się — spróbuj ponownie" },
    lt:  { level: "Lygis", anyLevel: "Bet koks", topic: "Tema", anyTopic: "Bet kokia", count: "Žodžių",
           custom: "✏️ Sava tema", customPh: "pvz.: kosmosas, kulinarija, IT…",
           sub: "DI parinks žodžius pagal lygį ir temą — žaisk ir iškart pasitikrink",
           gen: "Generuoti ir žaisti", generating: "Generuoju žodžius…", err: "Nepavyko — bandyk dar kartą" },
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
    const setAiPlayWords = useWordsStore((s) => s.setAiPlayWords);
    const clearAiPlayWords = useWordsStore((s) => s.clearAiPlayWords);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const endonym = ENDONYM[currentLanguage] || currentLanguage;
    const tl = TYPE_LABELS[currentLanguage] || TYPE_LABELS.en;
    const td = TYPE_DESC[currentLanguage] || TYPE_DESC.en;
    const rl = ROW_LABELS[currentLanguage] || ROW_LABELS.en;
    const stepMode = STEP_MODE[currentLanguage] || STEP_MODE.en;
    const stepWords = STEP_WORDS[currentLanguage] || STEP_WORDS.en;
    const setupTitle = SETUP_TITLE[currentLanguage] || SETUP_TITLE.en;
    const srcL = SOURCE_LABELS[currentLanguage] || SOURCE_LABELS.en;
    const aiL = AI_LABELS[currentLanguage] || AI_LABELS.en;
    const topicsMap = t.topics || {};

    // Источник слов и параметры AI-подбора
    const [source, setSource] = useState("dict"); // dict | ai
    const [aiLevel, setAiLevel] = useState("");
    const [aiTopic, setAiTopic] = useState("");        // ключ темы из списка или "__custom__"
    const [aiTopicCustom, setAiTopicCustom] = useState(""); // свободная тема
    const [aiCount, setAiCount] = useState(10);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiErr, setAiErr] = useState(false);

    // При входе в выбор слов сбрасываем прежний AI-набор (вернулись из игры).
    useEffect(() => { clearAiPlayWords(); }, []); // eslint-disable-line

    const aiCustomEmpty = aiTopic === "__custom__" && !aiTopicCustom.trim();

    const generateAndPlay = async () => {
        if (aiBusy) return;
        setAiBusy(true); setAiErr(false);
        // своя тема → шлём свободный текст; иначе — ключ из списка (бэкенд маппит/принимает как есть)
        const topic = aiTopic === "__custom__" ? aiTopicCustom.trim() : aiTopic;
        try {
            const res = await api.gamesAiWords({ level: aiLevel, topic, count: aiCount, lang: currentLanguage });
            const words = (res?.words || []).map((w, i) => ({
                id: `ai-${i}`,
                translate: w.translate,
                part_of_speech: "",
                forms: null,
                description: null,
                hasTts: false,
                gameData: { correctFirstTry: 0, incorrectFirstTry: 0, isChoosedToGame: true },
                techData: {},
            }));
            if (!words.length) { setAiErr(true); setAiBusy(false); return; }
            setAiPlayWords(words);
            setGameState("playing");
        } catch {
            setAiErr(true); setAiBusy(false);
        }
    };

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
                    <div className="modeseg" role="tablist" style={{ marginBottom: 16 }}>
                        <button className={`modeseg__btn${source === "dict" ? " is-on" : ""}`} onClick={() => setSource("dict")}>
                            <Icon n="layers" sm className="modeseg__arrow" /> {srcL.dict}
                        </button>
                        <button className={`modeseg__btn${source === "ai" ? " is-on" : ""}`} onClick={() => setSource("ai")}>
                            <Icon n="sparkles" sm className="modeseg__arrow" /> {srcL.ai}
                        </button>
                    </div>

                    {source === "dict" ? (
                        <div className="dictgroups">
                            {dictList.map((dictItem, i) => (
                                <DictGroup key={dictItem.dictName} dictItem={dictItem} currentLanguage={currentLanguage} t={t} defaultOpen={i === firstWithWords} />
                            ))}
                        </div>
                    ) : (
                        <div className="gsetup">
                            <p className="sel-section__sub">{aiL.sub}</p>
                            <div className="gsetup__block">
                                <span className="gsetup__lbl">{aiL.level}</span>
                                <Dropdown value={aiLevel} disabled={aiBusy} onChange={setAiLevel}
                                    options={[{ value: "", label: aiL.anyLevel }, ...LEVELS.map((l) => ({ value: l, label: l }))]} />
                            </div>
                            <div className="gsetup__block">
                                <span className="gsetup__lbl">{aiL.topic}</span>
                                <Dropdown value={aiTopic} disabled={aiBusy} onChange={setAiTopic}
                                    options={[{ value: "", label: aiL.anyTopic },
                                        ...Object.keys(topicsMap).map((k) => ({ value: k, label: topicsMap[k] })),
                                        { value: "__custom__", label: aiL.custom }]} />
                                {aiTopic === "__custom__" && (
                                    <input className="input" type="text" value={aiTopicCustom} disabled={aiBusy}
                                        placeholder={aiL.customPh} maxLength={60} autoFocus
                                        style={{ marginTop: 8 }} onChange={(e) => setAiTopicCustom(e.target.value)} />
                                )}
                            </div>
                            <div className="gsetup__block">
                                <span className="gsetup__lbl">{aiL.count}: {aiCount}</span>
                                <input type="range" min={3} max={20} value={aiCount} disabled={aiBusy} onChange={(e) => setAiCount(+e.target.value)} style={{ width: "100%" }} />
                            </div>
                            {aiErr && <p className="sel-section__sub" style={{ color: "var(--danger, #e5484d)" }}>{aiL.err}</p>}
                        </div>
                    )}
                </section>
            </main>

            <div className="startbar">
                {source === "ai" ? (
                    <div className="shell startbar__row">
                        <span className="startbar__hint">
                            {aiBusy ? aiL.generating : aiL.sub}
                        </span>
                        <div className="grow hide-mobile" />
                        <button className={`btn btn--accent btn--lg${(aiBusy || aiCustomEmpty) ? " is-disabled" : ""}`}
                            onClick={() => !aiCustomEmpty && generateAndPlay()}>
                            {aiBusy
                                ? <><BtnSpinner /> {aiL.generating}</>
                                : <><Icon n="sparkles" sm /> {aiL.gen}</>}
                        </button>
                    </div>
                ) : (
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
                )}
            </div>
        </>
    );
};
