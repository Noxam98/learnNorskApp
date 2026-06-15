import { useEffect, useState } from "react";
import api from "../components/tools/api.js";
import { useSystemStore } from "../store/systemStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { BrandLoader, BtnSpinner } from "../components/ui/Spinner.jsx";

const Bar = ({ value, total, label }) => {
    const pct = total ? Math.round((value / total) * 100) : 0;
    return (
        <div style={{ marginBottom: "var(--sp-3)" }}>
            <div className="row between" style={{ marginBottom: 4, fontSize: "var(--fs-14)" }}>
                <span className="muted">{label}</span>
                <span><b>{value}</b> <span className="muted">/ {total} · {pct}%</span></span>
            </div>
            <div style={{ height: 8, borderRadius: "var(--r-full)", background: "var(--surface-3)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--fjord-600)", borderRadius: "var(--r-full)" }} />
            </div>
        </div>
    );
};

export const StatsPage = () => {
    const currentLanguage = useSystemStore((s) => s.currentLanguage);
    const t = interfaceTranslate[currentLanguage];
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const describeAll = async () => {
        setBusy(true);
        try { const r = await api.adminDescribeAll(); window.alert(`Запущено. В очереди описаний: ${r.pending}`); } catch { /* */ }
        setBusy(false);
    };

    const load = () => api.getAdminStats().then(setData).catch(() => setErr("forbidden"));
    useEffect(() => {
        load();
        const id = setInterval(load, 15000); // авто-обновление — видно процесс
        return () => clearInterval(id);
    }, []);

    if (err) return <main className="shell words-main"><p className="muted" style={{ padding: "var(--sp-12) 0", textAlign: "center" }}>403 — Forbidden</p></main>;
    if (!data) return <main className="shell words-main"><BrandLoader /></main>;

    const p = data.pool || {};
    const topics = data.topics || [];
    const levels = data.levels || [];
    const usage = data.usageToday || {};
    const topicLabel = (k) => t.topics?.[k] || k;

    return (
        <main className="shell words-main">
            <div className="page-head" style={{ marginBottom: "var(--sp-5)" }}>
                <div>
                    <span className="eyebrow"><Icon n="chart" sm /> ADMIN</span>
                    <h1 className="h1">Статистика проекта</h1>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={load}><Icon n="settings" sm /> Обновить</button>
            </div>

            <div className="pgrid" style={{ display: "grid", gap: "var(--sp-4)", gridTemplateColumns: "1fr 1fr" }}>
                <div className="card" style={{ padding: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Пул слов · всего <b style={{ color: "var(--ink)" }}>{p.total}</b></div>
                    <Bar value={p.embedding} total={p.total} label="С эмбеддингом" />
                    <Bar value={p.tts} total={p.total} label="С озвучкой" />
                    <Bar value={p.classified} total={p.total} label="Классифицировано (уровень)" />
                    <Bar value={p.description} total={p.total} label="С описанием" />
                    <button className="btn btn--primary btn--sm" disabled={busy} style={{ marginTop: "var(--sp-2)" }} onClick={describeAll}>
                        {busy ? <BtnSpinner /> : <Icon n="sparkles" sm />} Добить описания
                    </button>
                </div>

                <div className="card" style={{ padding: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Расход Gemini сегодня (UTC)</div>
                    {Object.keys(usage).length === 0
                        ? <p className="muted" style={{ margin: 0 }}>Пока нет вызовов</p>
                        : Object.entries(usage).map(([k, n]) => (
                            <div key={k} className="row between" style={{ fontSize: "var(--fs-13)", padding: "3px 0" }}>
                                <span className="muted" style={{ wordBreak: "break-all" }}>{k.replace(/^\d{4}-\d{2}-\d{2}:/, "")}</span>
                                <b>{n}</b>
                            </div>
                        ))}
                </div>

                <div className="card" style={{ padding: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Уровни</div>
                    {levels.map((l) => (
                        <div key={l.level} className="row between" style={{ padding: "3px 0", fontSize: "var(--fs-14)" }}>
                            <span className="chip lvl">{l.level}</span><b>{l.count}</b>
                        </div>
                    ))}
                </div>

                <div className="card" style={{ padding: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Темы ({topics.length})</div>
                    <div className="row wrap" style={{ gap: "var(--sp-2)" }}>
                        {topics.map((tp) => (
                            <span key={tp.topic} className="chip" style={{ background: "var(--surface-3)", color: "var(--ink)" }}>
                                {topicLabel(tp.topic)} <b>{tp.count}</b>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default StatsPage;
