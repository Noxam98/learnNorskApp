// Вкладка «Наборы»: личные подборки слов. Слой курации над общим SRS (прогресс по слову
// общий). Можно создавать/переименовывать/удалять наборы, искать слова (попап с умным поиском
// Базы) и добавлять в набор, перемещать слова между наборами, включать набор в ежедневную учёбу
// (тоггл studying) и учить набор отдельным дриллом («Учить набор» → сессия с setId).
import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { ActionMenu } from "../../components/ui/Dropdown.jsx";
import { BtnSpinner } from "../../components/ui/Spinner.jsx";
import { SpeakButton } from "../../components/ui/SpeakButton.jsx";
import { posMeta, posLabel } from "../../components/ui/pos.js";
import { ttsLang } from "../../components/ui/tts.js";
import { pl } from "../../components/ui/plural.js";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { langGuard } from "../../interface/i18nGuard.js";
import PoolSearchModal from "../../components/learning/PoolSearchModal.jsx";

const L = langGuard({
    ru:  { title: "Наборы", desc: "Свои подборки слов — учи их отдельно или подключай к ежедневной сессии", newSet: "Создать набор", create: "Создать", rename: "Переименовать", del: "Удалить", delConfirm: "Удалить набор? Прогресс по словам сохранится.", studySet: "Учить набор", searchWords: "Поиск слов", studying: "В ежедневной учёбе", studyingHint: "Слова набора попадают в умную сессию «Сегодня»", move: "Переместить в…", moveTitle: "Переместить в набор", remove: "Убрать из набора", noSets: "Пока нет наборов", noSetsHint: "Создай подборку слов и учи её отдельно", noWords: "В наборе пока нет слов", noWordsHint: "Нажми «Поиск слов», чтобы добавить", namePh: "Название набора", save: "Сохранить", noOther: "Нет других наборов", words: "слов" },
    en:  { title: "Sets", desc: "Your own word collections — study them on their own or feed the daily session", newSet: "New set", create: "Create", rename: "Rename", del: "Delete", delConfirm: "Delete this set? Word progress is kept.", studySet: "Study set", searchWords: "Search words", studying: "In daily study", studyingHint: "Set words join the smart “Today” session", move: "Move to…", moveTitle: "Move to set", remove: "Remove from set", noSets: "No sets yet", noSetsHint: "Create a word collection and study it on its own", noWords: "No words in this set yet", noWordsHint: "Tap “Search words” to add some", namePh: "Set name", save: "Save", noOther: "No other sets", words: "words" },
    ukr: { title: "Набори", desc: "Власні добірки слів — вивчай їх окремо або підключай до щоденної сесії", newSet: "Створити набір", create: "Створити", rename: "Перейменувати", del: "Видалити", delConfirm: "Видалити набір? Прогрес за словами збережеться.", studySet: "Вчити набір", searchWords: "Пошук слів", studying: "У щоденному навчанні", studyingHint: "Слова набору потрапляють у розумну сесію «Сьогодні»", move: "Перемістити в…", moveTitle: "Перемістити в набір", remove: "Прибрати з набору", noSets: "Поки немає наборів", noSetsHint: "Створи добірку слів і вчи її окремо", noWords: "У наборі поки немає слів", noWordsHint: "Натисни «Пошук слів», щоб додати", namePh: "Назва набору", save: "Зберегти", noOther: "Немає інших наборів", words: "слів" },
    pl:  { title: "Zestawy", desc: "Własne zbiory słów — ucz się ich osobno lub dołącz je do codziennej sesji", newSet: "Nowy zestaw", create: "Utwórz", rename: "Zmień nazwę", del: "Usuń", delConfirm: "Usunąć zestaw? Postępy w słowach zostaną zachowane.", studySet: "Ucz się zestawu", searchWords: "Szukaj słów", studying: "W codziennej nauce", studyingHint: "Słowa z zestawu trafiają do inteligentnej sesji „Dziś”", move: "Przenieś do…", moveTitle: "Przenieś do zestawu", remove: "Usuń z zestawu", noSets: "Brak zestawów", noSetsHint: "Utwórz zbiór słów i ucz się go osobno", noWords: "Brak słów w tym zestawie", noWordsHint: "Naciśnij „Szukaj słów”, aby dodać", namePh: "Nazwa zestawu", save: "Zapisz", noOther: "Brak innych zestawów", words: "słów" },
    lt:  { title: "Rinkiniai", desc: "Savi žodžių rinkiniai — mokykis jų atskirai arba įtrauk į kasdienę sesiją", newSet: "Naujas rinkinys", create: "Sukurti", rename: "Pervadinti", del: "Ištrinti", delConfirm: "Ištrinti rinkinį? Žodžių pažanga išliks.", studySet: "Mokytis rinkinio", searchWords: "Ieškoti žodžių", studying: "Kasdienėje mokymosi sesijoje", studyingHint: "Rinkinio žodžiai patenka į išmaniąją „Šiandien“ sesiją", move: "Perkelti į…", moveTitle: "Perkelti į rinkinį", remove: "Pašalinti iš rinkinio", noSets: "Rinkinių dar nėra", noSetsHint: "Sukurk žodžių rinkinį ir mokykis jo atskirai", noWords: "Rinkinyje dar nėra žodžių", noWordsHint: "Paspausk „Ieškoti žodžių“, kad pridėtum", namePh: "Rinkinio pavadinimas", save: "Išsaugoti", noOther: "Kitų rinkinių nėra", words: "žodžių" },
    lv:  { title: "Kopas", desc: "Savas vārdu kopas — mācies tās atsevišķi vai pievieno ikdienas sesijai", newSet: "Jauna kopa", create: "Izveidot", rename: "Pārdēvēt", del: "Dzēst", delConfirm: "Dzēst kopu? Vārdu progress tiks saglabāts.", studySet: "Mācīties kopu", searchWords: "Meklēt vārdus", studying: "Ikdienas mācībās", studyingHint: "Kopas vārdi nonāk gudrajā sesijā «Šodien»", move: "Pārvietot uz…", moveTitle: "Pārvietot uz kopu", remove: "Noņemt no kopas", noSets: "Vēl nav nevienas kopas", noSetsHint: "Izveido vārdu kopu un mācies to atsevišķi", noWords: "Kopā vēl nav vārdu", noWordsHint: "Nospied «Meklēt vārdus», lai pievienotu", namePh: "Kopas nosaukums", save: "Saglabāt", noOther: "Citu kopu nav", words: "vārdi" },
    ar:  { title: "المجموعات", desc: "مجموعات كلماتك الخاصة — ادرسها وحدها أو أضِفها إلى جلسة اليوم", newSet: "مجموعة جديدة", create: "إنشاء", rename: "إعادة تسمية", del: "حذف", delConfirm: "حذف المجموعة؟ سيُحفَظ تقدّم الكلمات.", studySet: "ادرس المجموعة", searchWords: "البحث عن كلمات", studying: "في الدراسة اليومية", studyingHint: "تدخل كلمات المجموعة جلسة «اليوم» الذكية", move: "نقل إلى…", moveTitle: "نقل إلى مجموعة", remove: "إزالة من المجموعة", noSets: "لا توجد مجموعات بعد", noSetsHint: "أنشئ مجموعة كلمات وادرسها وحدها", noWords: "لا توجد كلمات في هذه المجموعة بعد", noWordsHint: "اضغط «البحث عن كلمات» للإضافة", namePh: "اسم المجموعة", save: "حفظ", noOther: "لا توجد مجموعات أخرى", words: "كلمات" },
}, "SetsTab.L");

