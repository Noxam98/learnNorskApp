// Встроенная панель поиска слов по Базе (для ПК-вкладки «Наборы» — левая колонка).
// ПЕРЕИСПОЛЬЗУЕТ умный поиск Базы: те же эндпоинты (api.getPool — фильтрованный обзор;
// api.searchPool — fuzzy+мультиязык; api.generateWord — AI-создание, если в Базе нет) и тот
// же SearchBox + CSS .wcard. Не модалка — живёт прямо в колонке. Действие «+» = onPick(poolId).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import api from "../tools/api.js";
import { SearchBox } from "../ui/SearchBox.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner, SkeletonWordlist } from "../ui/Spinner.jsx";
import { WordCard } from "../ui/WordCard.jsx";
import { FilterChipsPopup } from "../ui/FilterChipsPopup.jsx";
import { posLabel, POS_ORDER, posApiKey } from "../ui/pos.js";
import { langGuard } from "../../interface/i18nGuard.js";

const SEARCH_DEBOUNCE_MS = 550;
const PAGE_SIZE = 24;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const topicLabel = (t, key) => t.topics?.[key] || key;

const L = langGuard({
    ru:  { placeholder: "Слово на любом языке…", empty: "Ничего не найдено", inSet: "В наборе", add: "В набор", notInBase: "Нет в базе — добавить новое:", create: "Создать", all: "Все", start: "Найди слова и добавь их в набор", modNote: "Новое слово попадёт в личную базу и на модерацию админу.", found: "Найдено: {n}" },
    en:  { placeholder: "A word in any language…", empty: "Nothing found", inSet: "In set", add: "To set", notInBase: "Not in base — add new:", create: "Create", all: "All", start: "Search words and add them to the set", modNote: "A new word goes to your personal base for admin review.", found: "Found: {n}" },
    ukr: { placeholder: "Слово будь-якою мовою…", empty: "Нічого не знайдено", inSet: "У наборі", add: "У набір", notInBase: "Немає в базі — додати нове:", create: "Створити", all: "Усі", start: "Знайди слова й додай їх у набір", modNote: "Нове слово потрапить у власну базу й на модерацію адміну.", found: "Знайдено: {n}" },
    pl:  { placeholder: "Słowo w dowolnym języku…", empty: "Nic nie znaleziono", inSet: "W zestawie", add: "Do zestawu", notInBase: "Brak w bazie — dodaj nowe:", create: "Utwórz", all: "Wszystkie", start: "Znajdź słowa i dodaj je do zestawu", modNote: "Nowe słowo trafi do bazy osobistej i do moderacji admina.", found: "Znaleziono: {n}" },
    lt:  { placeholder: "Žodis bet kuria kalba…", empty: "Nieko nerasta", inSet: "Rinkinyje", add: "Į rinkinį", notInBase: "Nėra bazėje — pridėk naują:", create: "Sukurti", all: "Visi", start: "Surask žodžių ir įtrauk juos į rinkinį", modNote: "Naujas žodis pateks į asmeninę bazę ir administratoriaus moderacijai.", found: "Rasta: {n}" },
    lv:  { placeholder: "Vārds jebkurā valodā…", empty: "Nekas nav atrasts", inSet: "Kopā", add: "Pievienot", notInBase: "Nav bāzē — pievieno jaunu:", create: "Izveidot", all: "Visi", start: "Atrodi vārdus un pievieno tos kopai", modNote: "Jauns vārds nonāks personīgajā bāzē un administratora moderācijai.", found: "Atrasts: {n}" },
    ar:  { placeholder: "كلمة بأي لغة…", empty: "لا توجد نتائج", inSet: "في المجموعة", add: "إلى المجموعة", notInBase: "غير موجودة — أضِف جديدة:", create: "إنشاء", all: "الكل", start: "ابحث عن كلمات وأضِفها إلى المجموعة", modNote: "تذهب الكلمة الجديدة إلى قاعدتك الشخصية لمراجعة المشرف.", found: "وُجِد: {n}" },
}, "PoolSearchPanel.L");

/**
 * @param {{lang:string,inSet:Set<number>,onPick:(poolId:number,word:object)=>Promise<any>,t:object}} p
 */
