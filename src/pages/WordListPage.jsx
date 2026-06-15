import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { interfaceTranslate } from "../interface/interfaceTranslation";
import { Card } from "../components/wordListComponents/WordCard";
import { useWordsStore } from "../store/wordStore";
import { useSystemStore } from "../store/systemStore.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Dots, BtnSpinner, CountdownRing } from "../components/ui/Spinner.jsx";
import { SearchBox } from "../components/ui/SearchBox.jsx";
import { matchWord } from "../components/tools/matchWord.js";
import { wordsNoun } from "../components/tools/plural.js";
import { posMeta, posLabel } from "../components/ui/pos.js";
import Error from "../components/tools/error.jsx";
import api from "../components/tools/api.js";

const SEARCH_DEBOUNCE_MS = 550; // время «добега» кольца отсчёта до запроса в пул
const POS_ORDER = ["noun", "verb", "adj", "phrase", "other"];
const SORT_LABELS = {
    ru:  { title: "Сортировка", added: "По добавлению", alpha: "По алфавиту", pos: "По части речи" },
    ukr: { title: "Сортування", added: "За додаванням", alpha: "За алфавітом", pos: "За частиною мови" },
    en:  { title: "Sort", added: "By date added", alpha: "Alphabetical", pos: "By part of speech" },
    pl:  { title: "Sortowanie", added: "Wg dodania", alpha: "Alfabetycznie", pos: "Wg części mowy" },
    lt:  { title: "Rūšiavimas", added: "Pagal pridėjimą", alpha: "Pagal abėcėlę", pos: "Pagal kalbos dalį" },
};

