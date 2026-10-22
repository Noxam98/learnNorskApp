// Модалка правки слова в пуле: норвежское слово + переводы на ВСЕ языки реестра + часть речи.
// Наружу уходит ПАТЧ — только изменённые поля (очищенное поле → [] = убрать перевод), бэк вмерживает
// его в запись, остальное не трогает. Админ — источник истины: правка ложится как введена, без
// ревью нейросети. Обычному юзеру (своё неодобренное слово) правку ревьюит нейросеть — ему же
// поле подсказки для неё. При успехе — onSaved({no, translate, part_of_speech}) с тем, что РЕАЛЬНО
// сохранено (родитель обновляет view и списки); окно остаётся открытым с баннером итога, форма
// перечитывается из сохранённого. Шапка слова — проп header. Вынесено из WordInfoModal.jsx.
import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { Dropdown } from "./Dropdown.jsx";
import { POS_ORDER, posApiKey, posLabelFull, posMeta } from "./pos.js";
import { LANG_CODES, LANG_BY } from "../../interface/languages.js";
import api from "../tools/api.js";

// Все языки реестра: раньше форма знала только 5 — lv/ar нельзя было ни увидеть, ни исправить,
// а у юзера с таким языком интерфейса главное поле было пустым и правка молча терялась.
const FIELDS = ["no", ...LANG_CODES];
const parse = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);
const join = (a) => (Array.isArray(a) ? a.join(", ") : "");
// ключ части речи для бэка (adjective, а не фронтовый adj); «не размечено» → ""
const posKeyOf = (pos) => {
    const { key } = posMeta(pos);
    return key === "other" ? "" : posApiKey(key);
};

// поля формы из переводов записи (no — фолбэк на само слово)
const formOf = (translate, no) => {
    const tr = translate || {};
    const f = Object.fromEntries(FIELDS.map((k) => [k, join(tr[k])]));
    if (!f.no) f.no = no || "";
    return f;
};

export default function EditWordModal({ open, view, lang, t, header, isAdmin = false, onClose, onSaved }) {
    const [edit, setEdit] = useState(null);
    const [pos, setPos] = useState("");
    const [busy, setBusy] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [review, setReview] = useState(null);
    const [hint, setHint] = useState("");
    const initRef = useRef({ form: {}, pos: "" });   // с чем сравниваем: в патч уходят только изменения

    const LANG_LABEL = { ru: t.russian, ukr: t.ukrainian, en: t.english, pl: t.polish, lt: t.lithuanian };
    const langLabel = (k) => LANG_LABEL[k] || LANG_BY[k]?.name || k;
    const posOptions = POS_ORDER.map((k) => ({ value: posApiKey(k), label: posLabelFull(posApiKey(k), t) }));

    const fill = (translate, no, partOfSpeech) => {
        const form = formOf(translate, no);
        const p = posKeyOf(partOfSpeech);
        initRef.current = { form, pos: p };
        setEdit(form); setPos(p);
    };

    // при открытии — заполнить поля из текущей записи и сбросить вспомогательное
    useEffect(() => {
        if (!open) return;
        fill(view?.translate, view?.no, view?.part_of_speech);
        setMoreOpen(false); setReview(null); setHint("");
    }, [open]); // eslint-disable-line

    const save = async () => {
        if (busy || !edit || !view) return;
        const init = initRef.current;
        const translate = {};
        for (const k of FIELDS) {
            const now = parse(edit[k]);
            if (now.join("\n") !== parse(init.form[k]).join("\n")) translate[k] = now;   // [] — убрать перевод
        }
        const newPos = pos && pos !== init.pos ? pos : undefined;
        if (!Object.keys(translate).length && !newPos && !hint.trim()) { onClose?.(); return; }   // нечего сохранять
        setBusy(true); setReview(null);
        try {
            // view.pool_id ОБЯЗАТЕЛЕН: без него бэк правит старшую по id запись омонима — правка
            // карточки сущ. `mot` («мужество») переписала бы предлог `mot` в общей Базе для всех.
            const r = await api.editPoolWord(view.no, translate, lang, isAdmin ? "" : hint, view.pool_id, newPos);
            setReview({ approved: !!r.approved, reason: r.reason || "" });
            if (r.approved) {
                const no = r.no || view.no;
                fill(r.translate, no, r.part_of_speech);   // форма = то, что реально сохранено
                setHint("");
                onSaved?.({ no, translate: r.translate || null, part_of_speech: r.part_of_speech || null });
            }
        } catch (e) {
            const m = String(e?.message || "").toLowerCase();
            setReview({ approved: false, reason: m.includes("exist") ? (t.wordExistsError || "") : m.includes("review") ? (t.reviewFailed || "Не удалось проверить правку, попробуйте позже") : (t.unexpectedError || "—") });
        }
        setBusy(false);
    };

    const okLabel = isAdmin ? (t.editSaved || "Сохранено") : (t.reviewApproved || "Одобрено");

    return (
        <Modal open={open} onClose={() => !busy && onClose?.()} title={t.editWord || "Изменить слово"}
            footer={<>
                <button className="btn btn--ghost" disabled={busy} onClick={() => onClose?.()}>{t.cancel}</button>
                <button className="btn btn--primary" disabled={busy} onClick={save}>{busy ? <><BtnSpinner />{!isAdmin && <> {t.reviewing || "Проверка…"}</>}</> : t.save}</button>
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
                        <label className="label">{langLabel(lang)}</label>
                        <input className="input" value={edit[lang] || ""} placeholder={t.translate}
                            onChange={(e) => setEdit((s) => ({ ...s, [lang]: e.target.value }))} />
                        <span className="input-hint">{t.multipleVariantsHint}</span>
                    </div>
                    <div className="field">
                        <label className="label">{t.partOfSpeech || "Часть речи"}</label>
                        <Dropdown value={pos} options={posOptions} onChange={setPos} />
                    </div>
                    {moreOpen ? (
                        LANG_CODES.filter((k) => k !== lang).map((k) => (
                            <div className="field" key={k}>
                                <label className="label">{langLabel(k)}</label>
                                <input className="input" value={edit[k] || ""} dir={LANG_BY[k]?.dir || "ltr"}
                                    onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))} />
                            </div>
                        ))
                    ) : (
                        <button className="diff-link" onClick={() => setMoreOpen(true)}>
                            <Icon n="plus" sm /> {t.more || "Дополнительно"}
                        </button>
                    )}
                    {!isAdmin && (
                        <div className="field">
                            <label className="label">{t.editHintLabel || "Подсказка (необязательно)"}</label>
                            <input className="input" value={hint} placeholder={t.editHintPlaceholder || "напр.: это глагол, не существительное"}
                                onChange={(e) => setHint(e.target.value)} />
                        </div>
                    )}
                    {review && (
                        <div style={{
                            display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10,
                            fontSize: "var(--fs-13)", lineHeight: "var(--lh-normal)",
                            background: review.approved ? "var(--success-bg)" : "var(--danger-bg)",
                            color: review.approved ? "var(--success)" : "var(--danger)",
                        }}>
                            <Icon n={review.approved ? "check" : "x"} sm style={{ flexShrink: 0, marginTop: 2 }} />
                            <span><b>{review.approved ? okLabel : (t.reviewRejected || "Отклонено")}.</b> {review.reason}</span>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
