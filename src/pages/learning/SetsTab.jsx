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
    ru:  { title: "Наборы", desc: "Свои подборки слов — учи их отдельно или подключай к ежедневной сессии", newSet: "Создать набор", create: "Создать", rename: "Переименовать", del: "Удалить", delConfirm: "Удалить набор? Прогресс по словам сохранится.", studySet: "Учить набор", searchWords: "Поиск слов", studying: "В ежедневной учёбе", studyingShort: "В учёбе", studyingHint: "Слова набора попадают в умную сессию «Сегодня»", move: "Переместить в…", moveTitle: "Переместить в набор", remove: "Убрать из набора", noSets: "Пока нет наборов", noSetsHint: "Создай подборку слов и учи её отдельно", noWords: "В наборе пока нет слов", noWordsHint: "Найди слова в поиске и добавь их сюда", toStart: "ещё {k} до старта", namePh: "Название набора", save: "Сохранить", noOther: "Нет других наборов", words: "слов", openSearch: "Развернуть поиск", openSet: "Развернуть набор", learned: "выучено", generate: "Сгенерировать", genTitle: "Сгенерировать слова", genTopicPh: "Тема (необязательно)", levelAny: "Любой", count: "Количество", generating: "Генерирую…", cancel: "Отмена", needUnlearned: "нужно ≥5 невыученных", allLearned: "всё выучено 🎉", resetRamp: "Учить заново", genTopicTpl: "Тема: «{n}», можно ввести свою", resetConfirm: "Сбросить прогресс {n} слов и учить заново?", importPhoto: "Из фото", imgTitle: "Слова с фото", imgHintPh: "Уточнить, какие слова брать (необязательно)", imgRun: "Распознать", imgBusy: "Распознаю…", imgReview: "Проверьте список — слова можно отредактировать или удалить:", imgEmpty: "На фото не нашлось норвежских слов", imgFail: "Не удалось обработать фото", imgAdd: "Добавить {n}", addWord: "Добавить слово" },
    en:  { title: "Sets", desc: "Your own word collections — study them on their own or feed the daily session", newSet: "New set", create: "Create", rename: "Rename", del: "Delete", delConfirm: "Delete this set? Word progress is kept.", studySet: "Study set", searchWords: "Search words", studying: "In daily study", studyingShort: "In study", studyingHint: "Set words join the smart “Today” session", move: "Move to…", moveTitle: "Move to set", remove: "Remove from set", noSets: "No sets yet", noSetsHint: "Create a word collection and study it on its own", noWords: "No words in this set yet", noWordsHint: "Find words in the search and add them here", toStart: "{k} more to start", namePh: "Set name", save: "Save", noOther: "No other sets", words: "words", openSearch: "Expand search", openSet: "Expand set", learned: "learned", generate: "Generate", genTitle: "Generate words", genTopicPh: "Topic (optional)", levelAny: "Any", count: "Count", generating: "Generating…", cancel: "Cancel", needUnlearned: "need ≥5 unlearned", allLearned: "all learned 🎉", resetRamp: "Study again", genTopicTpl: "Topic: “{n}”, or type your own", resetConfirm: "Reset progress of {n} words and study again?", importPhoto: "From photo", imgTitle: "Words from photo", imgHintPh: "Hint which words to take (optional)", imgRun: "Recognize", imgBusy: "Recognizing…", imgReview: "Check the list — words can be edited or removed:", imgEmpty: "No Norwegian words found on the photo", imgFail: "Couldn't process the photo", imgAdd: "Add {n}", addWord: "Add word" },
    ukr: { title: "Набори", desc: "Власні добірки слів — вивчай їх окремо або підключай до щоденної сесії", newSet: "Створити набір", create: "Створити", rename: "Перейменувати", del: "Видалити", delConfirm: "Видалити набір? Прогрес за словами збережеться.", studySet: "Вчити набір", searchWords: "Пошук слів", studying: "У щоденному навчанні", studyingShort: "У навчанні", studyingHint: "Слова набору потрапляють у розумну сесію «Сьогодні»", move: "Перемістити в…", moveTitle: "Перемістити в набір", remove: "Прибрати з набору", noSets: "Поки немає наборів", noSetsHint: "Створи добірку слів і вчи її окремо", noWords: "У наборі поки немає слів", noWordsHint: "Знайди слова в пошуку й додай їх сюди", toStart: "ще {k} до старту", namePh: "Назва набору", save: "Зберегти", noOther: "Немає інших наборів", words: "слів", openSearch: "Розгорнути пошук", openSet: "Розгорнути набір", learned: "вивчено", generate: "Згенерувати", genTitle: "Згенерувати слова", genTopicPh: "Тема (необов’язково)", levelAny: "Будь-який", count: "Кількість", generating: "Генерую…", cancel: "Скасувати", needUnlearned: "потрібно ≥5 невивчених", allLearned: "усе вивчено 🎉", resetRamp: "Вчити заново", genTopicTpl: "Тема: «{n}», можна ввести свою", resetConfirm: "Скинути прогрес {n} слів і вчити заново?", importPhoto: "З фото", imgTitle: "Слова з фото", imgHintPh: "Уточнити, які слова брати (необов’язково)", imgRun: "Розпізнати", imgBusy: "Розпізнаю…", imgReview: "Перевірте список — слова можна відредагувати або видалити:", imgEmpty: "На фото не знайдено норвезьких слів", imgFail: "Не вдалося обробити фото", imgAdd: "Додати {n}", addWord: "Додати слово" },
    pl:  { title: "Zestawy", desc: "Własne zbiory słów — ucz się ich osobno lub dołącz je do codziennej sesji", newSet: "Nowy zestaw", create: "Utwórz", rename: "Zmień nazwę", del: "Usuń", delConfirm: "Usunąć zestaw? Postępy w słowach zostaną zachowane.", studySet: "Ucz się zestawu", searchWords: "Szukaj słów", studying: "W codziennej nauce", studyingShort: "W nauce", studyingHint: "Słowa z zestawu trafiają do inteligentnej sesji „Dziś”", move: "Przenieś do…", moveTitle: "Przenieś do zestawu", remove: "Usuń z zestawu", noSets: "Brak zestawów", noSetsHint: "Utwórz zbiór słów i ucz się go osobno", noWords: "Brak słów w tym zestawie", noWordsHint: "Znajdź słowa w wyszukiwaniu i dodaj je tutaj", toStart: "jeszcze {k} do startu", namePh: "Nazwa zestawu", save: "Zapisz", noOther: "Brak innych zestawów", words: "słów", openSearch: "Rozwiń wyszukiwanie", openSet: "Rozwiń zestaw", learned: "nauczono", generate: "Wygeneruj", genTitle: "Wygeneruj słowa", genTopicPh: "Temat (opcjonalnie)", levelAny: "Dowolny", count: "Liczba", generating: "Generuję…", cancel: "Anuluj", needUnlearned: "potrzeba ≥5 nienauczonych", allLearned: "wszystko nauczone 🎉", resetRamp: "Ucz się od nowa", genTopicTpl: "Temat: „{n}”, lub wpisz własny", resetConfirm: "Zresetować postęp {n} słów i uczyć się od nowa?", importPhoto: "Ze zdjęcia", imgTitle: "Słowa ze zdjęcia", imgHintPh: "Doprecyzuj, które słowa wziąć (opcjonalnie)", imgRun: "Rozpoznaj", imgBusy: "Rozpoznaję…", imgReview: "Sprawdź listę — słowa można edytować lub usunąć:", imgEmpty: "Nie znaleziono norweskich słów na zdjęciu", imgFail: "Nie udało się przetworzyć zdjęcia", imgAdd: "Dodaj {n}", addWord: "Dodaj słowo" },
    lt:  { title: "Rinkiniai", desc: "Savi žodžių rinkiniai — mokykis jų atskirai arba įtrauk į kasdienę sesiją", newSet: "Naujas rinkinys", create: "Sukurti", rename: "Pervadinti", del: "Ištrinti", delConfirm: "Ištrinti rinkinį? Žodžių pažanga išliks.", studySet: "Mokytis rinkinio", searchWords: "Ieškoti žodžių", studying: "Kasdienėje mokymosi sesijoje", studyingShort: "Mokyme", studyingHint: "Rinkinio žodžiai patenka į išmaniąją „Šiandien“ sesiją", move: "Perkelti į…", moveTitle: "Perkelti į rinkinį", remove: "Pašalinti iš rinkinio", noSets: "Rinkinių dar nėra", noSetsHint: "Sukurk žodžių rinkinį ir mokykis jo atskirai", noWords: "Rinkinyje dar nėra žodžių", noWordsHint: "Surask žodžius paieškoje ir pridėk juos čia", toStart: "dar {k} iki starto", namePh: "Rinkinio pavadinimas", save: "Išsaugoti", noOther: "Kitų rinkinių nėra", words: "žodžių", openSearch: "Išskleisti paiešką", openSet: "Išskleisti rinkinį", learned: "išmokta", generate: "Generuoti", genTitle: "Generuoti žodžius", genTopicPh: "Tema (nebūtina)", levelAny: "Bet koks", count: "Kiekis", generating: "Generuoju…", cancel: "Atšaukti", needUnlearned: "reikia ≥5 neišmoktų", allLearned: "viskas išmokta 🎉", resetRamp: "Mokytis iš naujo", genTopicTpl: "Tema: „{n}“, arba įveskite savo", resetConfirm: "Atstatyti {n} žodžių pažangą ir mokytis iš naujo?", importPhoto: "Iš nuotraukos", imgTitle: "Žodžiai iš nuotraukos", imgHintPh: "Patikslinkite, kuriuos žodžius imti (nebūtina)", imgRun: "Atpažinti", imgBusy: "Atpažįstu…", imgReview: "Patikrinkite sąrašą — žodžius galima redaguoti ar pašalinti:", imgEmpty: "Nuotraukoje nerasta norvegiškų žodžių", imgFail: "Nepavyko apdoroti nuotraukos", imgAdd: "Pridėti {n}", addWord: "Pridėti žodį" },
    lv:  { title: "Kopas", desc: "Savas vārdu kopas — mācies tās atsevišķi vai pievieno ikdienas sesijai", newSet: "Jauna kopa", create: "Izveidot", rename: "Pārdēvēt", del: "Dzēst", delConfirm: "Dzēst kopu? Vārdu progress tiks saglabāts.", studySet: "Mācīties kopu", searchWords: "Meklēt vārdus", studying: "Ikdienas mācībās", studyingShort: "Mācībās", studyingHint: "Kopas vārdi nonāk gudrajā sesijā «Šodien»", move: "Pārvietot uz…", moveTitle: "Pārvietot uz kopu", remove: "Noņemt no kopas", noSets: "Vēl nav nevienas kopas", noSetsHint: "Izveido vārdu kopu un mācies to atsevišķi", noWords: "Kopā vēl nav vārdu", noWordsHint: "Atrodi vārdus meklēšanā un pievieno tos šeit", toStart: "vēl {k} līdz startam", namePh: "Kopas nosaukums", save: "Saglabāt", noOther: "Citu kopu nav", words: "vārdi", openSearch: "Izvērst meklēšanu", openSet: "Izvērst kopu", learned: "apgūts", generate: "Ģenerēt", genTitle: "Ģenerēt vārdus", genTopicPh: "Tēma (neobligāti)", levelAny: "Jebkurš", count: "Skaits", generating: "Ģenerēju…", cancel: "Atcelt", needUnlearned: "vajag ≥5 neapgūtus", allLearned: "viss apgūts 🎉", resetRamp: "Mācīties no jauna", genTopicTpl: "Tēma: «{n}», vai ievadiet savu", resetConfirm: "Atiestatīt {n} vārdu progresu un mācīties no jauna?", importPhoto: "No foto", imgTitle: "Vārdi no foto", imgHintPh: "Precizē, kurus vārdus ņemt (neobligāti)", imgRun: "Atpazīt", imgBusy: "Atpazīstu…", imgReview: "Pārbaudi sarakstu — vārdus var rediģēt vai dzēst:", imgEmpty: "Fotoattēlā nav atrasti norvēģu vārdi", imgFail: "Neizdevās apstrādāt foto", imgAdd: "Pievienot {n}", addWord: "Pievienot vārdu" },
    ar:  { title: "المجموعات", desc: "مجموعات كلماتك الخاصة — ادرسها وحدها أو أضِفها إلى جلسة اليوم", newSet: "مجموعة جديدة", create: "إنشاء", rename: "إعادة تسمية", del: "حذف", delConfirm: "حذف المجموعة؟ سيُحفَظ تقدّم الكلمات.", studySet: "ادرس المجموعة", searchWords: "البحث عن كلمات", studying: "في الدراسة اليومية", studyingShort: "في الدراسة", studyingHint: "تدخل كلمات المجموعة جلسة «اليوم» الذكية", move: "نقل إلى…", moveTitle: "نقل إلى مجموعة", remove: "إزالة من المجموعة", noSets: "لا توجد مجموعات بعد", noSetsHint: "أنشئ مجموعة كلمات وادرسها وحدها", noWords: "لا توجد كلمات في هذه المجموعة بعد", noWordsHint: "ابحث عن كلمات وأضِفها هنا", toStart: "بعد {k} للبدء", namePh: "اسم المجموعة", save: "حفظ", noOther: "لا توجد مجموعات أخرى", words: "كلمات", openSearch: "توسيع البحث", openSet: "توسيع المجموعة", learned: "مُتعلَّم", generate: "توليد", genTitle: "توليد كلمات", genTopicPh: "الموضوع (اختياري)", levelAny: "أي", count: "العدد", generating: "جارٍ التوليد…", cancel: "إلغاء", needUnlearned: "يلزم ≥5 غير متعلَّمة", allLearned: "كل شيء متعلَّم 🎉", resetRamp: "ادرس من جديد", genTopicTpl: "الموضوع: «{n}»، أو أدخل موضوعك", resetConfirm: "إعادة ضبط تقدّم {n} كلمة والدراسة من جديد؟", importPhoto: "من صورة", imgTitle: "كلمات من صورة", imgHintPh: "حدّد أي كلمات تؤخذ (اختياري)", imgRun: "تعرّف", imgBusy: "جارٍ التعرّف…", imgReview: "راجع القائمة — يمكن تعديل الكلمات أو حذفها:", imgEmpty: "لم يُعثر على كلمات نرويجية في الصورة", imgFail: "تعذّرت معالجة الصورة", imgAdd: "إضافة {n}", addWord: "إضافة كلمة" },
}, "SetsTab.L");

