import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/tools/api.js";
import { useWordsStore } from "../store/wordStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { useAuthStore } from "../store/AuthStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { WordInfoModal } from "../components/ui/WordInfoModal.jsx";
import { BtnSpinner, SkeletonWordlist } from "../components/ui/Spinner.jsx";
import { SearchBox } from "../components/ui/SearchBox.jsx";
import { posMeta, posLabel } from "../components/ui/pos.js";
import { SpeakButton } from "../components/ui/SpeakButton.jsx";
import { ttsLang } from "../components/ui/tts.js";

const SEARCH_DEBOUNCE_MS = 550;
const PAGE_SIZES = [30, 60, 120];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOPICS_TOGGLE = { ru: "Темы", ukr: "Теми", en: "Topics", pl: "Tematy", lt: "Temos" };

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
    const t = interfaceTranslate[currentLanguage];
    const addFromPool = useWordsStore((s) => s.addFromPool);
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
    const [loading, setLoading] = useState(true);
    const [searchPhase, setSearchPhase] = useState("idle"); // idle | counting | searching
    const [addingId, setAddingId] = useState(null);
    const [added, setAdded] = useState({});
    const [descWord, setDescWord] = useState(null);   // слово, чьё описание открыто
    const [facets, setFacets] = useState({ topics: [], levels: [] });
    const [facetCounts, setFacetCounts] = useState(null); // динамические счётчики под текущий фильтр: { topics:{key:n} }
    const [topicsOpen, setTopicsOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth > 700 : true));
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
        api.getPool({ q: appliedQ, limit: pageSize, offset: (page - 1) * pageSize, topics, level, sort, order })
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
    }, [appliedQ, page, pageSize, topics, level, sort, order]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]); // eslint-disable-line

    const toggleTopic = (key) => {
        setPage(1);
        setTopics((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
    };
    const pickLevel = (lv) => { setPage(1); setLevel((cur) => (cur === lv ? "" : lv)); };
    const onSort = (s) => { setPage(1); setSort(s); };
    const onPageSize = (n) => { setPage(1); setPageSize(n); };
    const clearFilters = () => { setPage(1); setTopics([]); setLevel(""); };

    const onAdd = async (word) => {
        setAddingId(word);
        try { await addFromPool(word); setAdded((a) => ({ ...a, [word]: true })); } catch { /* ignore */ }
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

    const hasFilters = topics.length > 0 || !!level;

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

            <SearchBox value={q} onChange={setQ} placeholder={t.poolSearchPlaceholder || t.inputPlaceholder}
                phase={searchPhase} debounceMs={SEARCH_DEBOUNCE_MS} count={total}
                style={{ marginBottom: "var(--sp-3)" }} />

            {/* Фильтр-бар: темы (сворачиваемые), уровень, сортировка, размер страницы */}
            <div className="poolbar">
                {facets.topics.length > 0 && (
                    <div className="poolbar__topics">
                        <button className={`fchip fchip--toggle${topics.length ? " is-on" : ""}`} onClick={() => setTopicsOpen((o) => !o)}>
                            <Icon n="grid" sm /> {TOPICS_TOGGLE[currentLanguage] || TOPICS_TOGGLE.en}
                            {topics.length > 0 && <span className="fchip__n">{topics.length}</span>}
                            <Icon n="chevron-down" sm className="fchip__chev" style={{ transform: topicsOpen ? "rotate(180deg)" : "none" }} />
                        </button>
                        <div className="seg">
                            {LEVELS.map((lv) => (
                                <button key={lv} className={`seg__btn${level === lv ? " is-on" : ""}`}
                                    onClick={() => pickLevel(lv)}>{lv}</button>
                            ))}
                        </div>
                        {hasFilters && (
                            <button className="fchip fchip--clear" onClick={clearFilters}>
                                <Icon n="x" sm /> {t.clearFilters || "Сброс"}
                            </button>
                        )}
                        {topicsOpen && (
                            <div className="poolbar__chips">
                                {facets.topics.map(({ topic, count }) => {
                                    // фасеты загружены → отсутствие темы значит 0 (а не статичный счёт)
                                    const c = facetCounts ? (facetCounts.topics[topic] || 0) : count;
                                    const on = topics.includes(topic);
                                    return (
                                        <button key={topic}
                                            className={`fchip${on ? " is-on" : ""}${(!on && c === 0) ? " is-empty" : ""}`}
                                            disabled={!on && c === 0}
                                            onClick={() => toggleTopic(topic)}>
                                            {topicLabel(t, topic)} <span className="fchip__n">{c}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="poolbar__row">
                    {(hasFilters || appliedQ.trim()) && (
                        <button className="btn btn--primary btn--sm" disabled={!total} onClick={openCreate}>
                            <Icon n="plus" sm /> {t.addAllToNewDict || "В новый словарь"} <b>{total}</b>
                        </button>
                    )}

                    <div className="grow" />

                    <label className="poolbar__sel">
                        <Icon n="sort" sm />
                        <select value={sort} onChange={(e) => onSort(e.target.value)}>
                            <option value="alpha">{t.poolSort?.alpha || "А-Я"}</option>
                            <option value="level">{t.poolSort?.level || "Уровень"}</option>
                            <option value="added">{t.poolSort?.added || "Новые"}</option>
                        </select>
                    </label>
                    <button className="iconbtn" title={order === "asc" ? "↑" : "↓"}
                        onClick={() => { setPage(1); setOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        <Icon n={order === "asc" ? "arrow-up" : "arrow-down"} sm />
                    </button>

                    <label className="poolbar__sel">
                        <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
                            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / {t.pageSize || "стр."}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            {items.length ? (
                <div className="wordlist">
                    {items.map((w) => {
                        const { cls } = posMeta(w.part_of_speech);
                        return (
                            <div className="wcard" key={w.word}>
                                <div className="wcard__body">
                                    <span className="wcard__word">{w.word}</span>
                                    {w.level && <span className="chip lvl">{w.level}</span>}
                                    <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, t)}</span>
                                    <span className="wcard__tr">{w.translate?.[currentLanguage]?.join(", ")}</span>
                                    {w.translate?.[currentLanguage]?.length > 0 && (
                                        <SpeakButton text={w.translate[currentLanguage].join(", ")} lang={ttsLang(currentLanguage)}
                                            className="iconbtn wcard__trspeak" ariaLabel={t.tts} title={t.tts} />
                                    )}
                                </div>
                                <div className="wcard__actions">
                                    <button className="iconbtn" aria-label={t.description} title={t.description}
                                        onClick={() => setDescWord(w.word)}>
                                        <Icon n="info" />
                                    </button>
                                    <button className="iconbtn" aria-label={t.addToDict} title={t.addToDict}
                                        disabled={added[w.word] || addingId === w.word} onClick={() => onAdd(w.word)}>
                                        {addingId === w.word ? <BtnSpinner /> : <Icon n={added[w.word] ? "check" : "plus"} />}
                                    </button>
                                    <SpeakButton text={w.word} hasTts={w.hasTts} ariaLabel={t.tts}
                                        title={t.tts} titlePreparing={t.ttsPreparing} />
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

            <WordInfoModal open={!!descWord} word={descWord}
                lang={currentLanguage} t={t} onClose={() => setDescWord(null)} />
        </main>
    );
};

export default PoolPage;
