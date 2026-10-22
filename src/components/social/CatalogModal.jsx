// Каталог наборов сообщества: поиск по названию/автору, сортировка (популярные/новые), превью
// состава и «Взять себе» — своя копия набора. В каталоге только слова общей базы (бэк фильтрует).
// Самодостаточная модалка: open + onClose + onTaken(setId) — родитель перечитывает свои наборы.
import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import { pl } from "../ui/plural.js";
import api from "../tools/api.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { useSocialStore } from "../../store/socialStore.jsx";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { C, P } from "./Social.i18n.js";

const PAGE = 30;
const DEBOUNCE_MS = 300;

/** @param {{ open: boolean, lang: string, onClose: () => void, onTaken?: (setId: number) => void }} p */
export default function CatalogModal({ open, lang, onClose, onTaken }) {
    const c = C[lang] || C.ru;
    const anon = (P[lang] || P.ru).anon;
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const openProfile = useSocialStore((s) => s.openProfile);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("popular");
    const [items, setItems] = useState(/** @type {any[]} */([]));
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState(/** @type {any} */(null));   // открытое превью набора
    const [busy, setBusy] = useState(false);
    const reqRef = useRef(0);

    useEffect(() => { if (!open) { setQ(""); setView(null); setItems([]); setTotal(0); } }, [open]);

    // Первая страница — на открытие и смену фильтра; ответы нумеруем (поздний не перетирает свежий).
    useEffect(() => {
        if (!open) return;
        const id = ++reqRef.current;
        setLoading(true);
        const tm = setTimeout(() => {
            api.catalogList({ q: q.trim(), sort, limit: PAGE, offset: 0 })
                .then((r) => { if (id === reqRef.current) { setItems(r?.items || []); setTotal(r?.total || 0); } })
                .catch(() => { if (id === reqRef.current) { setItems([]); setTotal(0); } })
                .finally(() => { if (id === reqRef.current) setLoading(false); });
        }, q ? DEBOUNCE_MS : 0);
        return () => clearTimeout(tm);
    }, [open, q, sort]);

    const more = async () => {
        setLoading(true);
        try {
            const r = await api.catalogList({ q: q.trim(), sort, limit: PAGE, offset: items.length });
            setItems((prev) => [...prev, ...(r?.items || [])]);
            setTotal(r?.total || 0);
        } catch { /* оставляем то, что есть */ } finally { setLoading(false); }
    };

    const preview = async (/** @type {any} */ it) => {
        setView({ ...it, words: null });
        try { setView(await api.catalogSet(it.id)); }
        catch { setView(null); useSystemStore.getState().showToast(c.errGeneric); }
    };

    // Взяли/сняли — правим и превью, и строку списка, чтобы назад вернуться в актуальное состояние.
    const patch = (/** @type {number} */ id, /** @type {any} */ fields) => {
        setView((v) => (v && v.id === id ? { ...v, ...fields } : v));
        setItems((list) => list.map((x) => (x.id === id ? { ...x, ...fields } : x)));
    };

    const take = async () => {
        if (!view) return;
        setBusy(true);
        try {
            const r = await api.catalogClone(view.id);
            useSystemStore.getState().showToast(c.takenToast.replace("{set}", r?.name || view.name), "success");
            patch(view.id, { taken: true, clones: view.clones + (view.taken ? 0 : 1) });
            onTaken?.(r?.set_id);
        } catch { useSystemStore.getState().showToast(c.errGeneric); }
        finally { setBusy(false); }
    };

    const adminHide = async () => {
        if (!view) return;
        await api.adminCatalogUnpublish(view.id).catch(() => {});
        setItems((list) => list.filter((x) => x.id !== view.id));
        setTotal((n) => Math.max(0, n - 1));
        setView(null);
    };

    const author = (/** @type {any} */ a) => (
        <button className="soc-author" onClick={(e) => { e.stopPropagation(); openProfile(a.id); }}>
            <Icon n="user" sm /> {a.name || anon}
        </button>
    );

    if (!open) return null;
    return (
        <Modal open={open} onClose={onClose} title={view ? view.name : c.title} maxWidth={560}>
            {view ? (
                <div className="soc-catalog">
                    {/* «назад» — в теле, а не в шапке модалки: на телефоне угловая кнопка ложится на заголовок */}
                    <div className="soc-catalog__head">
                        <button className="btn btn--sm btn--ghost" onClick={() => setView(null)}>
                            <Icon n="arrow-left" sm /> {c.back}
                        </button>
                        <span className="muted">{c.took.replace("{n}", String(view.clones))}</span>
                    </div>
                    <div className="soc-catalog__by">{author(view.author)}</div>
                    <div className="soc-words">
                        {view.words == null ? <div className="soc-note"><BtnSpinner /></div>
                            : view.words.map((/** @type {any} */ w) => (
                                <div key={w.pool_id} className="soc-word">
                                    <b lang="nb">{w.norwegian}</b>
                                    <span>{w.translate?.[lang]?.join(", ") || ""}</span>
                                    {w.level && <i>{w.level}</i>}
                                </div>
                            ))}
                    </div>
                    <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
                        <button className="btn btn--accent btn--block" disabled={busy || view.mine || view.taken || view.words == null} onClick={take}>
                            {busy ? <BtnSpinner /> : <Icon n={view.mine ? "user" : view.taken ? "check" : "download"} sm />}{" "}
                            {view.mine ? c.mine : view.taken ? c.taken : c.take}
                        </button>
                        {isAdmin && !view.mine && (
                            <button className="btn btn--danger" onClick={adminHide} title={c.adminHide}><Icon n="eye-off" sm /></button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="soc-catalog">
                    <div className="soc-search">
                        <Icon n="search" sm />
                        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.ph}
                            autoComplete="off" spellCheck="false" aria-label={c.ph} />
                    </div>
                    <div className="lb-seg soc-seg">
                        <button className={"lb-seg__b" + (sort === "popular" ? " is-on" : "")} onClick={() => setSort("popular")}>{c.popular}</button>
                        <button className={"lb-seg__b" + (sort === "new" ? " is-on" : "")} onClick={() => setSort("new")}>{c.fresh}</button>
                    </div>
                    <div className="soc-list">
                        {loading && !items.length ? <div className="soc-note"><BtnSpinner /></div>
                            : !items.length ? <div className="soc-note">{q.trim() ? c.empty : c.emptyAll}</div>
                                : items.map((it) => (
                                    <div key={it.id} className="soc-row" role="button" tabIndex={0} onClick={() => preview(it)}>
                                        <span className="setrow__ic"><Icon n="layers" sm /></span>
                                        <span className="soc-row__meta">
                                            <span className="soc-row__t">{it.name}</span>
                                            <span className="soc-row__d">
                                                {it.level ? `${it.level} · ` : ""}{it.count} {pl(lang, it.count, "word")} · {author(it.author)}
                                            </span>
                                        </span>
                                        <span className="soc-row__pts">
                                            {it.taken ? <Icon n="check" sm /> : <b>{it.clones}</b>}
                                            <i>{it.taken ? c.taken : c.tookLabel}</i>
                                        </span>
                                    </div>
                                ))}
                    </div>
                    {items.length < total && (
                        <button className="wn__more" disabled={loading} onClick={more}>{loading ? <BtnSpinner /> : c.more}</button>
                    )}
                </div>
            )}
        </Modal>
    );
}
