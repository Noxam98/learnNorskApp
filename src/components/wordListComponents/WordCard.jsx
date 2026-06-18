import { interfaceTranslate } from "../../interface/interfaceTranslation";
import { useWordsStore } from "../../store/wordStore";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "../ui/Icon.jsx";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { ttsLang } from "../ui/tts.js";
import { posMeta, posLabel, chipPrefix } from "../ui/pos.js";

export const Card = ({ wordItem, languageTranslate, onInfo }) => {
    const choseWord = useWordsStore((state) => state.choseWord);
    const currentLanguage = useSystemStore((state) => state.currentLanguage);
    const showArticles = useSystemStore((state) => state.showArticles);
    const showVerbAa = useSystemStore((state) => state.showVerbAa);
    const t = interfaceTranslate[currentLanguage];

    const no = wordItem.translate?.no?.[0] || "";
    const translation = wordItem.translate?.[languageTranslate]?.join(", ") || "";
    const { cls, key } = posMeta(wordItem.part_of_speech);
    const label = posLabel(wordItem.part_of_speech, t);
    const prefix = chipPrefix(key, wordItem.forms, { articles: showArticles, verbAa: showVerbAa });
    const isSelected = !!wordItem?.techData?.isSelected;

    const openDescription = (e) => {
        e.stopPropagation();
        onInfo?.(no, wordItem.id);
    };

    return (
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
                <button className="iconbtn" aria-label={t.description} title={t.description} onClick={openDescription}>
                    <Icon n="info" />
                </button>
                <SpeakButton
                    segments={[
                        { text: no, hasTts: wordItem.hasTts },
                        { text: translation, lang: ttsLang(languageTranslate) },
                    ]}
                    ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
            </div>
        </div>
    );
};

export default Card;
