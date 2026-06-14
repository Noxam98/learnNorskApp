import { useEffect, useState } from "react";
import api from "../components/tools/api.js";
import { useWordsStore } from "../store/wordStore.jsx";
import { useSystemStore } from "../store/systemStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { posMeta, posLabel } from "../components/ui/pos.js";
import { speakNorwegian } from "../components/ui/tts.js";

const LIMIT = 60;

export const PoolPage = () => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const addFromPool = useWordsStore((s) => s.addFromPool);

    const [q, setQ] = useState("");
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [added, setAdded] = useState({});

    const load = async (reset) => {
        setLoading(true);
        const off = reset ? 0 : offset;
        try {
            const res = await api.getPool({ q, limit: LIMIT, offset: off });
            setTotal(res.total || 0);
            setItems(reset ? (res.words || []) : [...items, ...(res.words || [])]);
            setOffset(off + (res.words?.length || 0));
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => {
        const id = setTimeout(() => load(true), 250);
        return () => clearTimeout(id);
    }, [q]);

    const onAdd = async (word) => {
        try { await addFromPool(word); setAdded((a) => ({ ...a, [word]: true })); } catch { /* ignore */ }
    };

    return (
        <main className="shell words-main">
            <div className="page-head" style={{ marginBottom: "var(--sp-4)" }}>
                <div>
                    <span className="eyebrow"><Icon n="grid" sm /> {t.navBar.base}</span>
                    <h1 className="h1">{t.poolTitle}</h1>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{t.poolDesc}</p>
                </div>
            </div>

            <div className="composer" style={{ marginBottom: "var(--sp-4)" }}>
                <span className="composer__spark"><Icon n="search" /></span>
                <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.inputPlaceholder} />
                <span className="composer__hint">{total}</span>
            </div>

            {items.length ? (
                <div className="wordlist">
                    {items.map((w) => {
                        const { cls } = posMeta(w.part_of_speech);
                        return (
                            <div className="wcard" key={w.word}>
                                <div className="wcard__body">
                                    <span className="wcard__word">{w.word}</span>
                                    <span className={`chip pos ${cls}`}>{posLabel(w.part_of_speech, t)}</span>
                                    <span className="wcard__tr">{w.translate?.[currentLanguage]?.join(", ")}</span>
                                </div>
                                <div className="wcard__actions" style={{ position: "static", opacity: 1, background: "transparent", boxShadow: "none" }}>
                                    <button className="iconbtn" aria-label={t.tts} onClick={() => speakNorwegian(w.word)}><Icon n="volume" /></button>
                                    <button className="btn btn--outline btn--sm" disabled={added[w.word]} onClick={() => onAdd(w.word)}>
                                        <Icon n={added[w.word] ? "check" : "plus"} sm /> {t.addToDict}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="muted" style={{ textAlign: "center", padding: "var(--sp-12) 0" }}>{loading ? "…" : t.poolEmpty}</p>
            )}

            {items.length < total && (
                <div style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>
                    <button className="btn btn--outline" onClick={() => load(false)} disabled={loading}>
                        {loading ? "…" : "+"}
                    </button>
                </div>
            )}
        </main>
    );
};

export default PoolPage;
