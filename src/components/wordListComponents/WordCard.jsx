import { useState } from "react";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Modal } from "../ui/Modal.jsx";
import { posMeta, posLabel } from "../ui/pos.js";
import api from "../tools/api.js";

const speak = (text) => {
    try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "nb-NO";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    } catch { /* TTS недоступен */ }
};

export const Card = ({ wordItem, languageTranslate }) => {
    const choseWord = useWordsStore((state) => state.choseWord);
    const editWord = useWordsStore((state) => state.editWord);
    const loadDescription = useWordsStore((state) => state.loadDescription);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];

    const [descOpen, setDescOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [synonyms, setSynonyms] = useState(null);

    const no = wordItem.translate?.no?.[0] || "";
    const translation = wordItem.translate?.[languageTranslate]?.join(", ") || "";
    const { cls } = posMeta(wordItem.part_of_speech);
    const label = posLabel(wordItem.part_of_speech, t);
    const isSelected = !!wordItem?.techData?.isSelected;
    const isLoadingDesc = wordItem.descriptionState === "loading";
    const descriptionText = wordItem.description?.description?.[currentLanguage] || "";
    const hasDescription = descriptionText.trim() !== "";

    const openEdit = (e) => {
        e.stopPropagation();
        setDraft(wordItem.translate?.[languageTranslate]?.join(", ") || "");
        setEditOpen(true);
    };

    const saveEdit = () => {
        const list = draft.split(",").map((s) => s.trim()).filter(Boolean);
        editWord(wordItem.id, { translate: { [languageTranslate]: list } });
        setEditOpen(false);
    };

    const openDescription = (e) => {
        e.stopPropagation();
        if (!hasDescription && !isLoadingDesc) loadDescription(wordItem.id);
        setSynonyms(null);
        api.getSynonyms(wordItem.id, { lang: currentLanguage })
            .then((r) => setSynonyms(r.synonyms || []))
            .catch(() => setSynonyms([]));
        setDescOpen(true);
    };

    return (
        <>
            <div className={`wcard${isSelected ? " is-selected" : ""}`} onClick={() => choseWord(wordItem.id)}>
                <span className={`check wcard__check${isSelected ? " is-on" : ""}`}>
                    {isSelected && <Icon n="check" />}
                </span>
                <div className="wcard__body">
                    <span className="wcard__word">{no.toLowerCase()}</span>
                    <span className={`chip pos ${cls}`}>{label}</span>
                    <span className="wcard__tr">{translation}</span>
                </div>
                <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                    <button className="iconbtn" aria-label="Озвучить" onClick={() => speak(no)}><Icon n="volume" /></button>
                    <button
                        className="iconbtn"
                        aria-label={t.description}
                        title={t.description}
                        onClick={openDescription}
                    >
                        {isLoadingDesc ? <Icon n="settings" className="spin" /> : <Icon n="book" />}
                    </button>
                    <button className="iconbtn" aria-label="Редактировать" onClick={openEdit}><Icon n="edit" /></button>
                </div>
            </div>

            <Modal open={descOpen} onClose={() => setDescOpen(false)} title={no}>
                <p className="muted" style={{ margin: 0, lineHeight: "var(--lh-normal)" }}>
                    {hasDescription ? descriptionText : (isLoadingDesc ? t.descLoading : t.descUnavailable)}
                </p>
                {synonyms?.length > 0 && (
                    <div style={{ marginTop: "var(--sp-5)" }}>
                        <div className="label" style={{ marginBottom: "var(--sp-2)" }}>{t.similar}</div>
                        <div className="row wrap" style={{ gap: "var(--sp-2)" }}>
                            {synonyms.map((s) => (
                                <span key={s.word} className="chip" style={{ background: "var(--surface-3)", color: "var(--ink)" }}>
                                    <b>{s.word}</b>{s.translate?.[0] ? ` — ${s.translate[0]}` : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title={`${t.translate}: ${no}`}
                footer={<>
                    <button className="btn btn--ghost" onClick={() => setEditOpen(false)}>{t.cancel}</button>
                    <button className="btn btn--primary" onClick={saveEdit}>{t.save}</button>
                </>}
            >
                <div className="field">
                    <label className="label">{t.translate} ({languageTranslate})</label>
                    <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.translate} />
                    <span className="input-hint">{t.multipleVariantsHint}</span>
                </div>
            </Modal>
        </>
    );
};

export default Card;
