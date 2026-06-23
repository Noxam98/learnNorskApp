import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/tools/api.js";
import { useWordsStore } from "../store/wordStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Dropdown } from "../components/ui/Dropdown.jsx";
import { SortControl } from "../components/ui/SortControl.jsx";
import { sortOptions } from "../components/ui/sortOptions.js";
import { Modal } from "../components/ui/Modal.jsx";
import { FilterChipsPopup } from "../components/ui/FilterChipsPopup.jsx";
import { WordInfoModal } from "../components/ui/WordInfoModal.jsx";
import { BtnSpinner, SkeletonWordlist, BrandLoader } from "../components/ui/Spinner.jsx";
import { SearchBox } from "../components/ui/SearchBox.jsx";
import { posMeta, posLabel, POS_INFO, POS_ORDER, posApiKey, chipPrefix } from "../components/ui/pos.js";
import { SpeakButton } from "../components/ui/SpeakButton.jsx";
import { ttsLang } from "../components/ui/tts.js";

const SEARCH_DEBOUNCE_MS = 550;
const PAGE_SIZES = [30, 60, 120];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CATEGORIES_LBL = { ru: "Категории", ukr: "Категорії", en: "Categories", pl: "Kategorie", lt: "Kategorijos" };
const POS_TOGGLE = { ru: "Часть речи", ukr: "Частина мови", en: "Part of speech", pl: "Część mowy", lt: "Kalbos dalis" };
const CREATE_LBL = { ru: "Создать", ukr: "Створити", en: "Create", pl: "Utwórz", lt: "Sukurti" };
const SHOW_LBL = { ru: "Показать", ukr: "Показати", en: "Show", pl: "Pokaż", lt: "Rodyti" };
const FILTERS_LBL = { ru: "Фильтры", ukr: "Фільтри", en: "Filters", pl: "Filtry", lt: "Filtrai" };
const DATA_LBL = { ru: "Данные", ukr: "Дані", en: "Data", pl: "Dane", lt: "Duomenys" };

const topicLabel = (t, key) => t.topics?.[key] || key;

// Окно номеров страниц вокруг текущей.
const pageWindow = (page, totalPages) => {
    const span = 2, out = [];
    let lo = Math.max(1, page - span), hi = Math.min(totalPages, page + span);
    if (page <= span) hi = Math.min(totalPages, 1 + span * 2);
    if (page > totalPages - span) lo = Math.max(1, totalPages - span * 2);
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
};

