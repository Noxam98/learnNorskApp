import { useEffect, useState } from "react";
import api from "../components/tools/api.js";
import { useSystemStore } from "../store/systemStore.jsx";
import { interfaceTranslate } from "../interface/interfaceTranslation.jsx";
import { Icon } from "../components/ui/Icon.jsx";
import { BrandLoader } from "../components/ui/Spinner.jsx";

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
    const [control, setControl] = useState(null); // {autofill, embed, describe} -> paused?

    const load = () => api.getAdminStats().then(setData).catch(() => setErr("forbidden"));
    const loadControl = () => api.getAdminControl().then((r) => setControl(r.paused)).catch(() => {});
    useEffect(() => {
        load(); loadControl();
        const id = setInterval(() => { load(); loadControl(); }, 15000); // авто-обновление — видно процесс
        return () => clearInterval(id);
    }, []);

    const toggle = async (key) => {
        const next = !control?.[key];
        setControl((c) => ({ ...(c || {}), [key]: next })); // оптимистично
        try { const r = await api.setAdminControl(key, next); setControl(r.paused); }
        catch { loadControl(); }
    };

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
                <div className="card" style={{ padding: "var(--sp-5)", gridColumn: "1 / -1" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Фоновые задачи</div>
                    {[["autofill", "Добавление слов"], ["embed", "Эмбеддинги"], ["describe", "Описания"], ["pos", "Части речи"], ["forms", "Грамм. формы"], ["homograph", "Омонимы"]].map(([key, name]) => {
                        const paused = control?.[key];
                        return (
                            <div key={key} className="row between" style={{ padding: "6px 0", fontSize: "var(--fs-14)" }}>
                                <span className="row" style={{ gap: "var(--sp-2)" }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "var(--r-full)", background: paused ? "var(--surface-3)" : "#22c55e" }} />
                                    {name} <span className="muted">{paused ? "· на паузе" : "· работает"}</span>
                                </span>
                                <button
                                    className="btn btn--sm"
                                    onClick={() => toggle(key)}
                                    disabled={control == null}
                                    style={paused
                                        ? { background: "var(--fjord-600)", color: "#fff" }
                                        : { background: "transparent", color: "#ef4444", border: "1px solid #ef4444" }}
                                >
                                    {paused ? "▶ Возобновить" : "⏹ Остановить"}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="card" style={{ padding: "var(--sp-5)" }}>
                    <div className="label" style={{ marginBottom: "var(--sp-4)" }}>Пул слов · всего <b style={{ color: "var(--ink)" }}>{p.total}</b></div>
                    <Bar value={p.embedding} total={p.total} label="С эмбеддингом" />
                    <Bar value={p.tts} total={p.total} label="С озвучкой" />
                    <Bar value={p.classified} total={p.total} label="Классифицировано (уровень)" />
                    <Bar value={p.description} total={p.total} label="С описанием" />
                    <Bar value={p.forms} total={p.formable ?? p.total} label="С грамм. формами (сущ./глаг./прил.)" />
                    {p.forms_by_pos && [["noun", "· существительные"], ["verb", "· глаголы"], ["adjective", "· прилагательные"]].map(([k, name]) => (
                        <Bar key={k} value={p.forms_by_pos[k]?.with} total={p.forms_by_pos[k]?.total} label={name} />
                    ))}
                    {p.noun_no_gender > 0 && (
                        <div className="row between" style={{ fontSize: "var(--fs-13)", padding: "4px 0", color: "var(--st-weak, #B23A2E)" }}>
                            <span>⚠ Сущ. с формами, но без рода (нет артикля)</span>
                            <b>{p.noun_no_gender}</b>
                        </div>
                    )}
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
