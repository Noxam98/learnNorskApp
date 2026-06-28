// Единая карточка слова — ровно как в «Базе слов» (PoolPage). Вынесена сюда, чтобы один и
// тот же вид использовался и в Базе, и в «Наборах» (поиск слева + слова набора справа).
// Логика (что делает «добавить»/«инфо»/«удалить») остаётся у вызывающего — карточка
// презентационная: пробрасываем колбэки и флаги.
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { SpeakButton } from "./SpeakButton.jsx";
import { posMeta, posLabel, chipPrefix } from "./pos.js";
import { ttsLang } from "./tts.js";
import { RampBar } from "../learning/StatusBits.jsx";

/**
 * @param {{
 *   word:object, lang:string, t:object,
 *   added?:boolean, busy?:boolean, highlight?:boolean, flat?:boolean, isAdmin?:boolean,
 *   onToggle?:Function, onCardClick?:Function, removeBtn?:boolean, removeLabel?:string,
 *   onInfo?:Function, onAdminDelete?:Function, onHover?:(word:object|null)=>void,
 * }} p  word: {word|norwegian, part_of_speech, level, translate, forms?, hasTts?, hasDescription?, hasEmbedding?, pool_id}
 *   flat — НЕ заливать карточку зелёным при added (состояние видно по кнопке-галочке). Нужно
 *   в «Наборах», где обе колонки должны выглядеть одинаково (иначе правая вся зелёная).
 *   onCardClick — что делает клик по ТЕЛУ карточки; по умолчанию = onToggle (как в Базе/поиске:
 *     добавить/убрать). В «коллекции набора» сюда передают «открыть инфо», чтобы клик не удалял слово.
 *   removeBtn — действие-кнопка рисуется явным «удалить» (корзина) вместо тоггла ＋/✓ (для коллекции).
 *   onHover — наведение/уход (для подсветки того же слова в другой колонке).
 */
export function WordCard({ word, lang, t, added = false, busy = false, highlight = false, flat = false, isAdmin = false, status = null, ramp = null, onToggle, onCardClick, removeBtn = false, removeLabel, onInfo, onAdminDelete, onHover }) {
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const no = word.word ?? word.norwegian;
    const tr = word.translate?.[lang]?.join(", ");
    const { cls, key } = posMeta(word.part_of_speech);
    const prefix = chipPrefix(key, word.forms, { articles: showArticles, verbAa: showVerbAa });
    return (
        <div className={`wcard${added && !flat ? " is-added" : ""}${highlight ? " is-highlight" : ""}`}
            data-word={no} onClick={onCardClick || onToggle}
            onMouseEnter={onHover ? () => onHover(word) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}>
            <div className="wcard__body">
                <span className="wcard__word">
                    {prefix && <span className="muted" style={{ fontWeight: 400 }}>{prefix} </span>}
                    {no}
                </span>
                <span className="wcard__meta">
                    {ramp ? <RampBar done={ramp.done} total={ramp.total} sm />
                        : status ? <span className={"wstatus wstatus--" + status} title={status} /> : null}
                    {word.level && <span className="chip lvl">{word.level}</span>}
                    <span className={`chip pos ${cls}`}>{posLabel(word.part_of_speech, t)}</span>
                    {isAdmin && !word.hasEmbedding && <span className="chip" style={{ background: "#fee2e2", color: "#b91c1c" }} title="нет эмбеддинга">emb</span>}
                    {isAdmin && !word.hasDescription && <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }} title="нет описания">desc</span>}
                    {isAdmin && !word.hasTts && <span className="chip" style={{ background: "#e0e7ff", color: "#3730a3" }} title="нет озвучки">tts</span>}
                </span>
                <span className="wcard__tr">{tr}</span>
            </div>
            <div className="wcard__actions" onClick={(e) => e.stopPropagation()}>
                {onInfo && (
                    <button className="iconbtn" aria-label={t.description} title={t.description} onClick={() => onInfo(word)}>
                        <Icon n="info" />
                    </button>
                )}
                {onToggle && (removeBtn ? (
                    /* коллекция набора: явная кнопка удаления (корзина), клик по телу — инфо */
                    <button className="iconbtn is-danger"
                        aria-label={removeLabel || t.removeFromDict} title={removeLabel || t.removeFromDict}
                        disabled={busy} onClick={onToggle}>
                        {busy ? <BtnSpinner /> : <Icon n="trash" />}
                    </button>
                ) : (
                    <button className={`iconbtn${added ? " is-added" : ""}`}
                        aria-label={added ? t.removeFromDict : t.addToDict}
                        title={added ? t.removeFromDict : t.addToDict}
                        disabled={busy} onClick={onToggle}>
                        {busy ? <BtnSpinner /> : <Icon n={added ? "check" : "plus"} />}
                    </button>
                ))}
                <SpeakButton
                    segments={[
                        { text: no, hasTts: word.hasTts !== false },
                        { text: tr, lang: ttsLang(lang) },
                    ]}
                    ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                {isAdmin && onAdminDelete && (
                    <button className="iconbtn is-danger" aria-label="delete" title="Удалить из базы (админ)" onClick={() => onAdminDelete(word)}>
                        <Icon n="trash" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default WordCard;