export default function PoolSearchPanel({ lang, setId, inSet, onPick, onRemove, openWord, onHover, compact = false, t }) {
    const ll = L[lang] || L.ru;

    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [phase, setPhase] = useState("idle");      // idle | counting | searching
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [level, setLevel] = useState("");
    const [topics, setTopics] = useState([]);        // фильтр по темам (мультивыбор) — как в Базе
    const [pos, setPos] = useState("");              // фильтр по части речи
    const [sort, setSort] = useState("alpha");       // сортировка — как в Базе
    const [order, setOrder] = useState("asc");
    const [facets, setFacets] = useState({ topics: [], levels: [] }); // список тем (один раз)
    const [facetCounts, setFacetCounts] = useState(null);             // живые счётчики под текущий фильтр
    const [loading, setLoading] = useState(false);
    const [poolExact, setPoolExact] = useState(false); // введённое слово уже есть в Базе (точное совпадение)
    const [busyId, setBusyId] = useState(null);      // pool_id (или "gen:word") пока идёт добавление
    const [added, setAdded] = useState(() => new Set());   // оптимистично добавленные в этой сессии панели
    const [removed, setRemoved] = useState(() => new Set()); // оптимистично убранные (для тоггла клик-клик)
    const prevHadQ = useRef(false);
    const compactRef = useRef(null);         // строка компактного поиска — якорь для попапа-оверлея
    const [popRect, setPopRect] = useState(null); // позиция фикс-попапа (под полем ввода)
    const [popOpen, setPopOpen] = useState(true);  // компактный попап открыт? (клик вне — скрыть, фокус/ввод — показать)

    // компактный попап: новый запрос → открываем; клик вне строки/попапа → скрываем
    useEffect(() => { if (appliedQ.trim()) setPopOpen(true); }, [appliedQ]);
    useEffect(() => {
        if (!compact || !popOpen) return undefined;
        const onDown = (e) => { const el = compactRef.current; if (el && !el.contains(e.target)) setPopOpen(false); };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [compact, popOpen]);

    // список тем с количеством — один раз (как в Базе)
    useEffect(() => { api.getPoolTopics().then((r) => setFacets({ topics: r.topics || [], levels: r.levels || [] })).catch(() => {}); }, []);

    // при начале поиска — сортировка по релевантности; при очистке — назад в А-Я (как в Базе)
    useEffect(() => {
        const hasQ = appliedQ.trim() !== "";
        if (hasQ && !prevHadQ.current) { setSort("relevance"); setOrder("desc"); setPage(1); }
        else if (!hasQ && prevHadQ.current && sort === "relevance") { setSort("alpha"); setOrder("asc"); setPage(1); }
        prevHadQ.current = hasQ;
    }, [appliedQ]); // eslint-disable-line

    // оптимистичная отметка «в наборе» (added/removed) ЛОКАЛЬНА для набора: при смене активного
    // набора сбрасываем, иначе зелёная отметка «утекает» между наборами (выглядит как глобальный
    // список добавленных). После сброса состояние «в наборе» берётся из inSet (слова этого набора).
    useEffect(() => { setAdded(new Set()); setRemoved(new Set()); }, [setId]);

    // дебаунс ввода → appliedQ
    useEffect(() => {
        setPhase("counting");
        const id = setTimeout(() => { setAppliedQ(q.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [q]);

    // основной обзор Базы (тот же эндпоинт и фильтры/сортировка, что у «Базы слов»)
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPhase((p) => (p === "counting" ? "searching" : p));
        api.getPool({ q: appliedQ, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, topics, level, pos: posApiKey(pos), sort, order, lang })
            .then((res) => {
                if (cancelled) return;
                setItems(res.words || []); setTotal(res.total || 0);
                if (res.facets) setFacetCounts({ topics: Object.fromEntries((res.facets.topics || []).map((x) => [x.topic, x.count])) });
            })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) { setLoading(false); setPhase("idle"); } });
        return () => { cancelled = true; };
    }, [appliedQ, page, topics, level, pos, sort, order, lang]);

    // детект «есть ли введённое слово в Базе точным совпадением» (тот же searchPool, что и пул).
    // Если нет — покажем кнопку «Создать» у строки поиска (как в «Базе слов»).
    useEffect(() => {
        const term = appliedQ.trim();
        if (!term) { setPoolExact(false); return; }
        let cancelled = false;
        api.searchPool(term, lang)
            .then((r) => {
                if (cancelled) return;
                const res = r?.results || [];
                const nq = term.toLowerCase();
                setPoolExact(res.some((x) => x.inPool && (
                    (x.word || "").toLowerCase() === nq ||
                    Object.values(x.translate || {}).some((arr) => (arr || []).some((s) => (s || "").toLowerCase() === nq))
                )));
            })
            .catch(() => { if (!cancelled) setPoolExact(false); });
        return () => { cancelled = true; };
    }, [appliedQ, lang]);

    // позиция попапа компактного поиска: строго ПОД строкой ввода (fixed-оверлей — не перекрывает
    // поле, не клипается overflow панелей, не двигает раскладку). Пересчёт на ресайз/смену запроса.
    useLayoutEffect(() => {
        if (!compact || !appliedQ) { setPopRect(null); return undefined; }
        const measure = () => {
            const el = compactRef.current; if (!el) return;
            const r = el.getBoundingClientRect();
            setPopRect({ top: Math.round(r.bottom + 4), left: Math.round(r.left), width: Math.round(r.width) });
        };
        measure();
        const id = setTimeout(measure, 0);
        window.addEventListener("resize", measure);
        return () => { clearTimeout(id); window.removeEventListener("resize", measure); };
    }, [compact, appliedQ, poolExact]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
    const isIn = (pid) => !removed.has(pid) && (added.has(pid) || inSet?.has(pid));

    // как в пуле: введён запрос, которого нет в Базе точным совпадением → «Создать» (генерим именно
    // введённое слово; уйдёт в личную базу на модерацию админу — это делает /pool/generate).
    const hasQuery = appliedQ.trim() !== "";
    const showGen = hasQuery && !poolExact && !loading;
    const genBusy = busyId === "gen:" + appliedQ.trim();

    // фильтры — как в «Базе слов»
    const toggleTopic = (key) => { setPage(1); setTopics((cur) => cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]); };
    const pickPos = (key) => { setPage(1); setPos((cur) => cur === key ? "" : key); };
    const pickLevel = (lv) => { setPage(1); setLevel((cur) => cur === lv ? "" : lv); };
    const clearFilters = () => { setPage(1); setTopics([]); setLevel(""); setPos(""); };
    const hasFilters = topics.length > 0 || !!level || !!pos;

    // Клик по карточке/кнопке — ТОГГЛ: нет в наборе → добавить, есть → убрать. Оптимистично
    // правим added/removed (мгновенная отметка), а набор справа обновится по onPick/onRemove.
    const toggle = async (w) => {
        const pid = w.pool_id;
        if (!pid || busyId != null) return;
        const inside = isIn(pid);
        setBusyId(pid);
        try {
            if (inside) {
                setRemoved((s) => new Set(s).add(pid));
                setAdded((s) => { const n = new Set(s); n.delete(pid); return n; });
                await onRemove?.(pid, w);
            } else {
                setAdded((s) => new Set(s).add(pid));
                setRemoved((s) => { const n = new Set(s); n.delete(pid); return n; });
                await onPick?.(pid, w);
            }
        } finally { setBusyId(null); }
    };

    const createAndPick = async (term) => {
        if (busyId != null) return;
        setBusyId("gen:" + term);
        try {
            const res = await api.generateWord(term);
            const w = Array.isArray(res?.words) ? res.words[0] : (res?.word ? res : null);
            const pid = w?.pool_id ?? res?.pool_id;
            if (pid) {
                await onPick?.(pid, w || { pool_id: pid, word: term });
                setAdded((s) => new Set(s).add(pid));
                setRemoved((s) => { const n = new Set(s); n.delete(pid); return n; });
                setQ(""); setAppliedQ("");
            }
        } finally { setBusyId(null); }
    };

    // карточка — общий компонент (как в «Базе»): инфо + добавить/убрать + озвучка
    const card = (w) => (
        <WordCard key={w.pool_id} word={w} lang={lang} t={t}
            added={isIn(w.pool_id)} busy={busyId === w.pool_id}
            onToggle={() => toggle(w)} onHover={onHover}
            onInfo={openWord ? (() => openWord(w.word)) : undefined} />
    );

    // строка поиска + выезжающая кнопка «Создать» (одна и та же в полном и компактном виде)
    const searchRow = (
        <div className={"poolsearch" + (showGen ? " has-gen" : "")} style={{ margin: 0 }}>
            <SearchBox value={q} onChange={setQ} placeholder={ll.placeholder} phase={phase}
                debounceMs={SEARCH_DEBOUNCE_MS} count={total} onFocus={() => setPopOpen(true)}
                style={{ margin: 0, flex: 1, minWidth: 0 }} />
            <button className={"poolsearch__gen" + (showGen ? " is-shown" : "")}
                disabled={!showGen || genBusy} aria-hidden={!showGen} tabIndex={showGen ? 0 : -1}
                title={ll.modNote} onClick={() => createAndPick(appliedQ.trim())}>
                {genBusy ? <BtnSpinner /> : <Icon n="sparkles" sm />}
                <span>{t.createLbl}</span>
            </button>
        </div>
    );

    // КОМПАКТНЫЙ режим (мобилка, набор активен): только строка поиска + скромный попап на 4 слова.
    if (compact) {
        return (
            <div className="searchpane searchpane--compact" ref={compactRef}>
                {searchRow}
                {appliedQ && popRect && popOpen && (
                    <div className="searchpop" style={{ top: popRect.top, left: popRect.left, width: popRect.width }}>
                        {total > 0 && <div className="searchpop__head">{ll.found.replace("{n}", String(total))}</div>}
                        {items.length ? items.slice(0, 4).map(card)
                            : (loading || phase !== "idle" ? <SkeletonWordlist count={3} />
                                : <p className="muted" style={{ textAlign: "center", padding: "var(--sp-3) 0", margin: 0 }}>{ll.empty}</p>)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="searchpane">
            <div className="searchpane__top">
                {searchRow}
                {/* фильтр-бар как в «Базе»: Категории + Часть речи + Уровень (поповеры) + сортировка — в один ряд */}
                <div className="poolbar">
                    <div className="poolbar__row" style={{ flexWrap: "wrap", gap: "var(--sp-2)" }}>
                        <FilterChipsPopup icon="grid" label={t.categoriesLbl} count={topics.length}
                            sections={[{
                                key: "cat", multi: true, selected: topics, onPick: toggleTopic,
                                options: facets.topics.map(({ topic, count }) => {
                                    const c = facetCounts ? (facetCounts.topics[topic] || 0) : count;
                                    return { value: topic, label: topicLabel(t, topic), count: c, disabled: !topics.includes(topic) && c === 0 };
                                }),
                            }]} />
                        <FilterChipsPopup icon="type" label={t.posToggle} count={pos ? 1 : 0}
                            sections={[{
                                key: "pos", multi: false, selected: pos, onPick: pickPos,
                                options: POS_ORDER.map((key) => ({ value: key, label: posLabel(posApiKey(key), t) })),
                            }]} />
                        <FilterChipsPopup icon="award" label="CEFR" count={level ? 1 : 0}
                            sections={[{
                                key: "level", multi: false, selected: level, onPick: pickLevel,
                                options: LEVELS.map((lv) => ({ value: lv, label: lv })),
                            }]} />
                        {hasFilters && (
                            <button className="fchip fchip--clear" onClick={clearFilters}>
                                <Icon n="x" sm /> {t.clearFilters || "Сброс"}
                            </button>
                        )}
                    </div>
                </div>
                {showGen && (
                    <div className="muted" style={{ fontSize: "var(--fs-12)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon n="info" sm /> {ll.modNote}
                    </div>
                )}
            </div>

            <div className="searchpane__body">
                {items.length ? (
                    <div className="wordlist" style={loading ? { opacity: .5, transition: "opacity .15s" } : { transition: "opacity .15s" }}>
                        {items.map(card)}
                    </div>
                ) : (
                    loading || phase !== "idle" ? <SkeletonWordlist count={8} />
                        : appliedQ ? <p className="muted" style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>{ll.empty}</p>
                            : <p className="muted" style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>{ll.start}</p>
                )}

                {totalPages > 1 && (
                    <div className="pager" style={{ marginTop: "var(--sp-3)" }}>
                        <button className="pager__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon n="chevron-left" sm /></button>
                        <span className="pager__btn is-on">{page} / {totalPages}</span>
                        <button className="pager__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><Icon n="chevron-right" sm /></button>
                    </div>
                )}
            </div>
        </div>
    );
}
