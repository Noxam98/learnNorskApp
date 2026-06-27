// Импорт слов в набор с фото/камеры. Самодостаточный поток в трёх фазах:
//   1) выбор источника (камера c capture / галерея) → скрытые file-input'ы;
//   2) превью фото + уточнение промта → OCR (api.setOcr);
//   3) правка распознанного списка (≤20) → api.setImportWords → onImported (родитель перезагружает).
// Владеет своим состоянием; родитель лишь открывает (open) и слушает onClose/onImported.
// Вынесено из SetsTab.jsx.
import { useState, useRef } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import { downscaleImage } from "../tools/imageScale.js";

export default function PhotoImportModal({ open, setId, lang, ll, onClose, onImported }) {
    // null | { dataUrl, hint, words:null|string[], busy, error }
    // words===null → фаза «фото + уточнение + Распознать»; массив → фаза «правка списка + Добавить»
    const [photo, setPhoto] = useState(null);
    const camRef = useRef(null);   // input с capture → камера
    const galRef = useRef(null);   // input без capture → галерея/файлы

    const pickFrom = (ref) => { onClose?.(); const el = ref.current; if (el) { el.value = ""; el.click(); } };
    const onPickFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const dataUrl = await downscaleImage(file);
            setPhoto({ dataUrl, hint: "", words: null, busy: false, error: "" });
        } catch { setPhoto({ dataUrl: "", hint: "", words: null, busy: false, error: ll.imgFail }); }
    };
    const runOcr = async () => {
        if (!photo || photo.busy || !setId) return;
        setPhoto((p) => ({ ...p, busy: true, error: "" }));
        try {
            const r = await api.setOcr(setId, { image: photo.dataUrl, hint: photo.hint });
            const words = (r?.words || []).slice(0, 20);
            setPhoto((p) => ({ ...p, busy: false, words, error: words.length ? "" : ll.imgEmpty }));
        } catch { setPhoto((p) => ({ ...p, busy: false, error: ll.imgFail })); }
    };
    const setWord = (i, v) => setPhoto((p) => ({ ...p, words: p.words.map((w, j) => j === i ? v : w) }));
    const delWord = (i) => setPhoto((p) => ({ ...p, words: p.words.filter((_, j) => j !== i) }));
    const addWord = () => setPhoto((p) => (p.words.length >= 20 ? p : { ...p, words: [...p.words, ""] }));
    const doImport = async () => {
        if (!photo || photo.busy || !setId) return;
        const words = (photo.words || []).map((w) => w.trim()).filter(Boolean);
        if (!words.length) return;
        setPhoto((p) => ({ ...p, busy: true, error: "" }));
        try {
            await api.setImportWords(setId, { words, lang });
            setPhoto(null);
            onImported?.();
        } catch { setPhoto((p) => ({ ...p, busy: false, error: ll.imgFail })); }
    };

    return (
        <>
            {/* два скрытых input (камера c capture / галерея без) + выбор источника */}
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPickFile} style={{ display: "none" }} />
            <input ref={galRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
            <Modal open={open} onClose={onClose} title={ll.imgSource} maxWidth={340}>
                <div className="row" style={{ gap: "var(--sp-3)" }}>
                    <button className="btn btn--accent btn--block" onClick={() => pickFrom(camRef)}>
                        <Icon n="camera" sm /> {ll.imgCamera}
                    </button>
                    <button className="btn btn--ghost btn--block" onClick={() => pickFrom(galRef)}>
                        <Icon n="image" sm /> {ll.imgGallery}
                    </button>
                </div>
            </Modal>
            <Modal open={!!photo} onClose={() => { if (!photo?.busy) setPhoto(null); }} title={ll.imgTitle} maxWidth={460}>
                {photo && (photo.words === null ? (
                    /* фаза 1: превью фото + уточнение промта + «Распознать» */
                    <>
                        {photo.dataUrl && <img src={photo.dataUrl} alt="" className="ocr-preview" />}
                        <textarea className="input" rows={2} value={photo.hint} placeholder={ll.imgHintPh}
                            onChange={(e) => setPhoto((p) => ({ ...p, hint: e.target.value }))}
                            style={{ width: "100%", marginTop: "var(--sp-3)", resize: "none" }} />
                        {photo.error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{photo.error}</div>}
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                            disabled={photo.busy || !photo.dataUrl} onClick={runOcr}>
                            {photo.busy ? <BtnSpinner /> : <Icon n="camera" sm />} {photo.busy ? ll.imgBusy : ll.imgRun}
                        </button>
                    </>
                ) : (
                    /* фаза 2: правка распознанного списка + «Добавить N» */
                    <>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>{ll.imgReview}</div>
                        <div className="ocr-list">
                            {photo.words.map((w, i) => (
                                <div className="ocr-row" key={i}>
                                    <input className="input" value={w} placeholder={ll.namePh}
                                        onChange={(e) => setWord(i, e.target.value)} />
                                    <button className="ocr-del" aria-label="×" onClick={() => delWord(i)}><Icon n="x" sm /></button>
                                </div>
                            ))}
                        </div>
                        {photo.words.length < 20 && (
                            <button className="btn btn--ghost btn--sm" style={{ marginTop: "var(--sp-2)" }} onClick={addWord}>
                                <Icon n="plus" sm /> {ll.addWord}
                            </button>
                        )}
                        {photo.error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{photo.error}</div>}
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                            disabled={photo.busy || !photo.words.some((w) => w.trim())} onClick={doImport}>
                            {photo.busy ? <BtnSpinner /> : <Icon n="check" sm />}{" "}
                            {photo.busy ? ll.generating : ll.imgAdd.replace("{n}", String(photo.words.filter((w) => w.trim()).length))}
                        </button>
                    </>
                ))}
            </Modal>
        </>
    );
}
