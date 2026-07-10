// @ts-check
// Рекурсивное дерево разбора составного слова (в попапе части карточки).
// Узел = { word, tr, fuge, children }; children непусты, только если подслово САМО составное,
// поэтому 3-4 уровня (barnehagelærer → barnehage → barn + hage) рисуются одним компонентом.
// fuge узла — соединительная морфема между ЕГО детьми (barn-e-hage), показываем приглушённо.
// Направляющие линии (├─ / └─) рисует CSS: .cwt в components.css.

/**
 * @param {{ nodes?: Array<any>, onOpen?: (w: string) => void, openTitle?: string, depth?: number }} props
 */
export const CompoundTree = ({ nodes, onOpen, openTitle, depth = 0 }) => {
    if (!nodes?.length) return null;
    return (
        <ul className={`cwt${depth === 0 ? " cwt--root" : ""}`}>
            {nodes.map((n) => (
                <li key={`${n.word}-${depth}`} className="cwt__li">
                    <div className="cwt__row">
                        {/* n.lemma=false — это аффикс (u-, -het, -messig), а не слово: банк режет
                            деривацию наравне с композицией. Такой узел не кликаем и карточку по нему
                            не генерим (иначе каждый дериват жёг бы LLM-квоту и плодил мусор). */}
                        {n.lemma === false
                            ? <span className="cwt__word cwt__word--affix" lang="no">{n.word}</span>
                            : <button type="button" className="cwt__word" lang="no" title={openTitle}
                                onClick={() => onOpen?.(n.word)}>{n.word}</button>}
                        {n.fuge ? <span className="cwt__fuge">-{n.fuge}-</span> : null}
                        {n.tr?.length > 0 && <span className="cwt__tr">{n.tr.join(", ")}</span>}
                    </div>
                    <CompoundTree nodes={n.children} onOpen={onOpen} openTitle={openTitle} depth={depth + 1} />
                </li>
            ))}
        </ul>
    );
};

export default CompoundTree;