export default function SetsTab({ lang, openSession, openWord }) {
    const ll = L[lang] || L.ru;
    const t = interfaceTranslate[lang] || interfaceTranslate.en;

    const [sets, setSets] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [words, setWords] = useState([]);
    const [wLoading, setWLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [prompt, setPrompt] = useState(null);   // { mode:'create'|'rename', value, id }
    const [moveFor, setMoveFor] = useState(null);  // pool_id перемещаемого слова
    const [busy, setBusy] = useState(false);

    const active = sets.find((s) => s.id === activeId) || null;
    const inSet = useMemo(() => new Set(words.map((w) => w.pool_id)), [words]);

    const loadSets = useCallback(async (selectId) => {
        const list = await api.setsList().catch(() => []);
        setSets(list || []);
        setActiveId((cur) => {
            const want = selectId != null ? selectId : cur;
            if (want != null && (list || []).some((s) => s.id === want)) return want;
            return (list || [])[0]?.id ?? null;
        });
    }, []);

    const loadWords = useCallback(async (id) => {
        if (id == null) { setWords([]); return; }
        setWLoading(true);
        try { const r = await api.setWords(id); setWords(r?.words || []); }
        catch { setWords([]); }
        finally { setWLoading(false); }
    }, []);

    useEffect(() => { loadSets(); }, [loadSets]);
    useEffect(() => { loadWords(activeId); }, [activeId, loadWords]);

    const submitPrompt = async () => {
        const name = (prompt?.value || "").trim();
        if (!name || busy) return;
        setBusy(true);
        try {
            if (prompt.mode === "create") { const r = await api.setCreate(name); setPrompt(null); await loadSets(r?.id); }
            else { await api.setRename(prompt.id, name); setPrompt(null); await loadSets(); }
        } catch { setPrompt(null); } finally { setBusy(false); }
    };

    const delSet = async (id) => {
        if (!window.confirm(ll.delConfirm)) return;
        await api.setDelete(id).catch(() => {});
        await loadSets();
    };

    const toggleStudying = async (s) => {
        setSets((prev) => prev.map((x) => x.id === s.id ? { ...x, studying: !x.studying } : x)); // оптимистично
        await api.setStudying(s.id, !s.studying).catch(() => loadSets());
    };

    const addToSet = async (poolId) => { await api.setAddWords(activeId, [poolId]); await loadWords(activeId); await loadSets(activeId); };
    const removeWord = async (poolId) => { await api.setRemoveWord(activeId, poolId).catch(() => {}); await loadWords(activeId); await loadSets(activeId); };
    const moveWord = async (poolId, targetId) => {
        await api.setAddWords(targetId, [poolId]).catch(() => {});
        await api.setRemoveWord(activeId, poolId).catch(() => {});
        setMoveFor(null);
        await loadWords(activeId); await loadSets(activeId);
    };
    const studySet = () => { if (active?.count) openSession?.(null, "choice", { setId: active.id }); };

    const otherSets = sets.filter((s) => s.id !== activeId);

    return (
        <div className="sets-tab">
            <div className="page-head" style={{ marginBottom: "var(--sp-3)" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--fs-22)", fontWeight: 700 }}>{ll.title}</h2>
                    <p className="muted" style={{ margin: "2px 0 0" }}>{ll.desc}</p>
                </div>
                <button className="btn btn--accent btn--sm" onClick={() => setPrompt({ mode: "create", value: "" })}>
                    <Icon n="plus" sm /> {ll.newSet}
                </button>
            </div>

            {/* строка чипов-наборов */}
            {sets.length > 0 && (
                <div className="chiprow chiprow--scroll" style={{ marginBottom: "var(--sp-4)" }}>
                    {sets.map((s) => (
                        <button key={s.id} className={"fchip" + (s.id === activeId ? " is-on" : "")} onClick={() => setActiveId(s.id)}>
                            {s.studying && <Icon n="zap" sm />} {s.name} <span className="fchip__count">{s.count}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* пусто: нет наборов */}
            {sets.length === 0 ? (
                <div className="empty">
                    <div className="empty__ic"><Icon n="layers" lg /></div>
                    <div className="empty__t">{ll.noSets}</div>
                    <div className="empty__d">{ll.noSetsHint}</div>
                    <button className="btn btn--accent" style={{ marginTop: "var(--sp-4)" }} onClick={() => setPrompt({ mode: "create", value: "" })}>
                        <Icon n="plus" sm /> {ll.newSet}
                    </button>
                </div>
            ) : active && (
                <>
                    {/* тулбар активного набора */}
                    <div className="card" style={{ padding: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "var(--sp-2)", flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0 }}>
                                <div className="row" style={{ alignItems: "center", gap: "var(--sp-2)" }}>
                                    <b style={{ fontSize: "var(--fs-18)" }}>{active.name}</b>
                                    <span className="muted">· {active.count} {pl(lang, active.count, "word")}</span>
                                </div>
                            </div>
                            <ActionMenu icon="more" align="right" items={[
                                { key: "rename", label: ll.rename, icon: "edit", onClick: () => setPrompt({ mode: "rename", value: active.name, id: active.id }) },
                                { key: "del", label: ll.del, icon: "trash", danger: true, onClick: () => delSet(active.id) },
                            ]} />
                        </div>

                        {/* тоггл «в ежедневной учёбе» */}
                        <label className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: "var(--sp-3)", marginTop: "var(--sp-3)", cursor: "pointer" }}>
                            <span style={{ minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>{ll.studying}</span>
                                <span className="muted" style={{ display: "block", fontSize: "var(--fs-13)" }}>{ll.studyingHint}</span>
                            </span>
                            <span className={"toggle" + (active.studying ? " is-on" : "")} onClick={() => toggleStudying(active)} />
                        </label>

                        <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
                            <button className="btn btn--accent" disabled={!active.count} onClick={studySet}>
                                <Icon n="play" sm /> {ll.studySet}
                            </button>
                            <button className="btn btn--ghost" onClick={() => setSearchOpen(true)}>
                                <Icon n="search" sm /> {ll.searchWords}
                            </button>
                        </div>
                    </div>

                    {/* слова набора */}
                    {words.length === 0 && !wLoading ? (
                        <div className="empty">
                            <div className="empty__ic"><Icon n="search" lg /></div>
                            <div className="empty__t">{ll.noWords}</div>
                            <div className="empty__d">{ll.noWordsHint}</div>
                            <button className="btn btn--accent" style={{ marginTop: "var(--sp-4)" }} onClick={() => setSearchOpen(true)}>
                                <Icon n="search" sm /> {ll.searchWords}
                            </button>
                        </div>
                    ) : (
                        <div className="swordlist" style={wLoading ? { opacity: .5 } : undefined}>
                            {words.map((w) => (
                                <div className="sword" key={w.pool_id}>
                                    <div className="sword__main" onClick={() => openWord?.(w.norwegian)} style={{ cursor: "pointer" }}>
                                        <div className="sword__top">
                                            <span className="sword__word">{w.norwegian}</span>
                                            <span className="sword__tr">{w.translate?.[lang]?.join(", ")}</span>
                                        </div>
                                        <div className="sword__meta">
                                            {w.level && <span className="chip lvl">{w.level}</span>}
                                            <span className={"chip pos " + posMeta(w.part_of_speech).cls}>{posLabel(w.part_of_speech, t)}</span>
                                        </div>
                                    </div>
                                    <div className="sword__right" onClick={(e) => e.stopPropagation()}>
                                        <SpeakButton
                                            segments={[{ text: w.norwegian, hasTts: true }, { text: w.translate?.[lang]?.join(", "), lang: ttsLang(lang) }]}
                                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                                        <ActionMenu icon="more" align="right" items={[
                                            { key: "move", label: ll.move, icon: "arrow-right", disabled: otherSets.length === 0, onClick: () => setMoveFor(w.pool_id) },
                                            { key: "remove", label: ll.remove, icon: "x-circle", danger: true, onClick: () => removeWord(w.pool_id) },
                                        ]} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* попап умного поиска по Базе → добавить в активный набор */}
            <PoolSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} lang={lang}
                inSet={inSet} onPick={addToSet} t={t} />

            {/* создать / переименовать набор */}
            <Modal open={!!prompt} onClose={() => setPrompt(null)} title={prompt?.mode === "rename" ? ll.rename : ll.newSet} maxWidth={420}>
                <input className="input" autoFocus value={prompt?.value || ""} placeholder={ll.namePh}
                    onChange={(e) => setPrompt((p) => ({ ...p, value: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitPrompt(); }} style={{ width: "100%" }} />
                <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }} disabled={busy || !(prompt?.value || "").trim()} onClick={submitPrompt}>
                    {busy ? <BtnSpinner /> : <Icon n="check" sm />} {ll.save}
                </button>
            </Modal>

            {/* переместить слово в другой набор */}
            <Modal open={moveFor != null} onClose={() => setMoveFor(null)} title={ll.moveTitle} maxWidth={420}>
                {otherSets.length === 0 ? (
                    <p className="muted">{ll.noOther}</p>
                ) : (
                    <div className="row" style={{ flexDirection: "column", gap: "var(--sp-2)" }}>
                        {otherSets.map((s) => (
                            <button key={s.id} className="btn btn--ghost btn--block" style={{ justifyContent: "space-between" }} onClick={() => moveWord(moveFor, s.id)}>
                                <span>{s.name}</span><span className="muted">{s.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
