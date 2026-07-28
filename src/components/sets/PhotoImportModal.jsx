// Импорт с фото: до пяти страниц → поворот → OCR с прогрессом → проверка → пакетный импорт.
import { useRef, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BtnSpinner } from "../ui/Spinner.jsx";
import api from "../tools/api.js";
import { cropImage, downscaleImage, rotateImage } from "../tools/imageScale.js";
import ImportReview from "./ImportReview.jsx";
import ImportResult from "./ImportResult.jsx";
import PhotoCropper from "./PhotoCropper.jsx";
import { IMPORT_I18N } from "./Import.i18n.js";
import { importErrorText } from "./importErrors.js";
import { importWordsInBatches } from "./importBatches.js";

const MAX = 50, MAX_PAGES = 5, MAX_HINT = 500;

export default function PhotoImportModal({ open, setId, lang, ll, onClose, onImported }) {
    const ui = { ...ll, ...(IMPORT_I18N[lang] || IMPORT_I18N.en) };
    // null | {pages,page,hint,items,result,busy,preparing,ocrProgress,importProgress,error}
    const [photo, setPhoto] = useState(null);
    const [cropEditor, setCropEditor] = useState(null);
    const camRef = useRef(null);
    const galRef = useRef(null);

    const closeAll = () => {
        if (photo?.busy || photo?.preparing || cropEditor?.busy) return;
        setPhoto(null); onClose?.();
    };
    const pickFrom = (ref) => {
        const el = ref.current;
        if (el) { el.value = ""; el.click(); }
    };
    const onPickFiles = async (e) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;
        const files = selected.slice(0, MAX_PAGES);
        setPhoto({
            pages: [], page: 0, hint: "", items: null, result: null, busy: false,
            preparing: { done: 0, total: files.length }, ocrProgress: null, importProgress: null,
            error: selected.length > MAX_PAGES ? ui.imgMaxPages.replace("{n}", String(MAX_PAGES)) : "",
        });
        const pages = [];
        let failed = 0;
        for (let i = 0; i < files.length; i++) {
            try {
                pages.push({ dataUrl: await downscaleImage(files[i]), rotation: 0, name: files[i].name });
            } catch {
                failed += 1;
            }
            setPhoto((p) => ({
                ...p, pages: [...pages],
                preparing: { done: i + 1, total: files.length },
            }));
        }
        setPhoto((p) => ({
            ...p,
            pages: [...pages],
            preparing: null,
            error: pages.length
                ? (failed ? ui.imgSomeFilesFailed.replace("{n}", String(failed)) : p.error)
                : ui.imgFail,
        }));
    };
    const changePage = (delta) => setPhoto((p) => ({
        ...p,
        page: (p.page + delta + p.pages.length) % p.pages.length,
    }));
    const rotatePage = () => setPhoto((p) => ({
        ...p,
        pages: p.pages.map((page, i) => i === p.page
            ? { ...page, rotation: (page.rotation + 1) % 4 }
            : page),
    }));
    const removePage = () => setPhoto((p) => {
        const pages = p.pages.filter((_, i) => i !== p.page);
        return pages.length ? { ...p, pages, page: Math.min(p.page, pages.length - 1) } : null;
    });
    const openCrop = async () => {
        const page = photo?.pages?.[photo.page];
        if (!page || photo.busy) return;
        setPhoto((p) => ({ ...p, busy: true, error: "" }));
        try {
            const src = await rotateImage(page.dataUrl, page.rotation);
            setCropEditor({ src, page: photo.page, busy: false });
        } catch (e) {
            setPhoto((p) => ({ ...p, error: importErrorText(e, ui, ui.imgFail) }));
        } finally {
            setPhoto((p) => ({ ...p, busy: false }));
        }
    };
    const applyCrop = async (crop) => {
        if (!cropEditor || cropEditor.busy) return;
        setCropEditor((p) => ({ ...p, busy: true }));
        try {
            const dataUrl = await cropImage(cropEditor.src, crop);
            setPhoto((p) => ({
                ...p,
                pages: p.pages.map((page, i) => i === cropEditor.page
                    ? { ...page, dataUrl, rotation: 0 }
                    : page),
            }));
            setCropEditor(null);
        } catch (e) {
            setCropEditor((p) => ({ ...p, busy: false }));
            setPhoto((p) => ({ ...p, error: importErrorText(e, ui, ui.imgFail) }));
        }
    };
    const runOcr = async () => {
        if (!photo?.pages.length || photo.busy || !setId) return;
        const pages = photo.pages;
        setPhoto((p) => ({ ...p, busy: true, ocrProgress: { done: 0, total: pages.length }, error: "" }));
        const words = [], seen = new Set();
        let failed = 0, processed = 0;
        for (const page of pages) {
            try {
                const image = await rotateImage(page.dataUrl, page.rotation);
                const r = await api.setOcr(setId, { image, hint: photo.hint });
                for (const value of r?.words || []) {
                    const word = String(value || "").trim();
                    const key = word.toLowerCase();
                    if (word && !seen.has(key) && words.length < MAX) {
                        seen.add(key); words.push(word);
                    }
                }
            } catch {
                failed += 1;
            }
            processed += 1;
            setPhoto((p) => ({ ...p, ocrProgress: { done: processed, total: pages.length } }));
            if (words.length >= MAX) break;
        }
        const items = words.map((word) => ({ word, translation: "", enabled: true }));
        setPhoto((p) => ({
            ...p,
            busy: false,
            ocrProgress: null,
            items,
            error: items.length
                ? (failed ? ui.imgSomePagesFailed.replace("{n}", String(failed)) : "")
                : (failed === pages.length ? ui.imgFail : ui.imgEmpty),
        }));
    };
    const doImport = async (selected) => {
        if (!photo || photo.busy || !setId || !selected.length) return;
        setPhoto((p) => ({ ...p, busy: true, importProgress: { done: 0, total: selected.length }, error: "" }));
        try {
            const result = await importWordsInBatches({
                setId,
                items: selected.map(({ word, translation }) => ({
                    word: word.trim(), translation: (translation || "").trim(),
                })),
                lang,
                onProgress: (progress) => setPhoto((p) => ({ ...p, importProgress: progress })),
            });
            setPhoto((p) => ({ ...p, busy: false, importProgress: null, result }));
            onImported?.(result);
        } catch (e) {
            setPhoto((p) => ({
                ...p, busy: false, importProgress: null,
                error: importErrorText(e, ui, ui.importFailed),
            }));
        }
    };
    const retry = () => setPhoto((p) => ({
        ...p,
        result: null,
        items: (p.result?.failed || []).map((item) => ({
            word: item.word || "", translation: item.translation || "", enabled: true,
        })),
        error: "",
    }));
    const current = photo?.pages?.[photo.page];

    return (
        <>
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onPickFiles} style={{ display: "none" }} />
            <input ref={galRef} type="file" accept="image/*" multiple onChange={onPickFiles} style={{ display: "none" }} />
            <Modal open={open && !photo} onClose={closeAll} title={ui.imgSource} maxWidth={340}>
                <div className="row" style={{ gap: "var(--sp-3)" }}>
                    <button className="btn btn--accent btn--block" onClick={() => pickFrom(camRef)}>
                        <Icon n="camera" sm /> {ui.imgCamera}
                    </button>
                    <button className="btn btn--ghost btn--block" onClick={() => pickFrom(galRef)}>
                        <Icon n="image" sm /> {ui.imgGallery}
                    </button>
                </div>
                <div className="muted" style={{ marginTop: "var(--sp-2)", fontSize: "var(--fs-12)", textAlign: "center" }}>
                    {ui.imgMultiHint.replace("{n}", String(MAX_PAGES))}
                </div>
            </Modal>
            <Modal open={!!photo} onClose={cropEditor ? (() => { if (!cropEditor.busy) setCropEditor(null); }) : closeAll}
                title={cropEditor ? ui.cropTitle
                    : (photo?.result ? ui.importResultTitle : (photo?.items ? ui.importReviewTitle : ui.imgTitle))}
                maxWidth={560}>
                {cropEditor ? (
                    <PhotoCropper src={cropEditor.src} ll={ui} busy={cropEditor.busy}
                        onCancel={() => setCropEditor(null)} onApply={applyCrop} />
                ) : photo?.result ? (
                    <ImportResult result={photo.result} ll={ui} onRetry={retry}
                        onMore={() => setPhoto(null)} onDone={closeAll} />
                ) : photo?.preparing ? (
                    <div className="import-preparing">
                        <BtnSpinner />
                        <b>{ui.imgPreparingProgress
                            .replace("{done}", String(photo.preparing.done))
                            .replace("{total}", String(photo.preparing.total))}</b>
                    </div>
                ) : photo?.items ? (
                    <ImportReview items={photo.items}
                        setItems={(update) => setPhoto((p) => ({
                            ...p,
                            items: typeof update === "function" ? update(p.items) : update,
                        }))}
                        max={MAX} ll={ui} busy={photo.busy} error={photo.error}
                        busyText={photo.importProgress ? ui.importProgress
                            .replace("{done}", String(photo.importProgress.done))
                            .replace("{total}", String(photo.importProgress.total)) : ""}
                        onBack={() => setPhoto((p) => ({ ...p, items: null, error: "" }))}
                        onImport={doImport} />
                ) : photo ? (
                    <>
                        {current && (
                            <>
                                <div className="ocr-previewbox">
                                    <img src={current.dataUrl} alt="" className="ocr-preview"
                                        style={{ transform: `rotate(${current.rotation * 90}deg)` }} />
                                </div>
                                <div className="ocr-pagebar">
                                    {photo.pages.length > 1 && (
                                        <button className="iconbtn" onClick={() => changePage(-1)} aria-label={ui.imgPreviousPage}>
                                            <Icon n="chevron-left" sm />
                                        </button>
                                    )}
                                    <b>{ui.imgPage.replace("{n}", String(photo.page + 1))
                                        .replace("{total}", String(photo.pages.length))}</b>
                                    {photo.pages.length > 1 && (
                                        <button className="iconbtn" onClick={() => changePage(1)} aria-label={ui.imgNextPage}>
                                            <Icon n="chevron-right" sm />
                                        </button>
                                    )}
                                    <span className="ocr-pagebar__spacer" />
                                    <button className="iconbtn" onClick={openCrop} aria-label={ui.cropTitle}>
                                        <Icon n="crop" sm />
                                    </button>
                                    <button className="iconbtn" onClick={rotatePage} aria-label={ui.imgRotate}>
                                        <Icon n="rotate" sm />
                                    </button>
                                    <button className="iconbtn" onClick={removePage} aria-label={ui.imgRemovePage}>
                                        <Icon n="trash" sm />
                                    </button>
                                </div>
                            </>
                        )}
                        <textarea className="input" rows={2} value={photo.hint} placeholder={ui.imgHintPh} maxLength={MAX_HINT}
                            onChange={(e) => setPhoto((p) => ({ ...p, hint: e.target.value }))}
                            style={{ width: "100%", marginTop: "var(--sp-3)", resize: "none" }} />
                        {photo.ocrProgress && (
                            <div className="import-stage">
                                <span>{ui.imgOcrProgress
                                    .replace("{done}", String(photo.ocrProgress.done))
                                    .replace("{total}", String(photo.ocrProgress.total))}</span>
                                <progress value={photo.ocrProgress.done} max={photo.ocrProgress.total} />
                            </div>
                        )}
                        {photo.error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{photo.error}</div>}
                        <div className="import-actions">
                            <button className="btn btn--ghost" disabled={photo.busy}
                                onClick={() => setPhoto(null)}>
                                <Icon n="chevron-left" sm /> {ui.importChangePhoto}
                            </button>
                            <button className="btn btn--accent" disabled={photo.busy || !photo.pages.length} onClick={runOcr}>
                                {photo.busy ? <BtnSpinner /> : <Icon n="camera" sm />} {photo.busy ? ui.imgBusy : ui.imgRun}
                            </button>
                        </div>
                    </>
                ) : null}
            </Modal>
        </>
    );
}
