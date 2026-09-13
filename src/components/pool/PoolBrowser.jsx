// Экран Базы как ПЕРЕИСПОЛЬЗУЕМЫЙ блок: поиск + фильтры + список + пагинация.
// Разметка вынесена из PoolPage без изменений, чтобы один и тот же экран работал в двух местах:
//   • «База слов» — клик по карточке открывает описание, «＋» кладёт слово в Учёбу;
//   • добор слов в набор (SetPoolPicker) — клик кладёт/убирает слово в набор, удержание открывает
//     карточку, плюс свой чип-фильтр «(не) в наборе» (приходит пропом extraFilters).
// Вся логика (запрос/фильтры/страницы/действия) — в usePoolSearch; сюда приходит его результат.
import { Icon } from "../ui/Icon.jsx";
import { Dropdown } from "../ui/Dropdown.jsx";
import { SortControl } from "../ui/SortControl.jsx";
import { sortOptions } from "../ui/sortOptions.js";
import { FilterChipsPopup } from "../ui/FilterChipsPopup.jsx";
import { BtnSpinner, SkeletonWordlist, BrandLoader } from "../ui/Spinner.jsx";
import { SearchBox } from "../ui/SearchBox.jsx";
import { posLabel, POS_ORDER, posApiKey } from "../ui/pos.js";
import { WordCard } from "../ui/WordCard.jsx";
import { SEARCH_DEBOUNCE_MS } from "../../pages/usePoolSearch.js";

const PAGE_SIZES = [30, 60, 120];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const topicLabel = (t, key) => t.topics?.[key] || key;

// Окно номеров страниц вокруг текущей.
const pageWindow = (page, totalPages) => {
    const span = 2, out = [];
    let lo = Math.max(1, page - span), hi = Math.min(totalPages, page + span);
    if (page <= span) hi = Math.min(totalPages, 1 + span * 2);
    if (page > totalPages - span) lo = Math.max(1, totalPages - span * 2);
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
};

/**
 * @param {{
 *   pool:ReturnType<typeof import('../../pages/usePoolSearch.js').usePoolSearch>,
 *   lang:string, t:object, isAdmin?:boolean,
 *   onCardClick?:(w:object)=>void, onCardHold?:(w:object)=>void,
 *   extraFilters?:any,
 * }} p
 */
