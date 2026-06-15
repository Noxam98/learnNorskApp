import { useState } from "react";
import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Modal } from "../ui/Modal.jsx";
import { WordInfoModal } from "../ui/WordInfoModal.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { ttsLang } from "../ui/tts.js";
import { posMeta, posLabel } from "../ui/pos.js";

export const Card = ({ wordItem, languageTranslate }) => {
    const choseWord = useWordsStore((state) => state.choseWord);
    const editWord = useWordsStore((state) => state.editWord);
    const reportWord = useWordsStore((state) => state.reportWord);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const t = interfaceTranslate[currentLanguage];

    const [descOpen, setDescOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState("");

    const no = wordItem.translate?.no?.[0] || "";
    const translation = wordItem.translate?.[languageTranslate]?.join(", ") || "";
    const { cls } = posMeta(wordItem.part_of_speech);
    const label = posLabel(wordItem.part_of_speech, t);
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
                    {translation && (
                        <SpeakButton text={translation} lang={ttsLang(languageTranslate)}
                            className="iconbtn wcard__trspeak" ariaLabel={t.tts} title={t.tts} />
                    )}
                </div>
                <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                    <SpeakButton text={no} hasTts={wordItem.hasTts} ariaLabel={t.tts}
                        title={t.tts} titlePreparing={t.ttsPreparing} />
                    <button
                        className="iconbtn"
                        aria-label={t.description}
                        title={t.description}
                        onClick={openDescription}
                    >
                        <Icon n="info" />
                    </button>
                    <button className="iconbtn" aria-label="Редактировать" onClick={openEdit}><Icon n="edit" /></button>
                </div>
            </div>

            <WordInfoModal open={descOpen} word={no} wordId={wordItem.id}
                lang={currentLanguage} t={t} onClose={() => setDescOpen(false)} />

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
