// Ручной выбор точных слов онлайн-партии из Базы. Состав живёт локально до «Готово»:
// сервер получает только pool_id и повторно проверяет доступность записей для хоста.
import { useEffect, useState } from "react";
import api from "../tools/api.js";
import { Dropdown } from "../ui/Dropdown.jsx";
import { Icon } from "../ui/Icon.jsx";
import { SearchBox } from "../ui/SearchBox.jsx";
import { SkeletonWordlist } from "../ui/Spinner.jsx";
import { WordCard } from "../ui/WordCard.jsx";

const LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 450;
const MAX_WORDS = 20;

export function OnlineWordPicker({ open, onClose, theme, lang, t, to, selected = [], known = {}, onConfirm }) {
    const [draft, setDraft] = useState(() => new Set(selected));
    const [wordById, setWordById] = useState(known);
    const [q, setQ] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [phase, setPhase] = useState("idle");
    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState("");
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setDraft(new Set(selected));
        setWordById(known || {});
        setQ("");
        setAppliedQ("");
        setTopic("");
        setLevel("");
        setPage(1);
    }, [open]); // eslint-disable-line

    useEffect(() => {
        if (!open) return undefined;
        setPhase("counting");
        const id = setTimeout(() => {
            setAppliedQ(q.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [q, open]);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setLoading(true);
        setPhase("searching");
        api.getPool({
            q: appliedQ,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
            topics: topic ? [topic] : [],
            level,
            sort: appliedQ ? "relevance" : "alpha",
            order: appliedQ ? "desc" : "asc",
            lang,
        }).then((res) => {
            if (cancelled) return;
            setItems(res?.words || []);
            setTotal(res?.total || 0);
        }).catch(() => {
            if (!cancelled) {
                setItems([]);
                setTotal(0);
            }
        }).finally(() => {
            if (!cancelled) {
                setLoading(false);
                setPhase("idle");
            }
        });
        return () => { cancelled = true; };
    }, [open, appliedQ, page, topic, level, lang]);

    if (!open) return null;

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const topicOpts = [
        { value: "", label: to.anyTopic || "Любая тема" },
        ...Object.keys(t.topics || {}).map((key) => ({ value: key, label: t.topics[key] })),
    ];
    const levelOpts = LEVELS.map((value) => ({ value, label: value || (to.anyLevel || "Любой уровень") }));
    const cardT = {
        ...t,
        addToDict: to.selectWord || "Выбрать слово",
        removeFromDict: to.unselectWord || "Убрать из выбора",
    };
    const selectedKnown = [...draft].map((id) => wordById[id]).filter(Boolean);

    const toggle = (word) => {
        const pid = word.pool_id;
        setDraft((cur) => {
            const next = new Set(cur);
            if (next.has(pid)) next.delete(pid);
            else if (next.size < MAX_WORDS) next.add(pid);
            return next;
        });
        setWordById((cur) => ({ ...cur, [pid]: word }));
    };

    return (
        <div className="roomwordpick" data-theme={theme}>
            <div className="scrim" onClick={onClose} />
            <div className="modal wordpick__modal" role="dialog" aria-modal="true" aria-label={to.chooseWords || "Выбрать слова"}>
                <div className="modal__head">
                    <div>
                        <h2 className="modal__title">{to.chooseWords || "Выбрать слова"}</h2>
                        <div className="wordpick__count">
                            {(to.selectedCount || "Выбрано: {n} из 20").replace("{n}", String(draft.size))}
                        </div>
                    </div>
                    <button className="modal__x" aria-label={t.cancel} onClick={onClose}>✕</button>
                </div>

                <div className="wordpick__tools">
                    <SearchBox value={q} onChange={setQ} placeholder={to.wordSearch || "Слово на любом языке…"}
                        phase={phase} debounceMs={SEARCH_DEBOUNCE_MS} count={total} style={{ margin: 0 }} />
                    <div className="wordpick__filters">
                        <Dropdown value={topic} options={topicOpts} onChange={(value) => { setTopic(value); setPage(1); }} />
                        <Dropdown value={level} options={levelOpts} onChange={(value) => { setLevel(value); setPage(1); }} />
                    </div>
                    {selectedKnown.length > 0 && (
                        <div className="wordpick__chips">
                            {selectedKnown.map((word) => (
                                <button key={word.pool_id} type="button" className="wordpick__chip" onClick={() => toggle(word)}>
                                    {word.word || word.norwegian} <Icon n="x" sm />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="wordpick__body">
                    {loading && items.length === 0 ? <SkeletonWordlist count={8} /> : items.length ? (
                        <div className="wordlist" style={loading ? { opacity: 0.5 } : undefined}>
                            {items.map((word) => (
                                <WordCard key={word.pool_id} word={word} lang={lang} t={cardT}
                                    added={draft.has(word.pool_id)}
                                    onToggle={() => toggle(word)} />
                            ))}
                        </div>
                    ) : (
                        <div className="wordpick__empty">{to.noWordsFound || "Ничего не найдено"}</div>
                    )}
                    {totalPages > 1 && (
                        <div className="pager">
                            <button className="pager__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                <Icon n="chevron-left" sm />
                            </button>
                            <span className="pager__btn is-on">{page} / {totalPages}</span>
                            <button className="pager__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                <Icon n="chevron-right" sm />
                            </button>
                        </div>
                    )}
                </div>

                <div className="modal__foot">
                    <span className={"wordpick__hint" + (draft.size >= 3 ? " is-ok" : "")}>
                        {draft.size >= 3
                            ? (to.selectionReady || "Набор готов")
                            : (to.selectionMin || "Выберите минимум 3 слова")}
                    </span>
                    <button className="rmbtn rmbtn--ghost" onClick={onClose}>{t.cancel}</button>
                    <button className="rmbtn rmbtn--primary" disabled={draft.size < 3}
                        onClick={() => onConfirm([...draft], wordById)}>
                        {to.done || "Готово"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OnlineWordPicker;