export function PoolBrowser({ pool, lang, t, isAdmin = false, onCardClick, onCardHold, extraFilters = null }) {
    const {
        q, setQ, appliedQ, searchPhase, total,
        topics, level, sort, order, missing, pos, pageSize, hasFilters, facets, facetCounts,
        toggleTopic, pickLevel, pickMissing, pickPos, onPageSize, clearFilters, pickSort,
        display, page, setPage, totalPages, loading,
        smart, poolExact, smartBusy, showShow, showGen,
        added, addingId, highlightWord, highlightBox, listWrapRef,
        onAdd, onRemove, onGenerateAdd, onAdminDelete, onShow,
    } = pool;

    return (
        <>
            {/* поиск + выезжающее дополнение: «Показать» (слово есть в базе) или «Создать» (нет) */}
            <div className={"poolsearch" + ((showGen || showShow) ? " has-gen" : "")}>
                <SearchBox value={q} onChange={setQ} placeholder={t.poolSearchPlaceholder || t.inputPlaceholder}
                    phase={searchPhase} debounceMs={SEARCH_DEBOUNCE_MS} count={total}
                    style={{ margin: 0, flex: 1, minWidth: 0 }} />
                <button className={"poolsearch__gen" + ((showGen || showShow) ? " is-shown" : "") + (showShow ? " poolsearch__gen--show" : "")}
                    disabled={(!showGen && !showShow) || !!smartBusy} aria-hidden={!showGen && !showShow}
                    tabIndex={(showGen || showShow) ? 0 : -1}
                    onClick={() => (showShow ? onShow(poolExact.word) : onGenerateAdd(appliedQ.trim()))}>
                    {showShow ? <Icon n="arrow-down" sm /> : (smartBusy && smartBusy === appliedQ.trim() ? <BtnSpinner /> : <Icon n="sparkles" sm />)}
                    <span>{showShow ? t.showLbl : t.createLbl}</span>
                </button>
            </div>

            {/* Фильтр-бар: темы (сворачиваемые), уровень, сортировка, размер страницы */}
            <div className="poolbar">
                {/* Фильтры — отдельные чипы-поповеры: Категории и Часть речи (FilterChipsPopup) */}
                <div className="poolbar__row" style={{ flexWrap: "wrap", gap: "var(--sp-2)" }}>
                    {extraFilters}
                    <FilterChipsPopup icon="grid" label={t.categoriesLbl}
                        count={topics.length}
                        sections={[{
                            key: "cat", multi: true, selected: topics, onPick: toggleTopic,
                            options: facets.topics.map(({ topic, count }) => {
                                const c = facetCounts ? (facetCounts.topics[topic] || 0) : count;
                                return { value: topic, label: topicLabel(t, topic), count: c, disabled: !topics.includes(topic) && c === 0 };
                            }),
                        }]} />
                    <FilterChipsPopup icon="type" label={t.posToggle}
                        count={pos ? 1 : 0}
                        sections={[{
                            key: "pos", multi: false, selected: pos, onPick: pickPos,
                            options: POS_ORDER.map((key) => ({ value: key, label: posLabel(posApiKey(key), t) })),
                        }]} />
                    {isAdmin && (
                        <FilterChipsPopup icon="database" label={t.dataLbl} count={missing ? 1 : 0}
                            sections={[{
                                key: "missing", title: "Без чего", multi: false, selected: missing, onPick: pickMissing,
                                options: [["embedding", "эмбеддинга"], ["description", "описания"], ["tts", "озвучки"], ["meta", "уровня/тем"], ["forms", "форм"]].map(([value, label]) => ({ value, label })),
                            }]} />
                    )}
                    <div className="seg">
                        {LEVELS.map((lv) => (
                            <button key={lv} className={`seg__btn${level === lv ? " is-on" : ""}`} onClick={() => pickLevel(lv)}>{lv}</button>
                        ))}
                    </div>
                    {hasFilters && (
                        <button className="fchip fchip--clear" onClick={clearFilters}>
                            <Icon n="x" sm /> {t.clearFilters || "Сброс"}
                        </button>
                    )}
                </div>

                <div className="poolbar__row">
                    {/* сортировка прижата влево */}
                    <SortControl value={sort} order={order}
                        options={sortOptions(t, [...(appliedQ.trim() ? ["relevance"] : []), "alpha", "level", "freq", "added"])}
                        onChange={pickSort} />

                    <div className="poolbar__sel">
                        <Dropdown value={pageSize} onChange={(v) => onPageSize(Number(v))}
                            options={PAGE_SIZES.map((n) => ({ value: n, label: `${n} / ${t.pageSize || "стр."}` }))} />
                    </div>
                </div>
            </div>

            {/* «Нет в базе» — добавить новое слово через ИИ. Показываем при активном поиске. */}
            {appliedQ.trim() && smart.length > 0 && (
                <div className="spanel" style={{ margin: "0 0 var(--sp-3)", padding: "var(--sp-3) var(--sp-4)" }}>
                    <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)", marginBottom: 8 }}>
                        {t.poolGenHint || "Нет нужного слова? Добавить через ИИ:"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {smart.map((w) => (
                            <button key={w.word} type="button" disabled={!!smartBusy} onClick={() => onGenerateAdd(w.word)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink-2)", fontWeight: 600, fontSize: "var(--fs-13)" }}>
                                <Icon n="sparkles" sm /> {w.word}{w.viaForm ? <span className="muted" style={{ fontWeight: 400 }}> ← {w.viaForm}</span> : null}
                                {smartBusy === w.word && <BtnSpinner />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ position: "relative" }} ref={listWrapRef}>
                {highlightBox && (
                    <div className="wcard-hibox" style={{ top: highlightBox.top, left: highlightBox.left, width: highlightBox.w, height: highlightBox.h }} />
                )}
                {/* при перезагрузке списка (смена сортировки/фильтра/страницы) — затемняем старый
                    список и показываем лоадер поверх, чтобы было видно, что идёт загрузка */}
                {loading && display.length > 0 && (
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 2, pointerEvents: "none" }}>
                        <BrandLoader dark />
                    </div>
                )}
                {display.length ? (
                    <div className="wordlist" style={loading ? { opacity: 0.4, pointerEvents: "none", transition: "opacity .15s ease" } : { transition: "opacity .15s ease" }}>
                        {display.map((w) => (
                            <WordCard key={w.pool_id} word={w} lang={lang} t={t}
                                added={!!added[w.pool_id]} busy={addingId === w.pool_id} highlight={highlightWord === w.word}
                                isAdmin={isAdmin}
                                onToggle={() => (added[w.pool_id] ? onRemove(w) : onAdd(w))}
                                onCardClick={onCardClick ? () => onCardClick(w) : undefined}
                                onHold={onCardHold ? () => onCardHold(w) : undefined}
                                onAdminDelete={() => onAdminDelete(w.word)} />
                        ))}
                    </div>
                ) : (
                    (loading || searchPhase !== "idle")
                        ? <SkeletonWordlist count={12} />
                        : <p className="muted" style={{ textAlign: "center", padding: "var(--sp-12) 0" }}>{t.poolEmpty}</p>
                )}
            </div>

            {/* Постраничная навигация */}
            {totalPages > 1 && (
                <div className="pager">
                    <button className="pager__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <Icon n="chevron-left" sm />
                    </button>
                    {pageWindow(page, totalPages)[0] > 1 && (
                        <>
                            <button className="pager__btn" onClick={() => setPage(1)}>1</button>
                            <span className="pager__gap">…</span>
                        </>
                    )}
                    {pageWindow(page, totalPages).map((p) => (
                        <button key={p} className={`pager__btn${p === page ? " is-on" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    {pageWindow(page, totalPages).slice(-1)[0] < totalPages && (
                        <>
                            <span className="pager__gap">…</span>
                            <button className="pager__btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                        </>
                    )}
                    <button className="pager__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <Icon n="chevron-right" sm />
                    </button>
                </div>
            )}
        </>
    );
}

export default PoolBrowser;
