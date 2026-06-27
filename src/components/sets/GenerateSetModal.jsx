// Модалка AI-генерации слов в набор: тема + уровни (CEFR, мультивыбор) + количество (5–20).
// Самодостаточна: владеет формой и состоянием busy; на успехе зовёт onGenerated (родитель
// перезагружает слова/наборы), затем onClose. Вынесено из SetsTab.jsx.
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function GenerateSetModal({ open, setId, lang, ll, defaultTopic, onClose, onGenerated }) {
    const [gen, setGen] = useState({ topic: "", levels: [], count: 10 });
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (open) setGen({ topic: "", levels: [], count: 10 }); }, [open]);

    const doGenerate = async () => {
        if (busy || !setId) return;
        setBusy(true);
        try {
            await api.setGenerate(setId, { topic: (gen.topic || "").trim() || (defaultTopic || ""), level: (gen.levels || []).join(", "), count: gen.count, lang });
            onGenerated?.();
            onClose?.();
        } catch { onClose?.(); } finally { setBusy(false); }
    };

    return (
        <Modal open={open} onClose={() => { if (!busy) onClose?.(); }} title={ll.genTitle} maxWidth={460}>
            {open && (
                <>
                    {/* тема по умолчанию = имя набора (в плейсхолдере: ввод нативно перезаписывает) */}
                    <input className="input" autoFocus value={gen.topic} placeholder={defaultTopic ? ll.genTopicTpl.replace("{n}", defaultTopic) : ll.genTopicPh}
                        onChange={(e) => setGen((g) => ({ ...g, topic: e.target.value }))} style={{ width: "100%" }} />
                    <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>CEFR</div>
                    {/* уровни — чипы, множественный выбор; «Любой» = пустой выбор (взаимоисключающе) */}
                    <div className="chiprow" style={{ flexWrap: "wrap", gap: "var(--sp-2)" }}>
                        <button className={"fchip" + (gen.levels.length === 0 ? " is-on" : "")} onClick={() => setGen((g) => ({ ...g, levels: [] }))}>{ll.levelAny}</button>
                        {CEFR.map((lv) => (
                            <button key={lv} className={"fchip" + (gen.levels.includes(lv) ? " is-on" : "")}
                                onClick={() => setGen((g) => ({ ...g, levels: g.levels.includes(lv) ? g.levels.filter((x) => x !== lv) : [...g.levels, lv] }))}>{lv}</button>
                        ))}
                    </div>
                    <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>{ll.count}: <b style={{ color: "var(--ink)" }}>{gen.count}</b></div>
                    <input type="range" min="5" max="20" value={gen.count} style={{ width: "100%" }}
                        onChange={(e) => setGen((g) => ({ ...g, count: Number(e.target.value) }))} />
                    <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-4)" }}
                        disabled={busy || gen.count < 5} onClick={doGenerate}>
                        {busy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {busy ? ll.generating : ll.generate}
                    </button>
                </>
            )}
        </Modal>
    );
}
