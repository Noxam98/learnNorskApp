import { useState } from "react";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Modal } from "../ui/Modal.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { ttsLang } from "../ui/tts.js";
import { posMeta, posLabel, chipPrefix } from "../ui/pos.js";

export const Card = ({ wordItem, languageTranslate, onInfo }) => {
    const choseWord = useWordsStore((state) => state.choseWord);
    const editWord = useWordsStore((state) => state.editWord);
    const reportWord = useWordsStore((state) => state.reportWord);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const showArticles = useSystemStore((state) => state.showArticles);
    const showVerbAa = useSystemStore((state) => state.showVerbAa);
    const t = interfaceTranslate[currentLanguage];

    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState("");

    const no = wordItem.translate?.no?.[0] || "";
    const translation = wordItem.translate?.[languageTranslate]?.join(", ") || "";
    const { cls, key } = posMeta(wordItem.part_of_speech);
    const label = posLabel(wordItem.part_of_speech, t);
    const prefix = chipPrefix(key, wordItem.forms, { articles: showArticles, verbAa: showVerbAa });
    const isSelected = !!wordItem?.techData?.isSelected;

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
        onInfo?.(no, wordItem.id);
    };

    return (
        <>
            <div className={`wcard${isSelected ? " is-selected" : ""}`} onClick={() => choseWord(wordItem.id)}>
                <div className="wcard__body">
                    <span className="wcard__word">
                        {prefix && <span className="muted" style={{ fontWeight: 400 }}>{prefix} </span>}
                        {no.toLowerCase()}
                    </span>
                    <span className="wcard__meta">
                        <span className={`chip pos ${cls}`}>{label}</span>
                    </span>
                    <span className="wcard__tr">{translation}</span>
                </div>
                <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="iconbtn"
                        aria-label={t.description}
                        title={t.description}
                        onClick={openDescription}
                    >
                        <Icon n="info" />
                    </button>
                    <button className="iconbtn" aria-label="Редактировать" onClick={openEdit}><Icon n="edit" /></button>
                    <SpeakButton
                        segments={[
                            { text: no, hasTts: wordItem.hasTts },
                            { text: translation, lang: ttsLang(languageTranslate) },
                        ]}
                        ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                </div>
            </div>

            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title={`${t.translate}: ${no}`}
                footer={<>
                    <button className="btn btn--danger-ghost" style={{ marginRight: "auto", whiteSpace: "normal", textAlign: "left" }}
                        onClick={() => { setEditOpen(false); reportWord(wordItem.id).catch(() => {}); }}>
                        {t.reportWrong}
                    </button>
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
