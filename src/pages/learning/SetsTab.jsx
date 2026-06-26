// Вкладка «Наборы»: личные подборки слов. Слой курации над общим SRS (прогресс по слову
// общий). Можно создавать/переименовывать/удалять наборы, искать слова (попап с умным поиском
// Базы) и добавлять в набор, перемещать слова между наборами, включать набор в ежедневную учёбу
// (тоггл studying) и учить набор отдельным дриллом («Учить набор» → сессия с setId).
import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { ActionMenu } from "../../components/ui/Dropdown.jsx";
import { BtnSpinner } from "../../components/ui/Spinner.jsx";
import { WordCard } from "../../components/ui/WordCard.jsx";
import { pl } from "../../components/ui/plural.js";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { langGuard } from "../../interface/i18nGuard.js";
import PoolSearchPanel from "../../components/learning/PoolSearchPanel.jsx";

const L = langGuard({
    ru:  { title: "Наборы", desc: "Свои подборки слов — учи их отдельно или подключай к ежедневной сессии", newSet: "Создать набор", create: "Создать", rename: "Переименовать", del: "Удалить", delConfirm: "Удалить набор? Прогресс по словам сохранится.", studySet: "Учить набор", searchWords: "Поиск слов", studying: "В ежедневной учёбе", studyingHint: "Слова набора попадают в умную сессию «Сегодня»", move: "Переместить в…", moveTitle: "Переместить в набор", remove: "Убрать из набора", noSets: "Пока нет наборов", noSetsHint: "Создай подборку слов и учи её отдельно", noWords: "В наборе пока нет слов", noWordsHint: "Найди слова в поиске и добавь их сюда", toStart: "ещё {k} до старта", namePh: "Название набора", save: "Сохранить", noOther: "Нет других наборов", words: "слов", openSearch: "Развернуть поиск", openSet: "Развернуть набор", learned: "выучено", generate: "Сгенерировать", genTitle: "Сгенерировать слова", genTopicPh: "Тема (необязательно)", levelAny: "Любой", count: "Количество", generating: "Генерирую…" },
    en:  { title: "Sets", desc: "Your own word collections — study them on their own or feed the daily session", newSet: "New set", create: "Create", rename: "Rename", del: "Delete", delConfirm: "Delete this set? Word progress is kept.", studySet: "Study set", searchWords: "Search words", studying: "In daily study", studyingHint: "Set words join the smart “Today” session", move: "Move to…", moveTitle: "Move to set", remove: "Remove from set", noSets: "No sets yet", noSetsHint: "Create a word collection and study it on its own", noWords: "No words in this set yet", noWordsHint: "Find words in the search and add them here", toStart: "{k} more to start", namePh: "Set name", save: "Save", noOther: "No other sets", words: "words", openSearch: "Expand search", openSet: "Expand set", learned: "learned", generate: "Generate", genTitle: "Generate words", genTopicPh: "Topic (optional)", levelAny: "Any", count: "Count", generating: "Generating…" },
    ukr: { title: "Набори", desc: "Власні добірки слів — вивчай їх окремо або підключай до щоденної сесії", newSet: "Створити набір", create: "Створити", rename: "Перейменувати", del: "Видалити", delConfirm: "Видалити набір? Прогрес за словами збережеться.", studySet: "Вчити набір", searchWords: "Пошук слів", studying: "У щоденному навчанні", studyingHint: "Слова набору потрапляють у розумну сесію «Сьогодні»", move: "Перемістити в…", moveTitle: "Перемістити в набір", remove: "Прибрати з набору", noSets: "Поки немає наборів", noSetsHint: "Створи добірку слів і вчи її окремо", noWords: "У наборі поки немає слів", noWordsHint: "Знайди слова в пошуку й додай їх сюди", toStart: "ще {k} до старту", namePh: "Назва набору", save: "Зберегти", noOther: "Немає інших наборів", words: "слів", openSearch: "Розгорнути пошук", openSet: "Розгорнути набір", learned: "вивчено", generate: "Згенерувати", genTitle: "Згенерувати слова", genTopicPh: "Тема (необов’язково)", levelAny: "Будь-який", count: "Кількість", generating: "Генерую…" },
    pl:  { title: "Zestawy", desc: "Własne zbiory słów — ucz się ich osobno lub dołącz je do codziennej sesji", newSet: "Nowy zestaw", create: "Utwórz", rename: "Zmień nazwę", del: "Usuń", delConfirm: "Usunąć zestaw? Postępy w słowach zostaną zachowane.", studySet: "Ucz się zestawu", searchWords: "Szukaj słów", studying: "W codziennej nauce", studyingHint: "Słowa z zestawu trafiają do inteligentnej sesji „Dziś”", move: "Przenieś do…", moveTitle: "Przenieś do zestawu", remove: "Usuń z zestawu", noSets: "Brak zestawów", noSetsHint: "Utwórz zbiór słów i ucz się go osobno", noWords: "Brak słów w tym zestawie", noWordsHint: "Znajdź słowa w wyszukiwaniu i dodaj je tutaj", toStart: "jeszcze {k} do startu", namePh: "Nazwa zestawu", save: "Zapisz", noOther: "Brak innych zestawów", words: "słów", openSearch: "Rozwiń wyszukiwanie", openSet: "Rozwiń zestaw", learned: "nauczono", generate: "Wygeneruj", genTitle: "Wygeneruj słowa", genTopicPh: "Temat (opcjonalnie)", levelAny: "Dowolny", count: "Liczba", generating: "Generuję…" },
    lt:  { title: "Rinkiniai", desc: "Savi žodžių rinkiniai — mokykis jų atskirai arba įtrauk į kasdienę sesiją", newSet: "Naujas rinkinys", create: "Sukurti", rename: "Pervadinti", del: "Ištrinti", delConfirm: "Ištrinti rinkinį? Žodžių pažanga išliks.", studySet: "Mokytis rinkinio", searchWords: "Ieškoti žodžių", studying: "Kasdienėje mokymosi sesijoje", studyingHint: "Rinkinio žodžiai patenka į išmaniąją „Šiandien“ sesiją", move: "Perkelti į…", moveTitle: "Perkelti į rinkinį", remove: "Pašalinti iš rinkinio", noSets: "Rinkinių dar nėra", noSetsHint: "Sukurk žodžių rinkinį ir mokykis jo atskirai", noWords: "Rinkinyje dar nėra žodžių", noWordsHint: "Surask žodžius paieškoje ir pridėk juos čia", toStart: "dar {k} iki starto", namePh: "Rinkinio pavadinimas", save: "Išsaugoti", noOther: "Kitų rinkinių nėra", words: "žodžių", openSearch: "Išskleisti paiešką", openSet: "Išskleisti rinkinį", learned: "išmokta", generate: "Generuoti", genTitle: "Generuoti žodžius", genTopicPh: "Tema (nebūtina)", levelAny: "Bet koks", count: "Kiekis", generating: "Generuoju…" },
    lv:  { title: "Kopas", desc: "Savas vārdu kopas — mācies tās atsevišķi vai pievieno ikdienas sesijai", newSet: "Jauna kopa", create: "Izveidot", rename: "Pārdēvēt", del: "Dzēst", delConfirm: "Dzēst kopu? Vārdu progress tiks saglabāts.", studySet: "Mācīties kopu", searchWords: "Meklēt vārdus", studying: "Ikdienas mācībās", studyingHint: "Kopas vārdi nonāk gudrajā sesijā «Šodien»", move: "Pārvietot uz…", moveTitle: "Pārvietot uz kopu", remove: "Noņemt no kopas", noSets: "Vēl nav nevienas kopas", noSetsHint: "Izveido vārdu kopu un mācies to atsevišķi", noWords: "Kopā vēl nav vārdu", noWordsHint: "Atrodi vārdus meklēšanā un pievieno tos šeit", toStart: "vēl {k} līdz startam", namePh: "Kopas nosaukums", save: "Saglabāt", noOther: "Citu kopu nav", words: "vārdi", openSearch: "Izvērst meklēšanu", openSet: "Izvērst kopu", learned: "apgūts", generate: "Ģenerēt", genTitle: "Ģenerēt vārdus", genTopicPh: "Tēma (neobligāti)", levelAny: "Jebkurš", count: "Skaits", generating: "Ģenerēju…" },
    ar:  { title: "المجموعات", desc: "مجموعات كلماتك الخاصة — ادرسها وحدها أو أضِفها إلى جلسة اليوم", newSet: "مجموعة جديدة", create: "إنشاء", rename: "إعادة تسمية", del: "حذف", delConfirm: "حذف المجموعة؟ سيُحفَظ تقدّم الكلمات.", studySet: "ادرس المجموعة", searchWords: "البحث عن كلمات", studying: "في الدراسة اليومية", studyingHint: "تدخل كلمات المجموعة جلسة «اليوم» الذكية", move: "نقل إلى…", moveTitle: "نقل إلى مجموعة", remove: "إزالة من المجموعة", noSets: "لا توجد مجموعات بعد", noSetsHint: "أنشئ مجموعة كلمات وادرسها وحدها", noWords: "لا توجد كلمات في هذه المجموعة بعد", noWordsHint: "ابحث عن كلمات وأضِفها هنا", toStart: "بعد {k} للبدء", namePh: "اسم المجموعة", save: "حفظ", noOther: "لا توجد مجموعات أخرى", words: "كلمات", openSearch: "توسيع البحث", openSet: "توسيع المجموعة", learned: "مُتعلَّم", generate: "توليد", genTitle: "توليد كلمات", genTopicPh: "الموضوع (اختياري)", levelAny: "أي", count: "العدد", generating: "جارٍ التوليد…" },
}, "SetsTab.L");

