import { useMemo, useState } from "react";
import { useWordsStore } from "../../store/wordStore.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { Icon } from "../ui/Icon.jsx";

const MIN_WORDS = 10;
const ENDONYM = { ru: "Русский", ukr: "Українська", en: "English", pl: "Polski", lt: "Lietuvių" };
const TYPE_LABELS = {
    ru: { input: "Ввод ответа", choice: "Выбор варианта" },
    ukr: { input: "Введення", choice: "Вибір варіанта" },
    en: { input: "Type answer", choice: "Multiple choice" },
    pl: { input: "Wpisywanie", choice: "Wybór wariantu" },
    lt: { input: "Įvedimas", choice: "Variantų pasirinkimas" },
};

const DictGroup = ({ dictItem, currentLanguage, t, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen);
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
                    <span className="dgroup__sub">{words.length} · {t.word.toLowerCase()}</span>
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
                    return (
                        <label key={w.id} className={`wpick${on ? " is-on" : ""}`} onClick={() => toggleChooseToGame(w.id)}>
                            <span className={`check${on ? " is-on" : ""}`}>{on && <Icon n="check" />}</span>
                            <span className="wpick__w">{w.translate?.no?.[0]}</span>
                            <span className="wpick__t">{w.translate?.[currentLanguage]?.join(", ")}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export const GameWordChooser = ({ setGameState, mode, setMode, quiz, setQuiz }) => {
    const dictList = useWordsStore((state) => state.dictList);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const endonym = ENDONYM[currentLanguage] || currentLanguage;
    const tl = TYPE_LABELS[currentLanguage] || TYPE_LABELS.en;

    const chosen = useMemo(
        () => dictList.reduce((acc, d) => acc + d.words.filter((w) => w?.gameData?.isChoosedToGame).length, 0),
        [dictList]
    );
    const ready = chosen >= MIN_WORDS;
    const pct = Math.min(100, Math.round((chosen / MIN_WORDS) * 100));
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
                    <h1 className="h1">{t.selectWordsTitle}</h1>
                    <p>{t.selectWordsDesc}</p>

                    {/* Режим игры — направление перевода и тип ответа */}
                    <div className="modesegs">
                        <div className="modeseg" role="tablist">
                            {MODES.map((m) => (
                                <button key={m.key} className={`modeseg__btn${mode === m.key ? " is-on" : ""}`} onClick={() => setMode(m.key)}>
                                    {m.from} <Icon n="arrow-right" sm className="modeseg__arrow" /> {m.to}
                                </button>
                            ))}
                        </div>
                        <div className="modeseg" role="tablist">
                            <button className={`modeseg__btn${!quiz ? " is-on" : ""}`} onClick={() => setQuiz(false)}>{tl.input}</button>
                            <button className={`modeseg__btn${quiz ? " is-on" : ""}`} onClick={() => setQuiz(true)}>{tl.choice}</button>
                        </div>
                    </div>
                </div>

                <div className="dictgroups">
                    {dictList.map((dictItem, i) => (
                        <DictGroup key={dictItem.dictName} dictItem={dictItem} currentLanguage={currentLanguage} t={t} defaultOpen={i === firstWithWords} />
                    ))}
                </div>
            </main>

            <div className="startbar">
                <div className="shell startbar__row">
                    <div className="progress">
                        <div className="progress__top">
                            <span className="muted">{t.selectedWords}</span>
                            <span><b>{chosen}</b> / {t.minimumWord} {MIN_WORDS}</span>
                        </div>
                        <div className="progress__bar"><span className={`progress__fill${ready ? " is-ready" : ""}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <span className="startbar__hint">
                        {ready ? t.canStart : `${t.chooseMore} ${Math.max(0, MIN_WORDS - chosen)}`}
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