export const WordListPage = () => {
    const dictName = useWordsStore((state) => state.currentDictName);
    const dictList = useWordsStore((state) => state.dictList);
    const dictNames = useWordsStore((state) => state.dictNames);
    const addWords = useWordsStore((state) => state.addWords);
    const addNewDict = useWordsStore((state) => state.addNewDict);
    const setCurrentDict = useWordsStore((state) => state.setCurrentDict);
    const removeDict = useWordsStore((state) => state.removeDict);
    const deleteChosedWords = useWordsStore((state) => state.deleteChosedWords);
    const choseWord = useWordsStore((state) => state.choseWord);
    const addFromPool = useWordsStore((state) => state.addFromPool);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];

    const currentDict = dictList.find((d) => d.dictName === dictName) || { words: [] };
    const wordList = currentDict.words;
    const selectedCount = wordList.filter((w) => w?.techData?.isSelected).length;
    const allSelected = wordList.length > 0 && selectedCount === wordList.length;

    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [dictOpen, setDictOpen] = useState(false);
    const [newDict, setNewDict] = useState("");
    const [pendingDelete, setPendingDelete] = useState(null);
    const [sort, setSort] = useState("added");
    const [sortOpen, setSortOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    // Фаза автокомплита: idle | counting (кольцо отсчёта дебаунса) | searching (запрос в пул)
    const [searchPhase, setSearchPhase] = useState("idle");
    const [addingPool, setAddingPool] = useState(null); // слово, которое сейчас добавляется из пула
    const [deletingSel, setDeletingSel] = useState(false);
    const searchTimer = useRef();

    // Автокомплит из общего пула (по мере ввода): кольцо отсчёта → запрос → результаты.
    const onPromptChange = (val) => {
        setPrompt(val);
        clearTimeout(searchTimer.current);
        const q = val.trim();
        if (q.length < 2) { setSuggestions([]); setSearchPhase("idle"); return; }
        setSearchPhase("counting");
        searchTimer.current = setTimeout(async () => {
            setSearchPhase("searching");
            try {
                const res = await api.searchPool(q);
                setSuggestions(res.results || []);
            } catch { setSuggestions([]); }
            setSearchPhase("idle");
        }, SEARCH_DEBOUNCE_MS);
    };

    const pickSuggestion = async (norwegian) => {
        setSuggestions([]); setPrompt(""); setSearchPhase("idle"); setAddingPool(norwegian);
        try { await addFromPool(norwegian); } catch { setError(t.connectionError); }
        setAddingPool(null);
    };

    const dictLabel = dictName === "default" ? t.defaultDict : dictName;
    const sl = SORT_LABELS[currentLanguage] || SORT_LABELS.en;

    const displayWords = useMemo(() => {
        const arr = (search ? wordList.filter((w) => matchWord(w, search)) : wordList).slice();
        const byNo = (a, b) => (a.translate?.no?.[0] || "").localeCompare(b.translate?.no?.[0] || "");
        if (sort === "alpha") arr.sort(byNo);
        else if (sort === "pos") arr.sort((a, b) => {
            const d = POS_ORDER.indexOf(posMeta(a.part_of_speech).key) - POS_ORDER.indexOf(posMeta(b.part_of_speech).key);
            return d || byNo(a, b);
        });
        return arr; // "added" — исходный порядок добавления
    }, [wordList, sort, search]);

    const handleAdd = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        try {
            const res = await addWords(prompt);
            if (res?.errors?.length) setError(res.errors.join("\n"));
            setPrompt("");
        } catch { setError(t.connectionError); }
        setIsLoading(false);
    };

    const toggleSelectAll = () => {
        wordList.forEach((w) => { if (allSelected || !w?.techData?.isSelected) choseWord(w.id); });
    };

    return (
        <main className="shell words-main">
            {/* Единая строка управления словарём */}
            <div className="toolbar wordbar">
                <div style={{ position: "relative" }}>
                    <button className="select" onClick={() => setDictOpen((p) => !p)}>
                        <Icon n="layers" sm />
                        <span>{dictLabel}</span>
                        <Icon n="chevron-down" sm />
                    </button>
                    {dictOpen && (
                        <>
                            <div onClick={() => setDictOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                            <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 40, minWidth: 280, padding: "var(--sp-2)", boxShadow: "var(--shadow-md)" }}>
                                {dictNames.map((name) => (
                                    <div key={name} className="row between" style={{ padding: "6px 8px", borderRadius: "var(--r-sm)", cursor: "pointer" }}
                                        onClick={() => { setCurrentDict(name); setDictOpen(false); }}>
                                        <span style={{ fontWeight: name === dictName ? 700 : 500, color: name === dictName ? "var(--fjord-600)" : "var(--ink)" }}>
                                            {name === "default" ? t.defaultDict : name}
                                        </span>
                                        {dictNames.length > 1 && (
                                            <button className="iconbtn is-danger" onClick={(e) => { e.stopPropagation(); setPendingDelete(name); }} aria-label={t.delete}>
                                                <Icon n="trash" sm />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div className="row" style={{ marginTop: "var(--sp-2)", gap: "var(--sp-2)" }}>
                                    <input className="input" style={{ padding: "8px 10px" }} value={newDict} placeholder={t.newDict}
                                        onChange={(e) => setNewDict(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && newDict.trim()) { addNewDict(newDict.trim()); setNewDict(""); setDictOpen(false); } }} />
                                    <button className="btn btn--primary btn--sm" onClick={() => { if (newDict.trim()) { addNewDict(newDict.trim()); setNewDict(""); setDictOpen(false); } }}>{t.add}</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <span className="count-pill"><b>{wordList.length}</b> {wordsNoun(wordList.length, currentLanguage)}</span>

                <span className="toolbar__sep" />

                <button className="tool hide-mobile" onClick={() => setDictOpen(true)}><Icon n="plus" sm /> {t.newDict.replace("..", "")}</button>
                <button className="tool" onClick={toggleSelectAll}><Icon n="check-square" sm /> {t.chooseAll}</button>
                {selectedCount > 0 && <span className="toolbar__count">{selectedCount}</span>}
                <button className="tool is-danger" disabled={!selectedCount || deletingSel}
                    onClick={async () => { setDeletingSel(true); try { await deleteChosedWords(); } catch { setError(t.connectionError); } setDeletingSel(false); }}>
                    {deletingSel ? <BtnSpinner /> : <Icon n="trash" sm />} {t.delete}
                </button>

                <div className="grow" />

                <div style={{ position: "relative" }}>
                    <button className="select" onClick={() => setSortOpen((p) => !p)}>
                        <Icon n="sort" sm />
                        <span>{sl[sort]}</span>
                        <Icon n="chevron-down" sm />
                    </button>
                    {sortOpen && (
                        <>
                            <div onClick={() => setSortOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                            <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 40, minWidth: 200, padding: "var(--sp-2)", boxShadow: "var(--shadow-md)" }}>
                                {["added", "alpha", "pos"].map((key) => (
                                    <button key={key} className="nav__link" style={{
                                        justifyContent: "flex-start", width: "100%", border: "none",
                                        background: sort === key ? "var(--fjord-50)" : "transparent",
                                        color: sort === key ? "var(--fjord-600)" : "var(--ink-2)",
                                    }} onClick={() => { setSort(key); setSortOpen(false); }}>
                                        {sl[key]}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Композер добавления слова + автокомплит из общего пула */}
            <div className="composer" style={{ position: "relative" }}>
                <span className="composer__spark"><Icon n="sparkles" /></span>
                <input type="text" value={prompt} placeholder={t.inputPlaceholder}
                    onChange={(e) => onPromptChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { setSuggestions([]); setSearchPhase("idle"); handleAdd(); } }} />
                {searchPhase === "counting"
                    ? <CountdownRing key={prompt} duration={SEARCH_DEBOUNCE_MS} />
                    : searchPhase === "searching"
                        ? <Dots />
                        : <span className="composer__hint">ru · ukr · en · pl · lt</span>}
                <button className="btn btn--accent" onClick={handleAdd} disabled={isLoading || !!addingPool}>
                    {(isLoading || addingPool) ? <BtnSpinner /> : <Icon n="plus" sm />} {isLoading ? t.fetching : t.add}
                </button>

                {suggestions.length > 0 && (
                    <div className="card composer__suggest">
                        {suggestions.map((s) => {
                            const { cls } = posMeta(s.part_of_speech);
                            return (
                                <button key={s.word} className="suggest__item" onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s.word); }}>
                                    <span className="suggest__w">{s.word}</span>
                                    <span className={`chip pos ${cls}`}>{posLabel(s.part_of_speech, t)}</span>
                                    <span className="suggest__t">{s.translate?.[currentLanguage]?.join(", ")}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Поиск по словам словаря (по всем языкам) */}
            {wordList.length > 0 && (
                <SearchBox value={search} onChange={setSearch}
                    placeholder={t.dictSearchPlaceholder || t.poolSearchPlaceholder || t.inputPlaceholder}
                    count={search ? displayWords.length : null} style={{ marginBottom: "var(--sp-3)" }} />
            )}

            {/* Список слов */}
            {wordList.length ? (
                displayWords.length ? (
                    <div className="wordlist">
                        {displayWords.map((wordItem) => (
                            <Card key={wordItem.id} wordItem={wordItem} languageTranslate={currentLanguage} />
                        ))}
                    </div>
                ) : (
                    <p className="muted" style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>{t.nothingFound || "—"}</p>
                )
            ) : (
                <div className="muted" style={{ textAlign: "center", padding: "var(--sp-12) var(--sp-4)" }}>
                    <p style={{ margin: 0 }}>{t.addWordsHere}</p>
                    <p style={{ margin: "var(--sp-2) 0 0" }}>
                        {t.orFromBase} <Link to="/pool" style={{ color: "var(--fjord-600)", fontWeight: 600 }}>{t.navBar.base}</Link>
                    </p>
                </div>
            )}

            <Modal
                open={!!pendingDelete}
                onClose={() => { if (!deletingSel) setPendingDelete(null); }}
                title={t.deleteDictTitle}
                footer={<>
                    <button className="btn btn--ghost" disabled={deletingSel} onClick={() => setPendingDelete(null)}>{t.cancel}</button>
                    <button className="btn btn--accent" disabled={deletingSel}
                        onClick={async () => { setDeletingSel(true); try { await removeDict(pendingDelete); } catch { setError(t.connectionError); } setDeletingSel(false); setPendingDelete(null); }}>
                        {deletingSel ? <BtnSpinner /> : t.delete}
                    </button>
                </>}
            >
                <p className="muted" style={{ margin: 0 }}>«{pendingDelete}» {t.deleteDictBody}</p>
            </Modal>

            <Error text={error} setText={setError} />
        </main>
    );
};
