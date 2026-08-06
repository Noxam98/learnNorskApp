// Вход в импорт слов из системного «Поделиться» картинкой (Android, задача A4).
//
// Сам OCR-поток не трогаем — это тот же PhotoImportModal (`/sets/{id}/ocr` → правка →
// `/sets/{id}/import-words`), только страницы ему приходят готовыми data-URL'ами от нативной
// стороны, а не из <input type=file>.
//
// Новая тут ровно одна ветка: набор ещё НЕ ВЫБРАН. Шарили-то из чужого приложения, а `/ocr`
// живёт под набором — значит сперва спрашиваем, куда класть слова (и разрешаем создать набор
// на месте: у нового пользователя наборов может не быть вообще).
import { useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import PhotoImportModal from "./PhotoImportModal.jsx";
import { IMPORT_I18N } from "./Import.i18n.js";
import { importErrorText } from "./importErrors.js";

const NAME_MAX = 20;   // как в SetsTab: кап названия набора

/**
 * @param {Object} p
 * @param {string[]} p.images data-URL'ы входящих картинок (уже ужаты нативной стороной)
 * @param {Array<{id:number,name:string,count?:number}>} [p.sets] наборы пользователя
 * @param {string} p.lang
 * @param {Record<string,string>} p.ll строки вкладки «Наборы»
 * @param {() => void} p.onClose
 * @param {(result:any, setId:number) => void} [p.onImported]
 * @param {(id:number|null) => void} [p.onSetCreated]
 */
export default function SharedImageImport({ images, sets = [], lang, ll, onClose, onImported, onSetCreated }) {
    const ui = { ...ll, ...(IMPORT_I18N[lang] || IMPORT_I18N.en) };
    const [setId, setSetId] = useState(null);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    if (!images?.length) return null;

    const create = async () => {
        const value = name.trim();
        if (!value || busy) return;
        setBusy(true); setError("");
        try {
            const r = await api.setCreate(value);
            const id = r?.id ?? null;
            onSetCreated?.(id);
            if (id != null) setSetId(id);
            else setError(ui.importFailed);
        } catch (e) {
            setError(importErrorText(e, ui, ui.importFailed));
        } finally {
            setBusy(false);
        }
    };

    // Набор выбран — дальше обычный поток импорта с фото, страницы уже засеяны.
    if (setId != null) {
        return (
            <PhotoImportModal open setId={setId} lang={lang} ll={ll} initialImages={images}
                onClose={onClose} onImported={(result) => onImported?.(result, setId)} />
        );
    }

    return (
        <Modal open onClose={busy ? () => {} : onClose} title={ui.sharedTitle} maxWidth={420}>
            <div className="ocr-previewbox">
                <img src={images[0]} alt="" className="ocr-preview" />
            </div>
            {images.length > 1 && (
                <div className="muted" style={{ marginTop: "var(--sp-2)", fontSize: "var(--fs-12)", textAlign: "center" }}>
                    {ui.imgPage.replace("{n}", "1").replace("{total}", String(images.length))}
                </div>
            )}
            <p style={{ margin: "var(--sp-3) 0 var(--sp-2)" }}><b>{ui.sharedPickSet}</b></p>
            {/* именно grid в одну колонку: .row — горизонтальный флекс, и список наборов
                в нём уезжает за край карточки (проверено на телефоне) */}
            {sets.length > 0 && (
                <div style={{ display: "grid", gap: "var(--sp-2)", maxHeight: "34dvh", overflowY: "auto" }}>
                    {sets.map((s) => (
                        <button key={s.id} className="btn btn--ghost btn--block" onClick={() => setSetId(s.id)}>
                            <Icon n="layers" sm /> {s.name}
                        </button>
                    ))}
                </div>
            )}
            <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-3)", flexDirection: "row" }}>
                <input className="input" value={name} placeholder={ui.sharedNewSetPh} maxLength={NAME_MAX}
                    aria-label={ui.sharedNewSet} style={{ flex: 1, minWidth: 0 }}
                    onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                    onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
                <button className="btn btn--accent" disabled={busy || !name.trim()} onClick={create}>
                    {busy ? <BtnSpinner /> : <Icon n="plus" sm />} {ui.sharedCreate}
                </button>
            </div>
            {error && (
                <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{error}</div>
            )}
        </Modal>
    );
}
