// Контроллер Базы (пул слов): поиск с дебаунсом, фильтры (темы/уровень/часть речи/админ-«без чего»),
// сортировка, пагинация, фасеты-счётчики, умный добор «нет в базе» (AI-генерация) и добавление/
// удаление слов в «Учёбу». Вся логика страницы — здесь; PoolPage.jsx — только разметка.
import { useEffect, useRef, useState } from "react";
import api from "../components/tools/api.js";
import { useWordsStore } from "../store/wordStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { posApiKey } from "../components/ui/pos.js";

export const SEARCH_DEBOUNCE_MS = 550;

export function usePoolSearch(currentLanguage, t) {
    const addToLearning = useWordsStore((s) => s.addToLearning);
    const removeFromLearning = useWordsStore((s) => s.removeFromLearning);

    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [items, setItems] = useState([]);
    const [pinned, setPinned] = useState([]); // свежедобавленные слова — закреплены вверху списка
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(60);
    const [topics, setTopics] = useState([]);
    const [level, setLevel] = useState("");
    const [sort, setSort] = useState("alpha");
    const [order, setOrder] = useState("asc");
    const [missing, setMissing] = useState(""); // админ: "" | embedding | description | tts | meta | forms
    const [pos, setPos] = useState("");          // фильтр по части речи (ключ pos.js: noun/verb/adj/...)
    const [loading, setLoading] = useState(true);
    const [searchPhase, setSearchPhase] = useState("idle"); // idle | counting | searching
    const [addingId, setAddingId] = useState(null);
    const [added, setAdded] = useState({});
    const [smart, setSmart] = useState([]);          // слова не из пула (лексикон/fuzzy) под текущий запрос
    const [poolExact, setPoolExact] = useState(null); // точное совпадение запроса со словом из пула (есть в базе)
    const [highlightWord, setHighlightWord] = useState(""); // слово, подсвечиваемое после «Показать» (per-card)
    const [highlightBox, setHighlightBox] = useState(null);  // одна обводка вокруг группы смежных карточек (омонимы)
    const listWrapRef = useRef(null);                        // контейнер списка (для расчёта рамки)
    const [smartBusy, setSmartBusy] = useState("");  // слово, которое сейчас генерим+добавляем
    const [reloadTick, setReloadTick] = useState(0); // форс-обновление списка после генерации
    const [facets, setFacets] = useState({ topics: [], levels: [] });
    const [facetCounts, setFacetCounts] = useState(null); // динамические счётчики под текущий фильтр: { topics:{key:n} }
    const firstRun = useRef(true);
    const pendingShowRef = useRef("");   // слово, к которому надо проскроллить после сброса фильтров («Показать»)
    const prevHadQ = useRef(false);

    // При начале поиска — сортировка по релевантности (по умолчанию); при очистке — назад в А-Я.
    // Между этим (запрос есть, юзер сам сменил сортировку) — уважаем его выбор.
    useEffect(() => {
        const hasQ = appliedQ.trim() !== "";
        if (hasQ && !prevHadQ.current) { setSort("relevance"); setOrder("desc"); setPage(1); }
        else if (!hasQ && prevHadQ.current && sort === "relevance") { setSort("alpha"); setOrder("asc"); setPage(1); }
        prevHadQ.current = hasQ;
        setPinned([]); // смена запроса — сбрасываем закреплённые свежие слова
    }, [appliedQ]); // eslint-disable-line

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
        api.getPool({ q: appliedQ, limit: pageSize, offset: (page - 1) * pageSize, topics, level, sort, order, missing, pos: posApiKey(pos), lang: currentLanguage })
            .then((res) => {
                if (cancelled) return;
                setItems(res.words || []);
                setTotal(res.total || 0);
                // отметить уже добавленные в Учёбу слова (флаг inLearning с бэка), не теряя сессионные добавления
                setAdded((prev) => {
                    const next = { ...prev };
                    for (const w of (res.words || [])) if (w.inLearning) next[w.pool_id] = true;
                    return next;
                });
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
    }, [appliedQ, page, pageSize, topics, level, sort, order, missing, pos, reloadTick, currentLanguage]);

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
                    (x.viaForm || "").toLowerCase() === nq ||
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
    const onPageSize = (n) => { setPage(1); setPageSize(n); };
    const clearFilters = () => { setPage(1); setTopics([]); setLevel(""); setMissing(""); setPos(""); };
    const pickSort = (s, o) => { setPage(1); setSort(s); setOrder(o); };
    const reload = () => setReloadTick((k) => k + 1);

    // Добавить слово из Базы прямо в «Учёбу» по pool_id (омонимы — разные записи; оптимистично).
    const onAdd = async (w) => {
        const id = w.pool_id;
        setAddingId(id);
        setAdded((a) => ({ ...a, [id]: true }));
        try { await addToLearning(id); useSystemStore.getState().showToast(`«${w.word}» ${t.addedToLearning}`, "success"); }
        catch { setAdded((a) => { const n = { ...a }; delete n[id]; return n; }); }
        setAddingId(null);
    };

    // «Показать» — проскроллить к карточке слова и подсветить. Для омонимов (несколько карточек
    // одного слова): если они идут подряд — одна общая обводка вокруг группы; иначе — подсветка
    // каждой по отдельности. Координаты рамки считаем относительно контейнера (стабильны при скролле).
    const onShow = (word, retried = false) => {
        if (!word) return;
        setHighlightBox(null);
        setHighlightWord("");
        try {
            const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(word) : word;
            const wrap = listWrapRef.current;
            const cards = wrap ? [...wrap.querySelectorAll(`.wcard[data-word="${sel}"]`)] : [];
            // Карточки нет: слово в Базе есть (иначе была бы «Создать»), но его прячут активные
            // фильтры или страница. Раньше клик молча ничего не делал. Снимаем фильтры, уходим на
            // 1-ю страницу и повторяем ОДИН раз, когда список перезагрузится (pendingShow).
            if (!cards.length) {
                const hidden = topics.length > 0 || !!level || !!missing || !!pos || page !== 1;
                if (!retried && hidden) { pendingShowRef.current = word; clearFilters(); return; }
                useSystemStore.getState().showToast(t.notInCurrentList || "Слова нет в текущем списке", "warning");
                return;
            }
            cards[0].scrollIntoView({ behavior: "smooth", block: "center" });
            if (wrap && cards.length > 1) {
                const all = [...wrap.querySelectorAll(".wcard")];
                const idx = cards.map((c) => all.indexOf(c));
                const contiguous = Math.max(...idx) - Math.min(...idx) + 1 === cards.length;
                if (contiguous) {
                    const cont = wrap.getBoundingClientRect();
                    const rs = cards.map((c) => c.getBoundingClientRect());
                    const top = Math.min(...rs.map((r) => r.top)) - cont.top;
                    const left = Math.min(...rs.map((r) => r.left)) - cont.left;
                    const w = Math.max(...rs.map((r) => r.right)) - cont.left - left;
                    const h = Math.max(...rs.map((r) => r.bottom)) - cont.top - top;
                    setHighlightBox({ top, left, w, h });
                    setTimeout(() => setHighlightBox(null), 1800);
                    return; // одна обводка — per-card не включаем
                }
            }
        } catch { /* */ }
        setHighlightWord(word);
        setTimeout(() => setHighlightWord((cur) => (cur === word ? "" : cur)), 1800);
    };

    // Фильтры сняты и список перезагрузился → доводим отложенный «Показать» до конца (один повтор,
    // retried=true: если карточки нет и теперь — честный тост вместо молчания).
    useEffect(() => {
        const w = pendingShowRef.current;
        if (!w || loading) return;
        pendingShowRef.current = "";
        const id = requestAnimationFrame(() => onShow(w, true));
        return () => cancelAnimationFrame(id);
    }, [items, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // «Нет в базе» → сгенерировать слово через ИИ (положить в пул) и добавить себе.
    const onGenerateAdd = async (word) => {
        const w = (word || "").trim();
        if (!w || smartBusy) return;
        setSmartBusy(w);
        try {
            const res = await api.generateWord(w);   // создаст в пуле (или вернёт существующее)
            const name = res?.word || w;
            if (res?.pool_id) {
                await addToLearning(res.pool_id);
                setAdded((a) => ({ ...a, [res.pool_id]: true }));
                useSystemStore.getState().showToast(`«${name}» ${t.addedToLearning}`, "success");
                // закрепить созданное слово вверху списка — вдруг ИИ выдал другую форму/перевод и
                // оно не попадает под текущий запрос (иначе кажется, что добавление не сработало).
                try {
                    const m = await api.getPoolMeta(name);
                    const card = {
                        word: name, pool_id: res.pool_id ?? m?.pool_id,
                        translate: m?.translate || res.translate || {},
                        part_of_speech: m?.part_of_speech || "", level: m?.level || null,
                        topics: m?.topics || [], forms: m?.forms || null, hasTts: !!m?.hasTts,
                        hasEmbedding: true, hasDescription: true, inLearning: true,
                    };
                    setPinned((p) => [card, ...p.filter((x) => x.pool_id !== card.pool_id)]);
                } catch { /* без меты просто не закрепим */ }
            }
            setReloadTick((k) => k + 1);             // подтянуть список — слово теперь в пуле
            setSmart((s) => s.filter((x) => x.word !== w && x.word !== name));
        } catch {
            useSystemStore.getState().showToast(t.genFailed || "Не удалось сгенерировать слово");
        }
        setSmartBusy("");
    };

    // Убрать слово из «Учёбы» по pool_id (оптимистично, при ошибке возвращаем отметку).
    const onRemove = async (w) => {
        const id = w.pool_id;
        setAdded((a) => { const n = { ...a }; delete n[id]; return n; });
        setAddingId(id);
        try { await removeFromLearning(id); useSystemStore.getState().showToast(`«${w.word}» ${t.removedFromLearning}`, "warning"); }
        catch { setAdded((a) => ({ ...a, [id]: true })); }
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
    const hasQuery = appliedQ.trim() !== "";
    // Кнопка-дополнение: есть точное слово/перевод → «Показать»; нет → «Создать» (генерация введённого).
    const showShow = hasQuery && !!poolExact;
    const showGen = hasQuery && !poolExact && !loading;
    // закреплённые свежие слова — вверху, без дублей с основным списком
    const display = pinned.length
        ? [...pinned.filter((p) => !items.some((w) => w.pool_id === p.pool_id)), ...items]
        : items;

    return {
        // запрос/фаза
        q, setQ, appliedQ, searchPhase, total,
        // фильтры
        topics, level, sort, order, missing, pos, pageSize, hasFilters,
        facets, facetCounts,
        toggleTopic, pickLevel, pickMissing, pickPos, onPageSize, clearFilters, pickSort,
        // данные/пагинация
        items, pinned, display, page, setPage, totalPages, loading,
        // умный добор
        smart, poolExact, smartBusy, showShow, showGen,
        // добавление/отметки/подсветка
        added, addingId, highlightWord, highlightBox, listWrapRef,
        // действия
        onAdd, onRemove, onGenerateAdd, onAdminDelete, onShow, reload,
    };
}