const MIN_UNLEARNED = 5;   // «Учить набор» доступно, когда в наборе ≥5 НЕвыученных слов
const IMG_MAX_DIM = 1280, IMG_QUALITY = 0.72;   // ужимаем фото перед отправкой (размер запроса + токены vision)
// Мобильная раскладка: высоты свёрнутых полосок и разделителя (для расчёта высот панелей + анимации)
const DIVIDER_H = 30, SEARCH_COLLAPSED = 58, SET_COLLAPSED = 58;

// Прочитать файл-картинку и ужать до IMG_MAX_DIM (JPEG) → data-URL. Меньше байт по сети и меньше токенов.
function downscaleImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
            URL.revokeObjectURL(url);
            let w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
            const big = Math.max(w, h);
            if (big > IMG_MAX_DIM) { const k = IMG_MAX_DIM / big; w = Math.round(w * k); h = Math.round(h * k); }
            const c = document.createElement("canvas"); c.width = w; c.height = h;
            c.getContext("2d").drawImage(im, 0, 0, w, h);
            try { resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); } catch (e) { reject(e); }
        };
        im.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        im.src = url;
    });
}

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
    const [gen, setGen] = useState(null);         // null | { topic, levels, count } — открыта модалка генерации
    const [genBusy, setGenBusy] = useState(false);
    // импорт слов с фото: null | { dataUrl, hint, words:null|string[], busy, error }
    // words===null → фаза «фото + уточнение + Распознать»; массив → фаза «правка списка + Добавить»
    const [photo, setPhoto] = useState(null);
    const fileRef = useRef(null);
    const [confirmDel, setConfirmDel] = useState(null); // набор, ожидающий подтверждения удаления
    const [confirmReset, setConfirmReset] = useState(false); // подтверждение сброса прогресса набора
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
        // visualViewport точнее innerHeight в установленном приложении (standalone): не считает
        // площадь под системными панелями, которых на момент первого кадра ещё может «не быть».
        const vh = () => (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        const estimate = () => {
            const el = mobRef.current; if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;     // позиция панели в документе
            const bar = document.querySelector(".tabbar");                   // нижний таб-бар (рендерится в App)
            const barH = (bar && getComputedStyle(bar).display !== "none") ? bar.getBoundingClientRect().height : 0;
            setMobH(Math.max(240, Math.floor(vh() - top - barH - 4)));
        };
        estimate();
        // Самокоррекция переполнения. КРИТИЧНО: вычитаем overflow ТОЛЬКО когда прошлая правка УЖЕ
        // применилась к DOM (scrollHeight изменился). Иначе один и тот же overflow вычитается каждый
        // кадр (setMobH асинхронный) и панель схлопывается в разы — в standalone, где вьюпорт «доезжает»
        // медленнее, это и давало обрезку до половины экрана.
        let tries = 0, raf = 0, lastSH = -1;
        const tick = () => {
            const sh = document.documentElement.scrollHeight;
            const over = Math.ceil(sh - vh());
            if (over > 0 && sh !== lastSH) { lastSH = sh; setMobH((h0) => Math.max(200, h0 - over)); }
            if (++tries < 8) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        // standalone-PWA: системные панели стабилизируются уже ПОСЛЕ первого кадра → пересчитать ещё раз
        const t1 = setTimeout(estimate, 120);
        const t2 = setTimeout(estimate, 400);
        window.addEventListener("resize", estimate);
        return () => {
            cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
            window.removeEventListener("resize", estimate);
        };
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
        setConfirmDel(null);
        await api.setDelete(id).catch(() => {});
        await loadSets();
    };

    const toggleStudying = async (s) => {
        setSets((prev) => prev.map((x) => x.id === s.id ? { ...x, studying: !x.studying } : x)); // оптимистично
        await api.setStudying(s.id, !s.studying).catch(() => loadSets());
    };

    const addToSet = async (poolId) => { await api.setAddWords(activeId, [poolId]); await loadWords(activeId); await loadSets(activeId); };
    const removeWord = async (poolId) => { await api.setRemoveWord(activeId, poolId).catch(() => {}); await loadWords(activeId); await loadSets(activeId); };
    const learned = useMemo(() => words.filter((w) => w.status === "mastered").length, [words]);
    const unlearned = words.length - learned;
    const allLearned = words.length > 0 && unlearned === 0;
    const canStudy = unlearned >= MIN_UNLEARNED;
    const studySet = () => { if (canStudy) openSession?.(null, "choice", { setId: active.id }); };
    const doReset = async () => {
        if (!activeId) return;
        setConfirmReset(false);
        await api.setReset(activeId).catch(() => {});
        await loadWords(activeId); await loadSets(activeId);
    };
    const doGenerate = async () => {
        if (genBusy || !activeId || !gen) return;
        setGenBusy(true);
        try {
            await api.setGenerate(activeId, { topic: (gen.topic || "").trim() || (active?.name || ""), level: (gen.levels || []).join(", "), count: gen.count, lang });
            setGen(null);
            await loadWords(activeId); await loadSets(activeId);
        } catch { setGen(null); } finally { setGenBusy(false); }
    };

    // ---- импорт слов с фото/камеры ----
    const pickPhoto = () => { if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } };
    const onPickFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const dataUrl = await downscaleImage(file);
            setPhoto({ dataUrl, hint: "", words: null, busy: false, error: "" });
        } catch { setPhoto({ dataUrl: "", hint: "", words: null, busy: false, error: ll.imgFail }); }
    };
    const runOcr = async () => {
        if (!photo || photo.busy || !activeId) return;
        setPhoto((p) => ({ ...p, busy: true, error: "" }));
        try {
            const r = await api.setOcr(activeId, { image: photo.dataUrl, hint: photo.hint });
            const words = (r?.words || []).slice(0, 20);
            setPhoto((p) => ({ ...p, busy: false, words, error: words.length ? "" : ll.imgEmpty }));
        } catch { setPhoto((p) => ({ ...p, busy: false, error: ll.imgFail })); }
    };
    const setWord = (i, v) => setPhoto((p) => ({ ...p, words: p.words.map((w, j) => j === i ? v : w) }));
    const delWord = (i) => setPhoto((p) => ({ ...p, words: p.words.filter((_, j) => j !== i) }));
    const addWord = () => setPhoto((p) => (p.words.length >= 20 ? p : { ...p, words: [...p.words, ""] }));
    const doImport = async () => {
        if (!photo || photo.busy || !activeId) return;
        const words = (photo.words || []).map((w) => w.trim()).filter(Boolean);
        if (!words.length) return;
        setPhoto((p) => ({ ...p, busy: true, error: "" }));
        try {
            await api.setImportWords(activeId, { words, lang });
            setPhoto(null);
            await loadWords(activeId); await loadSets(activeId);
        } catch { setPhoto((p) => ({ ...p, busy: false, error: ll.imgFail })); }
    };

    // ---- готовые куски: используются и в десктоп-двухколонке, и в мобильной раскладке ----
    const studyTitle = allLearned ? ll.allLearned : (canStudy ? ll.studySet : ll.needUnlearned);

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
                <label className="sets-pane__study" title={ll.studyingHint}>
                    <span className={"toggle" + (active.studying ? " is-on" : "")} onClick={() => toggleStudying(active)} />
                    <span className="sets-pane__study-l">{ll.studyingShort}</span>
                </label>
                <span className="row" style={{ gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="btn btn--sm btn--gen" onClick={() => setGen({ topic: "", levels: [], count: 10 })} title={ll.generate}>
                        <Icon n="sparkles" /> <span className="hide-narrow">{ll.generate}</span>
                    </button>
                    <button className="btn btn--sm btn--gen" onClick={pickPhoto} title={ll.importPhoto}>
                        <Icon n="camera" /> <span className="hide-narrow">{ll.importPhoto}</span>
                    </button>
                    {allLearned ? (
                        <button className="btn btn--accent btn--sm" onClick={() => setConfirmReset(true)} title={ll.resetRamp}>
                            <Icon n="repeat" sm /> <span className="hide-narrow">{ll.resetRamp}</span>
                        </button>
                    ) : (
                        <button className="btn btn--accent btn--sm" disabled={!canStudy} onClick={studySet} title={studyTitle}>
                            <Icon n="play" sm /> <span className="hide-narrow">{ll.studySet}</span>
                        </button>
                    )}
                    <ActionMenu icon="more" align="right" items={[
                        { key: "rename", label: ll.rename, icon: "edit", onClick: () => setPrompt({ mode: "rename", value: active.name, id: active.id }) },
                        { key: "del", label: ll.del, icon: "trash", danger: true, onClick: () => setConfirmDel(active) },
                    ]} />
                </span>
            </div>
            {/* полоска с названием — заодно прогресс-бар (выученная доля светлее);
                справа подпись в 2 строки мелким шрифтом: «N слов» / «выучено: N» */}
            <div className="sets-pane__nameline">
                {active.count > 0 && (
                    <span className="sets-pane__fill" style={{ width: Math.round(learned / active.count * 100) + "%" }} />
                )}
                <b className="sets-pane__name">{active.name}</b>
                <span className="sets-pane__stat">
                    <span>{active.count} {pl(lang, active.count, "word")}</span>
                    <span className="muted">{ll.learned}: {learned}</span>
                </span>
            </div>
        </>
    );
    const setBody = (
        <div className="sets-pane__body">
            {words.length === 0 && !wLoading ? (
                <div className="empty empty--mini">
                    <div className="empty__ic"><Icon n="sparkles" lg /></div>
                    <div className="empty__t">{ll.noWords}</div>
                    <div className="empty__d">{ll.noWordsHint}</div>
                    <button className="btn btn--sm btn--gen" style={{ marginTop: "var(--sp-3)" }} onClick={() => setGen({ topic: "", levels: [], count: 10 })}>
                        <Icon n="sparkles" /> {ll.generate}
                    </button>
                </div>
            ) : (
                <div className="wordlist" style={wLoading ? { opacity: .5 } : undefined}>
                    {words.map((w) => (
                        <WordCard key={w.pool_id} word={w} lang={lang} t={t} flat status={w.status} ramp={w.ramp}
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
                    <p className="muted" style={{ margin: 0 }}>{ll.desc}</p>
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
                <input className="input" autoFocus value={prompt?.value || ""} placeholder={ll.namePh} maxLength={20}
                    onChange={(e) => setPrompt((p) => ({ ...p, value: e.target.value.slice(0, 20) }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitPrompt(); }} style={{ width: "100%" }} />
                <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }} disabled={busy || !(prompt?.value || "").trim()} onClick={submitPrompt}>
                    {busy ? <BtnSpinner /> : <Icon n="check" sm />} {ll.save}
                </button>
            </Modal>

            {/* генерация слов в набор: тема + уровень + количество (0–20) */}
            <Modal open={!!gen} onClose={() => { if (!genBusy) setGen(null); }} title={ll.genTitle} maxWidth={460}>
                {gen && (
                    <>
                        {/* тема по умолчанию = имя набора (в плейсхолдере: ввод нативно перезаписывает) */}
                        <input className="input" autoFocus value={gen.topic} placeholder={active?.name ? ll.genTopicTpl.replace("{n}", active.name) : ll.genTopicPh}
                            onChange={(e) => setGen((g) => ({ ...g, topic: e.target.value }))} style={{ width: "100%" }} />
                        <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>CEFR</div>
                        {/* уровни — чипы, множественный выбор; «Любой» = пустой выбор (взаимоисключающе) */}
                        <div className="chiprow" style={{ flexWrap: "wrap", gap: "var(--sp-2)" }}>
                            <button className={"fchip" + (gen.levels.length === 0 ? " is-on" : "")} onClick={() => setGen((g) => ({ ...g, levels: [] }))}>{ll.levelAny}</button>
                            {["A1", "A2", "B1", "B2", "C1", "C2"].map((lv) => (
                                <button key={lv} className={"fchip" + (gen.levels.includes(lv) ? " is-on" : "")}
                                    onClick={() => setGen((g) => ({ ...g, levels: g.levels.includes(lv) ? g.levels.filter((x) => x !== lv) : [...g.levels, lv] }))}>{lv}</button>
                            ))}
                        </div>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", margin: "var(--sp-3) 0 4px" }}>{ll.count}: <b style={{ color: "var(--ink)" }}>{gen.count}</b></div>
                        <input type="range" min="5" max="20" value={gen.count} style={{ width: "100%" }}
                            onChange={(e) => setGen((g) => ({ ...g, count: Number(e.target.value) }))} />
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-4)" }}
                            disabled={genBusy || gen.count < 5} onClick={doGenerate}>
                            {genBusy ? <BtnSpinner /> : <Icon n="sparkles" sm />} {genBusy ? ll.generating : ll.generate}
                        </button>
                    </>
                )}
            </Modal>

            {/* подтверждение удаления набора (модалка вместо системного confirm) */}
            <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={ll.del} maxWidth={400}>
                <p style={{ margin: "0 0 var(--sp-4)" }}>{ll.delConfirm}</p>
                <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-end" }}>
                    <button className="btn btn--ghost" onClick={() => setConfirmDel(null)}>{ll.cancel}</button>
                    <button className="btn btn--danger" onClick={() => delSet(confirmDel.id)}>
                        <Icon n="trash" sm /> {ll.del}
                    </button>
                </div>
            </Modal>

            {/* подтверждение сброса прогресса набора (рампа выученных слов → звуковое задание) */}
            <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={ll.resetRamp} maxWidth={400}>
                <p style={{ margin: "0 0 var(--sp-4)" }}>{ll.resetConfirm.replace("{n}", String(learned))}</p>
                <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-end" }}>
                    <button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>{ll.cancel}</button>
                    <button className="btn btn--accent" onClick={doReset}>
                        <Icon n="repeat" sm /> {ll.resetRamp}
                    </button>
                </div>
            </Modal>

            {/* импорт слов с фото: скрытый input (без capture → мобилка даёт выбор камера/галерея) + 2-фазная модалка */}
            <input ref={fileRef} type="file" accept="image/*"
                onChange={onPickFile} style={{ display: "none" }} />
            <Modal open={!!photo} onClose={() => { if (!photo?.busy) setPhoto(null); }} title={ll.imgTitle} maxWidth={460}>
                {photo && (photo.words === null ? (
                    /* фаза 1: превью фото + уточнение промта + «Распознать» */
                    <>
                        {photo.dataUrl && <img src={photo.dataUrl} alt="" className="ocr-preview" />}
                        <textarea className="input" rows={2} value={photo.hint} placeholder={ll.imgHintPh}
                            onChange={(e) => setPhoto((p) => ({ ...p, hint: e.target.value }))}
                            style={{ width: "100%", marginTop: "var(--sp-3)", resize: "none" }} />
                        {photo.error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{photo.error}</div>}
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                            disabled={photo.busy || !photo.dataUrl} onClick={runOcr}>
                            {photo.busy ? <BtnSpinner /> : <Icon n="camera" sm />} {photo.busy ? ll.imgBusy : ll.imgRun}
                        </button>
                    </>
                ) : (
                    /* фаза 2: правка распознанного списка + «Добавить N» */
                    <>
                        <div className="muted" style={{ fontSize: "var(--fs-13)", marginBottom: "var(--sp-2)" }}>{ll.imgReview}</div>
                        <div className="ocr-list">
                            {photo.words.map((w, i) => (
                                <div className="ocr-row" key={i}>
                                    <input className="input" value={w} placeholder={ll.namePh}
                                        onChange={(e) => setWord(i, e.target.value)} />
                                    <button className="ocr-del" aria-label="×" onClick={() => delWord(i)}><Icon n="x" sm /></button>
                                </div>
                            ))}
                        </div>
                        {photo.words.length < 20 && (
                            <button className="btn btn--ghost btn--sm" style={{ marginTop: "var(--sp-2)" }} onClick={addWord}>
                                <Icon n="plus" sm /> {ll.addWord}
                            </button>
                        )}
                        {photo.error && <div className="muted" style={{ color: "var(--danger)", marginTop: "var(--sp-2)" }}>{photo.error}</div>}
                        <button className="btn btn--accent btn--block" style={{ marginTop: "var(--sp-3)" }}
                            disabled={photo.busy || !photo.words.some((w) => w.trim())} onClick={doImport}>
                            {photo.busy ? <BtnSpinner /> : <Icon n="check" sm />}{" "}
                            {photo.busy ? ll.generating : ll.imgAdd.replace("{n}", String(photo.words.filter((w) => w.trim()).length))}
                        </button>
                    </>
                ))}
            </Modal>
        </div>
    );
}