export const PoolPage = () => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const t = interfaceTranslate[currentLanguage];
    const addFromPool = useWordsStore((s) => s.addFromPool);
    const removeFromDict = useWordsStore((s) => s.removeFromDict);
    const createDictFromPool = useWordsStore((s) => s.createDictFromPool);
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const navigate = useNavigate();

    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(60);
    const [topics, setTopics] = useState([]);
    const [level, setLevel] = useState("");
    const [sort, setSort] = useState("alpha");
    const [order, setOrder] = useState("asc");
    const [missing, setMissing] = useState(""); // админ: "" | embedding | description | tts | meta | forms
    const [pos, setPos] = useState("");          // фильтр по части речи (ключ pos.js: noun/verb/adj/...)
    const [posRefOpen, setPosRefOpen] = useState(false); // справочник частей речи
    const [filtersOpen, setFiltersOpen] = useState(false);        // попап «Категории + Часть речи»
    const [adminFiltersOpen, setAdminFiltersOpen] = useState(false); // попап «Данные» (админ: без эмбеддинга/...)
    const [loading, setLoading] = useState(true);
    const [searchPhase, setSearchPhase] = useState("idle"); // idle | counting | searching
    const [addingId, setAddingId] = useState(null);
    const [added, setAdded] = useState({});
    const [smart, setSmart] = useState([]);          // слова не из пула (лексикон/fuzzy) под текущий запрос
    const [poolExact, setPoolExact] = useState(null); // точное совпадение запроса со словом из пула (есть в базе)
    const [highlightWord, setHighlightWord] = useState(""); // слово, подсвечиваемое после «Показать»
    const [smartBusy, setSmartBusy] = useState("");  // слово, которое сейчас генерим+добавляем
    const [reloadTick, setReloadTick] = useState(0); // форс-обновление списка после генерации
    const [descWord, setDescWord] = useState(null);   // слово, чьё описание открыто
    const [facets, setFacets] = useState({ topics: [], levels: [] });
    const [facetCounts, setFacetCounts] = useState(null); // динамические счётчики под текущий фильтр: { topics:{key:n} }
    const [dictOpen, setDictOpen] = useState(false);
    const [dictName, setDictName] = useState("");
    const [creating, setCreating] = useState(false);
    const [createErr, setCreateErr] = useState("");
    const firstRun = useRef(true);

    // Список тем с количеством (для фильтра) — один раз.
    useEffect(() => {
        api.getPoolTopics().then((r) => setFacets({ topics: r.topics || [], levels: r.levels || [] })).catch(() => {});
    }, []);

    // Дебаунс поиска: кольцо отсчёта → применяем запрос (сброс на 1-ю страницу).
    useEffect(() => {
        if (firstRun.current) { firstRun.current = false; return; }
        setSearchPhase("counting");
        const id = setTimeout(() => { setAppliedQ(q.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [q]);

    // Загрузка страницы при изменении запроса/фильтров/сортировки/страницы.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setSearchPhase((p) => (p === "counting" ? "searching" : p));
        api.getPool({ q: appliedQ, limit: pageSize, offset: (page - 1) * pageSize, topics, level, sort, order, missing, pos: posApiKey(pos) })
            .then((res) => {
                if (cancelled) return;
                setItems(res.words || []);
                setTotal(res.total || 0);
                if (res.facets) {
                    setFacetCounts({
                        topics: Object.fromEntries((res.facets.topics || []).map((x) => [x.topic, x.count])),
                        levels: Object.fromEntries((res.facets.levels || []).map((x) => [x.level, x.count])),
                    });
                }
            })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) { setLoading(false); setSearchPhase("idle"); } });
        return () => { cancelled = true; };
    }, [appliedQ, page, pageSize, topics, level, sort, order, missing, pos, reloadTick]);

    // Умный добор «нет в базе»: слова из лексикона/похожие (inPool:false) под запрос — для AI-добавления.
    useEffect(() => {
        const term = appliedQ.trim();
        if (!term) { setSmart([]); setPoolExact(null); return; }
        let cancelled = false;
        api.searchPool(term, currentLanguage)
            .then((r) => {
                if (cancelled) return;
                const res = r?.results || [];
                setSmart(res.filter((x) => !x.inPool).slice(0, 6));
                const nq = term.toLowerCase();
                // «есть в базе»: точное совпадение запроса со словом или его переводом (любой язык)
                setPoolExact(res.find((x) => x.inPool && (
                    (x.word || "").toLowerCase() === nq ||
                    Object.values(x.translate || {}).some((arr) => (arr || []).some((s) => (s || "").toLowerCase() === nq))
                )) || null);
            })
            .catch(() => { if (!cancelled) { setSmart([]); setPoolExact(null); } });
        return () => { cancelled = true; };
    }, [appliedQ, currentLanguage]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]); // eslint-disable-line

    const toggleTopic = (key) => {
        setPage(1);
        setTopics((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
    };
    const pickLevel = (lv) => { setPage(1); setLevel((cur) => (cur === lv ? "" : lv)); };
    const pickMissing = (val) => { setPage(1); setMissing((cur) => (cur === val ? "" : val)); };
    const pickPos = (key) => { setPage(1); setPos((cur) => (cur === key ? "" : key)); };
    const onSort = (s) => { setPage(1); setSort(s); };
    const onPageSize = (n) => { setPage(1); setPageSize(n); };
    const clearFilters = () => { setPage(1); setTopics([]); setLevel(""); setMissing(""); setPos(""); };

    const onAdd = async (word) => {
        setAddingId(word);
        // храним id добавленного слова — он нужен, чтобы отменить добавление
        try { const id = await addFromPool(word); setAdded((a) => ({ ...a, [word]: id || true })); } catch { /* ignore */ }
        setAddingId(null);
    };

    // «Показать» — проскроллить к карточке слова в списке и подсветить её.
    const onShow = (word) => {
        if (!word) return;
        try {
            const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(word) : word;
            const el = document.querySelector(`.wcard[data-word="${sel}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch { /* */ }
        setHighlightWord(word);
        setTimeout(() => setHighlightWord((cur) => (cur === word ? "" : cur)), 1800);
    };

    // «Нет в базе» → сгенерировать слово через ИИ (положить в пул) и добавить себе.
    const onGenerateAdd = async (word) => {
        const w = (word || "").trim();
        if (!w || smartBusy) return;
        setSmartBusy(w);
        try {
            const res = await api.generateWord(w);   // создаст в пуле (или вернёт существующее)
            const name = res?.word || w;
            await onAdd(name);
            setReloadTick((k) => k + 1);             // подтянуть список — слово теперь в пуле
            setSmart((s) => s.filter((x) => x.word !== w && x.word !== name));
        } catch {
            useSystemStore.getState().showToast(t.genFailed || "Не удалось сгенерировать слово");
        }
        setSmartBusy("");
    };

    // Отмена: убрать слово из текущего словаря (не из общей базы).
    const onRemove = async (word) => {
        const id = added[word];
        const drop = () => setAdded((a) => { const n = { ...a }; delete n[word]; return n; });
        if (!id || id === true) { drop(); return; } // id неизвестен — просто сбрасываем отметку
        setAddingId(word);
        try { await removeFromDict(id); drop(); } catch { /* ignore */ }
        setAddingId(null);
    };

    const onAdminDelete = async (word) => {
        if (!window.confirm(`Удалить «${word}» из базы слов? (у всех, без восстановления)`)) return;
        try {
            await api.adminDeleteWord(word);
            setItems((prev) => prev.filter((w) => w.word !== word));
            setTotal((tt) => Math.max(0, tt - 1));
        } catch { /* ignore */ }
    };

    const hasFilters = topics.length > 0 || !!level || !!missing || !!pos;
    // запрос есть → если слово в базе, показываем «Показать» (скролл+подсветка), иначе «Создать»
    const hasQuery = appliedQ.trim() !== "";
    const showShow = hasQuery && !!poolExact;
    const showGen = hasQuery && !poolExact;

    // Имя нового словаря по фильтрам (с возможностью переписать вручную).
    const autoDictName = () => {
        const parts = [];
        if (topics.length) parts.push(topics.map((k) => topicLabel(t, k)).join(", "));
        if (level) parts.push(level);
        if (appliedQ.trim()) parts.push(`«${appliedQ.trim()}»`);
        return parts.length ? parts.join(" · ") : (t.allWordsName || "Все слова");
    };

    const openCreate = () => { setDictName(autoDictName()); setCreateErr(""); setDictOpen(true); };
    const doCreate = async () => {
        const name = dictName.trim();
        if (!name) return;
        setCreating(true); setCreateErr("");
        try {
            await createDictFromPool({ name, q: appliedQ, topics, level });
            setDictOpen(false);
            navigate("/words");
        } catch {
            setCreateErr(t.dictExistsError || "Не удалось создать словарь");
        }
        setCreating(false);
    };

    return (
        <main className="shell words-main">
            <div className="page-head" style={{ marginBottom: "var(--sp-4)" }}>
                <div>
                    <span className="eyebrow"><Icon n="library" sm /> {t.navBar.base}</span>
                    <h1 className="h1">{t.poolTitle}</h1>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{t.poolDesc}</p>
                </div>
            </div>

            {/* поиск + выезжающее дополнение: «Показать» (слово есть в базе) или «Создать» (нет) */}
            <div className={"poolsearch" + ((showGen || showShow) ? " has-gen" : "")}>
                <SearchBox value={q} onChange={setQ} placeholder={t.poolSearchPlaceholder || t.inputPlaceholder}
                    phase={searchPhase} debounceMs={SEARCH_DEBOUNCE_MS} count={total}
                    style={{ margin: 0, flex: 1, minWidth: 0 }} />
                <button className={"poolsearch__gen" + ((showGen || showShow) ? " is-shown" : "") + (showShow ? " poolsearch__gen--show" : "")}
                    disabled={(!showGen && !showShow) || !!smartBusy} aria-hidden={!showGen && !showShow}
                    tabIndex={(showGen || showShow) ? 0 : -1}
                    onClick={() => (showShow ? onShow(poolExact.word) : onGenerateAdd(appliedQ.trim()))}>
                    {showShow ? <Icon n="arrow-down" sm /> : (smartBusy && smartBusy === appliedQ.trim() ? <BtnSpinner /> : <Icon n="sparkles" sm />)}
                    <span>{showShow ? (SHOW_LBL[currentLanguage] || SHOW_LBL.en) : (CREATE_LBL[currentLanguage] || CREATE_LBL.en)}</span>
                </button>
            </div>

            {/* Фильтр-бар: темы (сворачиваемые), уровень, сортировка, размер страницы */}
            <div className="poolbar">
                {/* Фильтры — в попапах с чипами (переиспользуемый FilterChipsPopup) */}
                <div className="poolbar__row" style={{ flexWrap: "wrap", gap: "var(--sp-2)" }}>
                    <button className={`fchip fchip--toggle${(topics.length || pos) ? " is-on" : ""}`} onClick={() => setFiltersOpen(true)}>
                        <Icon n="filter" sm /> {FILTERS_LBL[currentLanguage] || FILTERS_LBL.en}
                        {(topics.length + (pos ? 1 : 0)) > 0 && <span className="fchip__n">{topics.length + (pos ? 1 : 0)}</span>}
                    </button>
                    {isAdmin && (
                        <button className={`fchip fchip--toggle${missing ? " is-on" : ""}`} onClick={() => setAdminFiltersOpen(true)}>
                            <Icon n="database" sm /> {DATA_LBL[currentLanguage] || DATA_LBL.en}
                            {missing && <span className="fchip__n">1</span>}
                        </button>
                    )}
                    <div className="seg">
                        {LEVELS.map((lv) => (
                            <button key={lv} className={`seg__btn${level === lv ? " is-on" : ""}`} onClick={() => pickLevel(lv)}>{lv}</button>
                        ))}
                    </div>
                    {hasFilters && (
                        <button className="fchip fchip--clear" onClick={clearFilters}>
                            <Icon n="x" sm /> {t.clearFilters || "Сброс"}
                        </button>
                    )}
                </div>

                <div className="poolbar__row">
                    {(hasFilters || appliedQ.trim()) && (
                        <button className="btn btn--primary btn--sm" disabled={!total} onClick={openCreate}>
                            <Icon n="plus" sm /> {t.addAllToNewDict || "В новый словарь"} <b>{total}</b>
                        </button>
                    )}

                    <div className="grow" />

                    <SortControl value={sort} order={order}
                        options={sortOptions(t, ["alpha", "level", "freq", "added"])}
                        onChange={(s, o) => { setPage(1); setSort(s); setOrder(o); }} />

                    <div className="poolbar__sel">
                        <Dropdown value={pageSize} onChange={(v) => onPageSize(Number(v))}
                            options={PAGE_SIZES.map((n) => ({ value: n, label: `${n} / ${t.pageSize || "стр."}` }))} />
                    </div>
                </div>
            </div>

            {/* «Нет в базе» — добавить новое слово через ИИ. Показываем при активном поиске. */}
            {appliedQ.trim() && smart.length > 0 && (
                <div className="spanel" style={{ margin: "0 0 var(--sp-3)", padding: "var(--sp-3) var(--sp-4)" }}>
                    <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)", marginBottom: 8 }}>
                        {t.poolGenHint || "Нет нужного слова? Добавить через ИИ:"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {smart.map((w) => (
                            <button key={w.word} type="button" disabled={!!smartBusy} onClick={() => onGenerateAdd(w.word)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink-2)", fontWeight: 600, fontSize: "var(--fs-13)" }}>
                                <Icon n="sparkles" sm /> {w.word}
                                {smartBusy === w.word && <BtnSpinner />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ position: "relative" }}>
            {/* при перезагрузке списка (смена сортировки/фильтра/страницы) — затемняем старый
                список и показываем лоадер поверх, чтобы было видно, что идёт загрузка */}
            {loading && items.length > 0 && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 2, pointerEvents: "none" }}>
                    <BrandLoader dark />
                </div>
            )}
            {items.length ? (
                <div className="wordlist" style={loading ? { opacity: 0.4, pointerEvents: "none", transition: "opacity .15s ease" } : { transition: "opacity .15s ease" }}>
                    {items.map((w) => {
                        const { cls, key } = posMeta(w.part_of_speech);
                        const prefix = chipPrefix(key, w.forms, { articles: showArticles, verbAa: showVerbAa });
                        return (
                            <div className={`wcard${added[w.word] ? " is-added" : ""}${highlightWord === w.word ? " is-highlight" : ""}`} key={w.word}
                                data-word={w.word}
                                onClick={() => (added[w.word] ? onRemove(w.word) : onAdd(w.word))}>
                                <div className="wcard__body">
                                    <span className="wcard__word">
                                        {prefix && <span className="muted" style={{ fontWeight: 400 }}>{prefix} </span>}
                                        {w.word}
                                    </span>
                                    <span className="wcard__meta">
                                        {w.level && <span className="chip lvl">{w.level}</span>}
                                        <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, t)}</span>
                                        {isAdmin && !w.hasEmbedding && <span className="chip" style={{ background: "#fee2e2", color: "#b91c1c" }} title="нет эмбеддинга">emb</span>}
                                        {isAdmin && !w.hasDescription && <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }} title="нет описания">desc</span>}
                                        {isAdmin && !w.hasTts && <span className="chip" style={{ background: "#e0e7ff", color: "#3730a3" }} title="нет озвучки">tts</span>}
                                    </span>
                                    <span className="wcard__tr">{w.translate?.[currentLanguage]?.join(", ")}</span>
                                </div>
                                <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                                    <button className="iconbtn" aria-label={t.description} title={t.description}
                                        onClick={() => setDescWord(w.word)}>
                                        <Icon n="info" />
                                    </button>
                                    <button className={`iconbtn${added[w.word] ? " is-added" : ""}`}
                                        aria-label={added[w.word] ? t.removeFromDict : t.addToDict}
                                        title={added[w.word] ? t.removeFromDict : t.addToDict}
                                        disabled={addingId === w.word}
                                        onClick={() => (added[w.word] ? onRemove(w.word) : onAdd(w.word))}>
                                        {addingId === w.word ? <BtnSpinner /> : <Icon n={added[w.word] ? "check" : "plus"} />}
                                    </button>
                                    <SpeakButton
                                        segments={[
                                            { text: w.word, hasTts: w.hasTts },
                                            { text: w.translate?.[currentLanguage]?.join(", "), lang: ttsLang(currentLanguage) },
                                        ]}
                                        ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                                    {isAdmin && (
                                        <button className="iconbtn is-danger" aria-label="delete" title="Удалить из базы (админ)"
                                            onClick={() => onAdminDelete(w.word)}>
                                            <Icon n="trash" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                (loading || searchPhase !== "idle")
                    ? <SkeletonWordlist count={12} />
                    : <p className="muted" style={{ textAlign: "center", padding: "var(--sp-12) 0" }}>{t.poolEmpty}</p>
            )}
            </div>

            {/* Постраничная навигация */}
            {totalPages > 1 && (
                <div className="pager">
                    <button className="pager__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <Icon n="chevron-left" sm />
                    </button>
                    {pageWindow(page, totalPages)[0] > 1 && (
                        <>
                            <button className="pager__btn" onClick={() => setPage(1)}>1</button>
                            <span className="pager__gap">…</span>
                        </>
                    )}
                    {pageWindow(page, totalPages).map((p) => (
                        <button key={p} className={`pager__btn${p === page ? " is-on" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    {pageWindow(page, totalPages).slice(-1)[0] < totalPages && (
                        <>
                            <span className="pager__gap">…</span>
                            <button className="pager__btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                        </>
                    )}
                    <button className="pager__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <Icon n="chevron-right" sm />
                    </button>
                </div>
            )}

            <Modal
                open={dictOpen}
                onClose={() => { if (!creating) setDictOpen(false); }}
                title={t.newDictTitle || "Новый словарь"}
                footer={<>
                    <button className="btn btn--ghost" disabled={creating} onClick={() => setDictOpen(false)}>{t.cancel}</button>
                    <button className="btn btn--primary" disabled={creating || !dictName.trim()} onClick={doCreate}>
                        {creating ? <BtnSpinner /> : <Icon n="plus" sm />} {t.create || "Создать"}
                    </button>
                </>}
            >
                <div className="field">
                    <label className="label">{t.dictNameLabel || "Название словаря"}</label>
                    <input className="input" value={dictName} autoFocus
                        onChange={(e) => setDictName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") doCreate(); }} />
                    <span className="input-hint">{(t.willAddWords || "Будет добавлено слов")}: <b>{total}</b></span>
                    {createErr && <span className="alert"><Icon n="x" sm /> {createErr}</span>}
                </div>
            </Modal>

            <Modal open={posRefOpen} onClose={() => setPosRefOpen(false)} title="Части речи — справочник" maxWidth={560}>
                {POS_ORDER.map((key) => {
                    const info = POS_INFO[key];
                    return (
                        <div key={key} style={{ fontSize: "var(--fs-13)", padding: "8px 0", borderBottom: "1px solid var(--surface-3)" }}>
                            <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center" }}>
                                <b>{info.name}</b>
                                <span className={`chip pos ${posMeta(posApiKey(key)).cls}`} style={{ fontSize: "var(--fs-11)" }}>{posLabel(posApiKey(key), t)}</span>
                            </span>
                            <div className="muted" style={{ marginTop: 2 }}>{info.desc}{info.ex && <> · напр.: {info.ex}</>}</div>
                        </div>
                    );
                })}
            </Modal>

            {/* Попап «Фильтры»: категории (мульти) + часть речи (одиночный) — переиспользуемый компонент */}
            <FilterChipsPopup open={filtersOpen} onClose={() => setFiltersOpen(false)} title={FILTERS_LBL[currentLanguage] || FILTERS_LBL.en}
                sections={[
                    {
                        key: "cat", title: CATEGORIES_LBL[currentLanguage] || CATEGORIES_LBL.en, multi: true, selected: topics,
                        onPick: toggleTopic,
                        options: facets.topics.map(({ topic, count }) => {
                            const c = facetCounts ? (facetCounts.topics[topic] || 0) : count;
                            return { value: topic, label: topicLabel(t, topic), count: c, disabled: !topics.includes(topic) && c === 0 };
                        }),
                    },
                    {
                        key: "pos", title: POS_TOGGLE[currentLanguage] || POS_TOGGLE.en, multi: false, selected: pos, onPick: pickPos,
                        options: POS_ORDER.map((key) => ({ value: key, label: posLabel(posApiKey(key), t) })),
                    },
                ]} />

            {/* Попап «Данные» (только админ): без эмбеддинга/описания/озвучки/уровня-тем/форм */}
            {isAdmin && (
                <FilterChipsPopup open={adminFiltersOpen} onClose={() => setAdminFiltersOpen(false)} title={DATA_LBL[currentLanguage] || DATA_LBL.en}
                    sections={[{
                        key: "missing", title: "Без чего", multi: false, selected: missing, onPick: pickMissing,
                        options: [["embedding", "эмбеддинга"], ["description", "описания"], ["tts", "озвучки"], ["meta", "уровня/тем"], ["forms", "форм"]].map(([value, label]) => ({ value, label })),
                    }]} />
            )}

            <WordInfoModal open={!!descWord} word={descWord}
                lang={currentLanguage} t={t} onClose={() => setDescWord(null)} />
        </main>
    );
};

export default PoolPage;
