// Инлайн-разбор разницы текущего слова с близким по смыслу: грузит api.getWordDiff(word, other),
// показывает summary / когда A / когда B / пример + форму «исправить» (api.rediff). Самодостаточен:
// родителю достаточно держать строку other (с каким словом сравниваем). Вынесено из WordInfoModal.
import { useEffect, useState } from "react";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import api from "../tools/api.js";

export default function WordDiff({ word, other, lang, t }) {
    const [state, setState] = useState({ loading: true, data: null });
    const [fixOpen, setFixOpen] = useState(false);
    const [fixHint, setFixHint] = useState("");
    const [fixBusy, setFixBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        setState({ loading: true, data: null });
        setFixOpen(false); setFixHint("");
        api.getWordDiff(word, other, lang)
            .then((r) => { if (alive) setState({ loading: false, data: r.diff }); })
            .catch(() => { if (alive) setState({ loading: false, data: null }); });
        return () => { alive = false; };
    }, [word, other, lang]);

    const submitRediff = async () => {
        if (fixBusy) return;
        setFixBusy(true);
        try {
            const r = await api.rediff(word, other, lang, fixHint.trim());
            setState((s) => ({ ...s, data: r.diff }));
            setFixOpen(false); setFixHint("");
        } catch { /* не вышло */ }
        setFixBusy(false);
    };

    return (
        <div className="diffbox">
            <div className="label" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "var(--sp-2)" }}>
                <Icon n="compare" sm /> {t.difference}: <b>{word}</b> / <b>{other}</b>
            </div>
            {state.loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-busy="true">
                    <span className="skel skel--line" style={{ width: "100%" }} />
                    <span className="skel skel--line" style={{ width: "85%" }} />
                </div>
            ) : state.data ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", lineHeight: "var(--lh-normal)" }}>
                    <span>{state.data.summary}</span>
                    <span><b>{word}</b> — {state.data.when_a}</span>
                    <span><b>{other}</b> — {state.data.when_b}</span>
                    {state.data.example && <span className="muted">{state.data.example}</span>}
                    {fixOpen ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginTop: "var(--sp-1)" }}>
                            <textarea className="input" rows={2} value={fixHint} autoFocus
                                onChange={(e) => setFixHint(e.target.value)} placeholder={t.fixHintPlaceholder} />
                            <div className="row" style={{ gap: "var(--sp-2)" }}>
                                <button className="btn btn--primary btn--sm" disabled={fixBusy} onClick={submitRediff}>
                                    {fixBusy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {t.regenerate}
                                </button>
                                <button className="btn btn--ghost btn--sm" disabled={fixBusy} onClick={() => { setFixOpen(false); setFixHint(""); }}>
                                    {t.cancel}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="diff-link" onClick={() => setFixOpen(true)} style={{ marginTop: "var(--sp-1)" }}>
                            <Icon n="edit" sm /> {t.fix}
                        </button>
                    )}
                </div>
            ) : (
                <p className="muted" style={{ margin: 0 }}>{t.descUnavailable}</p>
            )}
        </div>
    );
}
