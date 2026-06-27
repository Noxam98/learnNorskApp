// Модалка правки слова в общем пуле: норвежское слово + переводы по языкам + подсказка ревью.
// api.editPoolWord прогоняет правку через AI-ревью; при одобрении наружу уходит onSaved
// ({no, translate|null, edited}) — родитель обновляет view (мерж переводов) и перезагружает данные.
// Окно остаётся открытым с баннером вердикта (как в оригинале). Шапка слова — проп header.
// Вынесено из WordInfoModal.jsx.
import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import api from "../tools/api.js";

const FIELDS = ["no", "ru", "ukr", "en", "pl", "lt"];

export default function EditWordModal({ open, view, lang, t, header, onClose, onSaved }) {
    const [edit, setEdit] = useState(null);
    const [busy, setBusy] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [review, setReview] = useState(null);
    const [hint, setHint] = useState("");

    const LANG_LABEL = { ru: t.russian, ukr: t.ukrainian, en: t.english, pl: t.polish, lt: t.lithuanian };

    // при открытии — заполнить поля из текущих переводов слова и сбросить вспомогательное
    useEffect(() => {
        if (!open) return;
        const tr = view?.translate || {};
        const join = (a) => (Array.isArray(a) ? a.join(", ") : "");
        setEdit({
            no: join(tr.no) || view?.no || "",
            ru: join(tr.ru), ukr: join(tr.ukr), en: join(tr.en), pl: join(tr.pl), lt: join(tr.lt),
        });
        setMoreOpen(false); setReview(null); setHint("");
    }, [open]); // eslint-disable-line

    const save = async () => {
        if (busy || !edit || !view) return;
        const parse = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
        const translate = {};
        for (const k of FIELDS) { const v = parse(edit[k]); if (v.length) translate[k] = v; }
        setBusy(true); setReview(null);
        try {
            const r = await api.editPoolWord(view.no, translate, lang, hint);   // ревью + правка общего пула
            setReview({ approved: !!r.approved, reason: r.reason || "" });
            if (r.approved) {  // одобрено: нейросеть вернула стандартизованное слово/переводы
                const newNo = r.no || translate.no?.[0] || view.no;
                onSaved?.({ no: newNo, translate: r.translate || null, edited: translate });
            }
        } catch (e) {
            const m = String(e?.message || "").toLowerCase();
            setReview({ approved: false, reason: m.includes("exist") ? (t.dictExistsError || "") : m.includes("review") ? (t.reviewFailed || "Не удалось проверить правку, попробуйте позже") : (t.unexpectedError || "—") });
        }
        setBusy(false);
    };

    return (
        <Modal open={open} onClose={() => !busy && onClose?.()} title={t.editWord || "Изменить слово"}
            footer={<>
                <button className="btn btn--ghost" disabled={busy} onClick={() => onClose?.()}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={busy} onClick={save}>{busy ? <><BtnSpinner /> {t.reviewing || "Проверка…"}</> : t.save}</button>
            </>}>
            {edit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {header}
                    <div className="field">
                        <label className="label">{t.norwegianWord || "Норвежское слово"}</label>
                        <input className="input" value={edit.no} autoFocus
                            onChange={(e) => setEdit((s) => ({ ...s, no: e.target.value }))} />
                    </div>
                    <div className="field">
                        <label className="label">{LANG_LABEL[lang] || lang}</label>
                        <input className="input" value={edit[lang] || ""} placeholder={t.translate}
                            onChange={(e) => setEdit((s) => ({ ...s, [lang]: e.target.value }))} />
                        <span className="input-hint">{t.multipleVariantsHint}</span>
                    </div>
                    {moreOpen ? (
                        Object.keys(LANG_LABEL).filter((k) => k !== lang).map((k) => (
                            <div className="field" key={k}>
                                <label className="label">{LANG_LABEL[k]}</label>
                                <input className="input" value={edit[k] || ""}
                                    onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))} />
                            </div>
                        ))
                    ) : (
                        <button className="diff-link" onClick={() => setMoreOpen(true)}>
                            <Icon n="plus" sm /> {t.more || "Дополнительно"}
                        </button>
                    )}
                    <div className="field">
                        <label className="label">{t.editHintLabel || "Подсказка (необязательно)"}</label>
                        <input className="input" value={hint} placeholder={t.editHintPlaceholder || "напр.: это глагол, не существительное"}
                            onChange={(e) => setHint(e.target.value)} />
                    </div>
                    {review && (
                        <div style={{
                            display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
                            fontSize: "var(--fs-13)", lineHeight: "var(--lh-normal)",
                            background: review.approved ? "var(--success-bg)" : "var(--danger-bg)",
                            color: review.approved ? "var(--success)" : "var(--danger)",
                        }}>
                            <Icon n={review.approved ? "check" : "x"} sm style={{ flexShrink: 0, marginTop: 2 }} />
                            <span><b>{review.approved ? (t.reviewApproved || "Одобрено") : (t.reviewRejected || "Отклонено")}.</b> {review.reason}</span>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
