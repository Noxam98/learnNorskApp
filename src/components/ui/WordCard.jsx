// Единая карточка слова — ровно как в «Базе слов» (PoolPage). Вынесена сюда, чтобы один и
// тот же вид использовался и в Базе, и в «Наборах» (поиск слева + слова набора справа).
// Логика (что делает «добавить»/«инфо»/«удалить») остаётся у вызывающего — карточка
// презентационная: пробрасываем колбэки и флаги.
import { useEffect, useRef } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";
import { SpeakButton } from "./SpeakButton.jsx";
import { posMeta, posLabel, chipPrefix } from "./pos.js";
import { ttsLang } from "./tts.js";
import { RampBar } from "../learning/StatusBits.jsx";

const HOLD_MS = 420;   // порог удержания (long-press) — короче системного контекст-меню браузера

/**
 * @param {{
 *   word:object, lang:string, t:object,
 *   added?:boolean, busy?:boolean, highlight?:boolean, flat?:boolean, isAdmin?:boolean,
 *   onToggle?:Function, onCardClick?:Function, removeBtn?:boolean, removeLabel?:string,
 *   onInfo?:Function, onAdminDelete?:Function, onHover?:(word:object|null)=>void,
 *   selectable?:boolean, selected?:boolean, onSelect?:Function,
 * }} p  word: {word|norwegian, part_of_speech, level, translate, forms?, hasTts?, hasDescription?, hasEmbedding?, pool_id}
 *   flat — НЕ заливать карточку зелёным при added (состояние видно по кнопке-галочке). Нужно
 *   в «Наборах», где обе колонки должны выглядеть одинаково (иначе правая вся зелёная).
 *   onCardClick — что делает клик по ТЕЛУ карточки; по умолчанию = onToggle (как в Базе/поиске:
 *     добавить/убрать). В «коллекции набора» сюда передают «открыть инфо», чтобы клик не удалял слово.
 *   removeBtn — действие-кнопка рисуется явным «удалить» (корзина) вместо тоггла ＋/✓ (для коллекции).
 *   onHover — наведение/уход (для подсветки того же слова в другой колонке).
 *   selectable — слева рисуется чекбокс выбора (выделение слов набора под «Заучить»); клик по нему
 *     не задевает тело карточки (открытие/удаление), клик по телу выделение не меняет.
 *   onHold — УДЕРЖАНИЕ карточки (long-press). Нужно там, где короткий тап уже занят действием
 *     (добор слов в набор: тап = добавить/убрать, удержание = открыть карточку слова). После
 *     срабатывания подавляем ближайший click, иначе палец сделал бы и то, и другое.
 */
export function WordCard({ word, lang, t, added = false, busy = false, highlight = false, flat = false, isAdmin = false, status = null, ramp = null, onToggle, onCardClick, removeBtn = false, removeLabel, onInfo, onAdminDelete, onHover, selectable = false, selected = false, onSelect, onHold }) {
    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const holdRef = useRef({ timer: null, fired: false });
    const holdStart = (e) => {
        if (!onHold || e.button > 0) return;
        holdRef.current.fired = false;
        clearTimeout(holdRef.current.timer);
        holdRef.current.timer = setTimeout(() => {
            holdRef.current.fired = true;
            try { navigator.vibrate?.(12); } catch { /* нет вибро — ок */ }
            onHold(word);
        }, HOLD_MS);
    };
    const holdStop = () => { if (holdRef.current.timer) { clearTimeout(holdRef.current.timer); holdRef.current.timer = null; } };
    useEffect(() => holdStop, []);
    const onClick = (e) => {
        if (holdRef.current.fired) { holdRef.current.fired = false; e.preventDefault(); return; }   // это было удержание
        (onCardClick || onToggle)?.(e);
    };
    const no = word.word ?? word.norwegian;
    const tr = word.translate?.[lang]?.join(", ");
    const { cls, key } = posMeta(word.part_of_speech);
    const prefix = chipPrefix(key, word.forms, { articles: showArticles, verbAa: showVerbAa });
    return (
        <div className={`wcard${selectable ? " wcard--sel" : ""}${selected ? " is-selected" : ""}${added && !flat ? " is-added" : ""}${highlight ? " is-highlight" : ""}`}
            data-word={no} onClick={onClick}
            onPointerDown={onHold ? holdStart : undefined}
            onPointerUp={onHold ? holdStop : undefined}
            onPointerCancel={onHold ? holdStop : undefined}
            onPointerLeave={onHold ? holdStop : undefined}
            onContextMenu={onHold ? (e) => e.preventDefault() : undefined}
            onMouseEnter={onHover ? () => onHover(word) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}>
            {selectable && (
                <span className={"check" + (selected ? " is-on" : "")} role="checkbox" aria-checked={selected}
                    aria-label={no} tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(word); }}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onSelect?.(word); } }}>
                    <Icon n="check" />
                </span>
            )}
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