const MIN_STUDY = 10;   // «Учить набор» доступно только когда в наборе ≥ 10 слов
// Мобильная раскладка: высоты свёрнутых полосок и разделителя (для расчёта высот панелей + анимации)
const DIVIDER_H = 30, SEARCH_COLLAPSED = 58, SET_COLLAPSED = 58;

// ≤760px — мобильная раскладка (одна панель активна, вторая свёрнута в полоску).
function useIsMobile(maxw = 760) {
    const [m, setM] = useState(() => { try { return window.matchMedia(`(max-width:${maxw}px)`).matches; } catch { return false; } });
    useEffect(() => {
        let mq; try { mq = window.matchMedia(`(max-width:${maxw}px)`); } catch { return undefined; }
        const on = () => setM(mq.matches); on();
        mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
        return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
    }, [maxw]);
    return m;
}

export default function SetsTab({ lang, openSession, openWord }) {
    const ll = L[lang] || L.ru;
    const t = interfaceTranslate[lang] || interfaceTranslate.en;

    const [sets, setSets] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [words, setWords] = useState([]);
    const [wLoading, setWLoading] = useState(false);
    const [prompt, setPrompt] = useState(null);   // { mode:'create'|'rename', value, id }
    const [gen, setGen] = useState(null);         // null | { topic, level, count } — открыта модалка генерации
    const [genBusy, setGenBusy] = useState(false);
    const [busy, setBusy] = useState(false);
    const [hoverPid, setHoverPid] = useState(null); // наведённое слева слово → подсветка в наборе справа
    const isMobile = useIsMobile();
    const [mob, setMob] = useState("set"); // мобилка: какая панель активна — "set" | "search"
    const [mobH, setMobH] = useState(0);   // высота мобильной раскладки (под экран, без скролла страницы)
    const mobRef = useRef(null);

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

    // Мобилка: высота раскладки = от её позиции в документе до низа экрана (минус нижний таб-бар) →
    // страница не скроллится, скроллится только активная панель. Считаем по факту (без магических
    // чисел). document-offset (rect.top+scrollY), чтобы не зависеть от текущего скролла.
    useLayoutEffect(() => {
        if (!isMobile) { setMobH(0); return undefined; }
        const estimate = () => {
            const el = mobRef.current; if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;     // позиция панели в документе
            const bar = document.querySelector(".tabbar");                   // нижний таб-бар (рендерится в App)
            const barH = (bar && getComputedStyle(bar).display !== "none") ? bar.getBoundingClientRect().height : 0;
            setMobH(Math.max(240, Math.floor(window.innerHeight - top - barH - 4)));
        };
        estimate();
        // самокоррекция: что бы ни вызвало переполнение страницы — ужать панель ровно на него (несколько кадров)
        let tries = 0, raf = 0;
        const tick = () => {
            const over = Math.ceil(document.documentElement.scrollHeight - window.innerHeight);
            if (over > 0) setMobH((h0) => Math.max(200, h0 - over));
            if (++tries < 5) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        window.addEventListener("resize", estimate);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", estimate); };
    }, [isMobile, activeId, sets.length]);

    // высоты панелей мобильной раскладки: активная тянется, свёрнутая = фикс-полоска (для анимации height)
    const innerH = Math.max(0, mobH - DIVIDER_H);
    const searchH = mob === "search" ? Math.max(120, innerH - SET_COLLAPSED) : SEARCH_COLLAPSED;
    const setH = mob === "set" ? Math.max(120, innerH - SEARCH_COLLAPSED) : SET_COLLAPSED;

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
    const studySet = () => { if ((active?.count || 0) >= MIN_STUDY) openSession?.(null, "choice", { setId: active.id }); };
    const learned = useMemo(() => words.filter((w) => w.status === "mastered").length, [words]);
    const doGenerate = async () => {
        if (genBusy || !activeId || !gen) return;
        setGenBusy(true);
        try {
            await api.setGenerate(activeId, { topic: (gen.topic || "").trim(), level: gen.level || "", count: gen.count, lang });
            setGen(null);
            await loadWords(activeId); await loadSets(activeId);
        } catch { setGen(null); } finally { setGenBusy(false); }
    };

    // ---- готовые куски: используются и в десктоп-двухколонке, и в мобильной раскладке ----
    const studyDisabled = (active?.count || 0) < MIN_STUDY;
    const studyTitle = studyDisabled ? ll.toStart.replace("{k}", MIN_STUDY - (active?.count || 0)) : ll.studySet;

    const searchFull = (
        <PoolSearchPanel lang={lang} setId={activeId} inSet={inSet} onPick={addToSet} onRemove={removeWord}
            openWord={openWord} onHover={(w) => setHoverPid(w?.pool_id ?? null)} t={t} />
    );
    const searchCompact = (
        <PoolSearchPanel lang={lang} setId={activeId} inSet={inSet} onPick={addToSet} onRemove={removeWord}
            openWord={openWord} compact t={t} />
    );
    const searchHead = (
        <div className="sets-pane__head">
            <span className="sets-pane__title"><Icon n="search" sm /> <b>{ll.searchWords}</b></span>
        </div>
    );
    const setHead = active && (
        <>
            <div className="sets-pane__head">
                <span className="sets-pane__title">
                    <b>{active.name}</b>
                    <span className="muted">· {active.count} {pl(lang, active.count, "word")}
                        {active.count < MIN_STUDY && <> · {ll.toStart.replace("{k}", MIN_STUDY - active.count)}</>}
                    </span>
                </span>
                <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => setGen({ topic: "", level: "", count: 10 })} title={ll.generate}>
                        <Icon n="sparkles" sm /> {ll.generate}
                    </button>
                    <button className="btn btn--accent btn--sm" disabled={studyDisabled} onClick={studySet} title={studyTitle}>
                        <Icon n="play" sm /> {ll.studySet}
                    </button>
                    <ActionMenu icon="more" align="right" items={[
                        { key: "rename", label: ll.rename, icon: "edit", onClick: () => setPrompt({ mode: "rename", value: active.name, id: active.id }) },
                        { key: "del", label: ll.del, icon: "trash", danger: true, onClick: () => delSet(active.id) },
                    ]} />
                </span>
            </div>
            {/* прогресс набора: выучено N из M */}
            {active.count > 0 && (
                <div className="setprog">
                    <div className="setprog__bar"><div className="setprog__fill" style={{ width: Math.round(learned / active.count * 100) + "%" }} /></div>
                    <span className="setprog__txt muted">{ll.learned} {learned} / {active.count}</span>
                </div>
            )}
            <label className="sets-pane__bar" style={{ cursor: "pointer" }}>
                <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>{ll.studying}</span>
                    <span className="muted" style={{ display: "block", fontSize: "var(--fs-13)" }}>{ll.studyingHint}</span>
                </span>
                <span className={"toggle" + (active.studying ? " is-on" : "")} onClick={() => toggleStudying(active)} />
            </label>
        </>
    );
    const setBody = (
        <div className="sets-pane__body">
            {words.length === 0 && !wLoading ? (
                <div className="empty empty--mini">
                    <div className="empty__ic"><Icon n="sparkles" lg /></div>
                    <div className="empty__t">{ll.noWords}</div>
                    <div className="empty__d">{ll.noWordsHint}</div>
                    <button className="btn btn--accent btn--sm" style={{ marginTop: "var(--sp-3)" }} onClick={() => setGen({ topic: "", level: "", count: 10 })}>
                        <Icon n="sparkles" sm /> {ll.generate}
                    </button>
                </div>
            ) : (
                <div className="wordlist" style={wLoading ? { opacity: .5 } : undefined}>
                    {words.map((w) => (
                        <WordCard key={w.pool_id} word={w} lang={lang} t={t} flat status={w.status}
                            added highlight={hoverPid != null && w.pool_id === hoverPid}
                            onToggle={() => removeWord(w.pool_id)}
                            onInfo={openWord ? (() => openWord(w.norwegian)) : undefined} />
                    ))}
                </div>
            )}
        </div>
    );
    const setStrip = (
        <div className="setstrip">
            {words.length === 0
                ? <span className="muted" style={{ padding: "6px 10px" }}>{ll.noWords}</span>
                : words.map((w) => (
                    <span className="setchip" key={w.pool_id} onClick={() => setMob("set")}>
                        <span className="setchip__w">{w.norwegian}</span>
                        <button className="setchip__x" aria-label="×" onClick={(e) => { e.stopPropagation(); removeWord(w.pool_id); }}>
                            <Icon n="x" sm />
                        </button>
                    </span>
                ))}
        </div>
    );

    return (
        <div className="sets-tab">
            <div className="page-head" style={{ marginBottom: "var(--sp-3)" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--fs-22)", fontWeight: 700 }}>{ll.title}</h2>
                    <p className="muted" style={{ margin: "2px 0 0" }}>{ll.desc}</p>
                </div>
            </div>

            {/* строка чипов-наборов + кнопка «+» нового набора в том же ряду */}
            {sets.length > 0 && (
                <div className="chiprow chiprow--scroll" style={{ marginBottom: "var(--sp-4)" }}>
                    {sets.map((s) => (
                        <button key={s.id} className={"fchip" + (s.id === activeId ? " is-on" : "")} onClick={() => setActiveId(s.id)}>
                            {s.studying && <Icon n="zap" sm />} {s.name} <span className="fchip__count">{s.count}</span>
                        </button>
                    ))}
                    <button className="fchip fchip--add" aria-label={ll.newSet} title={ll.newSet}
                        onClick={() => setPrompt({ mode: "create", value: "" })}>
                        <Icon n="plus" sm />
                    </button>
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
                isMobile ? (
                    /* Мобилка: активна одна панель, вторая свёрнута в полоску; всё в одну высоту экрана */
                    <div className="sets-mob" ref={mobRef} style={mobH ? { height: mobH } : undefined}>
                        {/* ВЕРХ: поиск — компактный (активен набор) или полный (активен поиск) */}
                        <section className={"sets-mpane" + (mob === "search" ? " is-active" : "")} style={{ height: searchH }}>
                            {mob === "search" ? searchFull : searchCompact}
                        </section>
                        {/* разделитель — тап переключает активную панель */}
                        <button className="sets-divider" onClick={() => setMob((m) => (m === "set" ? "search" : "set"))}
                            aria-label={mob === "set" ? ll.openSearch : ll.openSet}>
                            <Icon n={mob === "set" ? "chevron-up" : "chevron-down"} sm />
                            <span className="sets-divider__txt">{mob === "set" ? ll.openSearch : ll.openSet}</span>
                            <Icon n={mob === "set" ? "chevron-up" : "chevron-down"} sm />
                        </button>
                        {/* НИЗ: набор — полный (активен) или полоска чипов (свёрнут) */}
                        <section className={"sets-mpane" + (mob === "set" ? " is-active" : "")} style={{ height: setH }}>
                            {mob === "set" ? <>{setHead}{setBody}</> : setStrip}
                        </section>
                    </div>
                ) : (
                    /* ПК: две колонки рядом — слева поиск по Базе, справа активный набор */
                    <div className="sets-cols">
                        <section className="sets-pane">{searchHead}{searchFull}</section>
                        <section className="sets-pane">{setHead}{setBody}</section>
                    </div>
                )
            )}

            {/* создать / переименовать набор */}
            <Modal open={!!prompt} onClose={() => setPrompt(null)} title={prompt?.mode === "rename" ? ll.rename : ll.newSet} maxWidth={420}>
                <input className="input" autoFocus value={prompt?.value || ""} placeholder={ll.namePh}
                    onChange={(e) => setPrompt((p) => ({ ...p, value: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitPrompt(); }} style={{ width: "100%" }} />
                <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }} disabled={busy || !(prompt?.value || "").trim()} onClick={submitPrompt}>
                    {busy ? <BtnSpinner /> : <Icon n="check" sm />} {ll.save}
                </button>
            </Modal>

            {/* генерация слов в набор: тема + уровень + количество (0–20) */}
            <Modal open={!!gen} onClose={() => { if (!genBusy) setGen(null); }} title={ll.genTitle} maxWidth={460}>
                {gen && (
                    <>
                        <input className="input" autoFocus value={gen.topic} placeholder={ll.genTopicPh}
                            onChange={(e) => setGen((g) => ({ ...g, topic: e.target.value }))} style={{ width: "100%" }} />
                        <div className="chiprow chiprow--scroll" style={{ marginTop: "var(--sp-2)" }}>
                            {Object.keys(t.topics || {}).map((k) => {
                                const lbl = t.topics[k];
                                return (
                                    <button key={k} className={"fchip" + (gen.topic === lbl ? " is-on" : "")}
                                        onClick={() => setGen((g) => ({ ...g, topic: g.topic === lbl ? "" : lbl }))}>{lbl}</button>
                                );
                            })}
                        </div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>CEFR</div>
                        <div className="seg seg--wrap">
                            <button className={"seg__item" + (!gen.level ? " is-active" : "")} onClick={() => setGen((g) => ({ ...g, level: "" }))}>{ll.levelAny}</button>
                            {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                                <button key={lv} className={"seg__item" + (gen.level === lv ? " is-active" : "")} onClick={() => setGen((g) => ({ ...g, level: lv }))}>{lv}</button>
                            ))}
                        </div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>{ll.count}: <b style={{ color: "var(--ink)" }}>{gen.count}</b></div>
                        <input type="range" min="1" max="20" value={gen.count} style={{ width: "100%" }}
                            onChange={(e) => setGen((g) => ({ ...g, count: Number(e.target.value) }))} />
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-4)" }}
                            disabled={genBusy || gen.count < 1} onClick={doGenerate}>
                            {genBusy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {genBusy ? ll.generating : ll.generate}
                        </button>
                    </>
                )}
            </Modal>
        </div>
    );
}
