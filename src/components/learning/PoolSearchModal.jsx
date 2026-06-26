// Попап «Поиск слов» для вкладки «Наборы». ПЕРЕИСПОЛЬЗУЕТ умный поиск Базы слов:
// те же эндпоинты (api.getPool — фильтрованный обзор с фасетами; api.searchPool — умный
// fuzzy+мультиязык; api.generateWord — создать через AI, если в Базе нет) и тот же SearchBox
// и CSS .wordlist/.wcard. Действие по слову — добавить в текущий набор (onPick).
import { useEffect, useMemo, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import api from "../tools/api.js";
import { Modal } from "../ui/Modal.jsx";
import { SearchBox } from "../ui/SearchBox.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner, SkeletonWordlist } from "../ui/Spinner.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { posMeta, posLabel, chipPrefix } from "../ui/pos.js";
import { ttsLang } from "../ui/tts.js";
import { langGuard } from "../../interface/i18nGuard.js";

const SEARCH_DEBOUNCE_MS = 550;
const PAGE_SIZE = 24;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const L = langGuard({
    ru:  { title: "Поиск слов", placeholder: "Слово на любом языке…", empty: "Ничего не найдено", inSet: "В наборе", add: "В набор", notInBase: "Нет в базе:", create: "Создать", all: "Все" },
    en:  { title: "Search words", placeholder: "A word in any language…", empty: "Nothing found", inSet: "In set", add: "To set", notInBase: "Not in base:", create: "Create", all: "All" },
    ukr: { title: "Пошук слів", placeholder: "Слово будь-якою мовою…", empty: "Нічого не знайдено", inSet: "У наборі", add: "У набір", notInBase: "Немає в базі:", create: "Створити", all: "Усі" },
    pl:  { title: "Szukaj słów", placeholder: "Słowo w dowolnym języku…", empty: "Nic nie znaleziono", inSet: "W zestawie", add: "Do zestawu", notInBase: "Brak w bazie:", create: "Utwórz", all: "Wszystkie" },
    lt:  { title: "Ieškoti žodžių", placeholder: "Žodis bet kuria kalba…", empty: "Nieko nerasta", inSet: "Rinkinyje", add: "Į rinkinį", notInBase: "Nėra bazėje:", create: "Sukurti", all: "Visi" },
    lv:  { title: "Meklēt vārdus", placeholder: "Vārds jebkurā valodā…", empty: "Nekas nav atrasts", inSet: "Kopā", add: "Kopā", notInBase: "Nav bāzē:", create: "Izveidot", all: "Visi" },
    ar:  { title: "البحث عن كلمات", placeholder: "كلمة بأي لغة…", empty: "لا شيء", inSet: "في المجموعة", add: "إلى المجموعة", notInBase: "غير موجودة:", create: "إنشاء", all: "الكل" },
}, "PoolSearchModal.L");

/**
 * @param {{open:boolean,onClose:Function,lang:string,inSet:Set<number>,onPick:(poolId:number,word:object)=>Promise<any>,t:object}} p
 */
export default function PoolSearchModal({ open, onClose, lang, inSet, onPick, t }) {
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const ll = L[lang] || L.ru;

    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [phase, setPhase] = useState("idle");      // idle | counting | searching
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [level, setLevel] = useState("");
    const [loading, setLoading] = useState(false);
    const [smart, setSmart] = useState([]);          // умные «нет в базе» (для AI-создания)
    const [busyId, setBusyId] = useState(null);      // pool_id (или "gen:word") пока идёт добавление
    const [added, setAdded] = useState(() => new Set()); // добавленные за сессию попапа (оптимистично)

    // сбрасываем состояние при открытии
    useEffect(() => { if (open) { setQ(""); setAppliedQ(""); setItems([]); setTotal(0); setPage(1); setLevel(""); setSmart([]); setAdded(new Set()); } }, [open]);

    // дебаунс ввода → appliedQ
    useEffect(() => {
        if (!open) return;
        setPhase("counting");
        const id = setTimeout(() => { setAppliedQ(q.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [q, open]);

    // основной обзор Базы (тот же эндпоинт, что у «Базы слов»)
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setPhase((p) => (p === "counting" ? "searching" : p));
        api.getPool({ q: appliedQ, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, level, sort: "alpha", order: "asc", lang })
            .then((res) => { if (cancelled) return; setItems(res.words || []); setTotal(res.total || 0); })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) { setLoading(false); setPhase("idle"); } });
        return () => { cancelled = true; };
    }, [appliedQ, page, level, lang, open]);

    // умный детект «нет в базе» (для кнопки AI-создать) — тот же searchPool
    useEffect(() => {
        if (!open) { return; }
        const term = appliedQ.trim();
        if (!term) { setSmart([]); return; }
        let cancelled = false;
        api.searchPool(term, lang)
            .then((r) => { if (!cancelled) setSmart((r?.results || []).filter((x) => !x.inPool).slice(0, 4)); })
            .catch(() => { if (!cancelled) setSmart([]); });
        return () => { cancelled = true; };
    }, [appliedQ, lang, open]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

    const isIn = (pid) => added.has(pid) || inSet?.has(pid);

    const pick = async (w) => {
        const pid = w.pool_id;
        if (!pid || isIn(pid) || busyId != null) return;
        setBusyId(pid);
        try {
            await onPick(pid, w);
            setAdded((s) => new Set(s).add(pid));
        } finally { setBusyId(null); }
    };

    // создать слово через AI, затем добавить в набор
    const createAndPick = async (term) => {
        if (busyId != null) return;
        setBusyId("gen:" + term);
        try {
            const res = await api.generateWord(term);
            const w = Array.isArray(res?.words) ? res.words[0] : (res?.word ? res : null);
            const pid = w?.pool_id ?? res?.pool_id;
            if (pid) { await onPick(pid, w || { pool_id: pid, word: term }); setAdded((s) => new Set(s).add(pid)); setQ(""); setAppliedQ(""); }
        } finally { setBusyId(null); }
    };

    const card = (w) => {
        const { cls, key } = posMeta(w.part_of_speech);
        const prefix = chipPrefix(key, w.forms, { articles: showArticles, verbAa: showVerbAa });
        const inset = isIn(w.pool_id);
        return (
            <div className={`wcard${inset ? " is-added" : ""}`} key={w.pool_id} onClick={() => pick(w)}>
                <div className="wcard__body">
                    <span className="wcard__word">
                        {prefix && <span className="muted" style={{ fontWeight: 400 }}>{prefix} </span>}
                        {w.word}
                    </span>
                    <span className="wcard__meta">
                        {w.level && <span className="chip lvl">{w.level}</span>}
                        <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, t)}</span>
                    </span>
                    <span className="wcard__tr">{w.translate?.[lang]?.join(", ")}</span>
                </div>
                <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                    <SpeakButton
                        segments={[{ text: w.word, hasTts: w.hasTts }, { text: w.translate?.[lang]?.join(", "), lang: ttsLang(lang) }]}
                        ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                    <button className={`iconbtn${inset ? " is-added" : ""}`} aria-label={inset ? ll.inSet : ll.add}
                        title={inset ? ll.inSet : ll.add} disabled={inset || busyId === w.pool_id}
                        onClick={() => pick(w)}>
                        {busyId === w.pool_id ? <BtnSpinner /> : <Icon n={inset ? "check" : "plus"} />}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <Modal open={open} onClose={onClose} title={ll.title} maxWidth={640}>
            <SearchBox value={q} onChange={setQ} placeholder={ll.placeholder} phase={phase} debounceMs={SEARCH_DEBOUNCE_MS} count={total} />

            {/* фильтр по уровню — как в Базе слов */}
            <div className="seg" style={{ margin: "var(--sp-3) 0", flexWrap: "wrap" }}>
                <button className={"seg__item" + (level === "" ? " is-active" : "")} onClick={() => { setLevel(""); setPage(1); }}>{ll.all}</button>
                {LEVELS.map((lv) => (
                    <button key={lv} className={"seg__item" + (level === lv ? " is-active" : "")} onClick={() => { setLevel((c) => c === lv ? "" : lv); setPage(1); }}>{lv}</button>
                ))}
            </div>

            {/* умные подсказки «нет в базе» → создать через AI и добавить */}
            {smart.length > 0 && (
                <div className="spanel" style={{ margin: "0 0 var(--sp-3)", padding: "var(--sp-2) var(--sp-3)" }}>
                    <span className="muted" style={{ fontSize: "var(--fs-13)" }}>{ll.notInBase} </span>
                    {smart.map((s) => (
                        <button key={s.word} className="btn btn--ghost btn--sm" style={{ margin: "2px 4px" }}
                            disabled={busyId != null} onClick={() => createAndPick(s.word)}>
                            {busyId === "gen:" + s.word ? <BtnSpinner /> : <Icon n="plus" sm />} {ll.create} «{s.word}»
                        </button>
                    ))}
                </div>
            )}

            {items.length ? (
                <div className="wordlist" style={loading ? { opacity: .5, transition: "opacity .15s" } : { transition: "opacity .15s" }}>
                    {items.map(card)}
                </div>
            ) : (
                loading || phase !== "idle" ? <SkeletonWordlist count={8} />
                    : appliedQ ? <p className="muted" style={{ textAlign: "center", padding: "var(--sp-8) 0" }}>{ll.empty}</p> : null
            )}

            {totalPages > 1 && (
                <div className="pager" style={{ marginTop: "var(--sp-3)" }}>
                    <button className="pager__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon n="chevron-left" sm /></button>
                    <span className="pager__btn is-on">{page} / {totalPages}</span>
                    <button className="pager__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><Icon n="chevron-right" sm /></button>
                </div>
            )}
        </Modal>
    );
}
