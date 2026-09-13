// Добор слов в набор ИЗ БАЗЫ — тот же экран Базы (PoolBrowser + usePoolSearch), у которого
// переопределены только действия и добавлен свой срез:
//   • тап по карточке — добавить/убрать слово в ТЕКУЩЕМ наборе (в Учёбу оно попадает через набор);
//   • удержание — карточка слова (короткий тап уже занят);
//   • чип «Набор» — показать только те, которых в наборе нет (или наоборот, только его слова).
// Остальные фильтры Базы (категории, часть речи, уровень, сортировка, страницы, AI-добор
// «нет в базе») работают как на самой Базе — это буквально тот же компонент.
import { useRef, useState } from "react";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { useHistoryClose } from "../../hooks/useHistoryClose.js";
import { FilterChipsPopup } from "../ui/FilterChipsPopup.jsx";
import { WordInfoModal } from "../ui/WordInfoModal.jsx";
import { Icon } from "../ui/Icon.jsx";
import { PoolBrowser } from "../pool/PoolBrowser.jsx";
import { usePoolSearch } from "../../pages/usePoolSearch.js";
import { P } from "./SetPoolPicker.i18n.js";

const STAGE = { position: "fixed", inset: 0, zIndex: 96, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", overflow: "auto" };

export default function SetPoolPicker({ setId, setName = "", count = 0, lang = "ru", onClose }) {
    const t = interfaceTranslate[lang] || interfaceTranslate.ru;
    const ll = P[lang] || P.ru;
    const isAdmin = useAuthStore((s) => s.user?.isAdmin);
    const [descWord, setDescWord] = useState(null);   // карточка слова (открыта удержанием)
    const [delta, setDelta] = useState(0);            // +добавили / −убрали за сеанс: живой счётчик набора
    const changed = useRef(false);

    const pool = usePoolSearch(lang, t, {
        setId,
        onSetChanged: (d) => { changed.current = true; setDelta((n) => n + (d || 0)); },
    });

    // Закрытие: наверх уходит признак «набор менялся» — вкладка перечитает слова и счётчики.
    const close = () => onClose?.(changed.current);
    useHistoryClose(true, close);   // системная «Назад»/свайп закрывает экран, а не уводит из приложения

    const inSetChip = (
        <FilterChipsPopup icon="check-square" label={ll.inSetChip} count={pool.inSetFilter ? 1 : 0}
            sections={[{
                key: "inset", multi: false, selected: pool.inSetFilter, onPick: pool.pickInSet,
                options: [{ value: "out", label: ll.onlyNew }, { value: "in", label: ll.onlyIn }],
            }]} />
    );

    return (
        <div style={STAGE}>
            {/* ширина как у Базы (.words-main.shell = 1280) — сетка карточек рассчитана на неё */}
            <div className="shell" style={{ maxWidth: 1280, paddingTop: "var(--sp-4)", paddingBottom: "var(--sp-8)" }}>
                <div className="page-head" style={{ marginBottom: "var(--sp-3)", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                        <span className="eyebrow"><Icon n="library" sm /> {ll.title}</span>
                        <h1 className="h1" style={{ margin: "var(--sp-1) 0 0", overflowWrap: "anywhere" }}>
                            {setName} <span className="muted" style={{ fontWeight: 600, fontSize: "var(--fs-15)" }}>
                                · {Math.max(0, count + delta)} {ll.inSet}
                            </span>
                        </h1>
                        <p className="muted" style={{ margin: "var(--sp-1) 0 0", fontSize: "var(--fs-13)" }}>{ll.hint}</p>
                    </div>
                    <button className="btn btn--accent" onClick={close} style={{ flex: "none" }}>
                        <Icon n="check" sm /> {ll.done}
                    </button>
                </div>

                <PoolBrowser pool={pool} lang={lang} t={t} isAdmin={isAdmin}
                    extraFilters={inSetChip}
                    onCardClick={(w) => (pool.added[w.pool_id] ? pool.onRemove(w) : pool.onAdd(w))}
                    onCardHold={(w) => setDescWord(w)} />
            </div>

            <WordInfoModal open={!!descWord} word={descWord?.word} poolId={descWord?.pool_id}
                lang={lang} t={t} onClose={() => setDescWord(null)} />
        </div>
    );
}
