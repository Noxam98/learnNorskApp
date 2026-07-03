// Локальная i18n компонента MyPage — только данные переводов (langGuard-страж и паритет сохранены).
import { langGuard } from "../interface/i18nGuard.js";

// Авто-скрытие панелей навигации — подписи (локальная карта, тоггл только на смартфоне).
export const AH = langGuard({
    ru:  { t: "Автоскрытие панелей", d: "Панели навигации прячутся за край после паузы — больше места; грип возвращает." },
    en:  { t: "Auto-hide nav bars", d: "Navigation bars slide off after a pause for more space; a grip brings them back." },
    ukr: { t: "Автоприховування панелей", d: "Панелі навігації ховаються за край після паузи — більше місця; грип повертає." },
    pl:  { t: "Auto-ukrywanie pasków", d: "Paski nawigacji chowają się po chwili — więcej miejsca; uchwyt je przywraca." },
    lt:  { t: "Auto slėpti juostas", d: "Navigacijos juostos pasislepia po pauzės — daugiau vietos; rankenėlė grąžina." },
    lv:  { t: "Auto paslēpt joslas", d: "Navigācijas joslas paslēpjas pēc pauzes — vairāk vietas; rokturis tās atgriež." },
    ar:  { t: "إخفاء أشرطة التنقل تلقائيًا", d: "تنزلق أشرطة التنقل بعد توقف مؤقت لمساحة أكبر؛ المقبض يعيدها." },
}, "MyPage.AH");

// Порция новых слов за сессию (gamePrefs.newPerSession) — подписи слайдера.
export const NPS = langGuard({
    ru:  { t: "Новых слов за раз", d: "Сколько новых слов вводить за одну сессию — остальное добивается заданиями уже начатых." },
    en:  { t: "New words per session", d: "How many new words to introduce in one session — the rest are exercises on started words." },
    ukr: { t: "Нових слів за раз", d: "Скільки нових слів вводити за одну сесію — решта це вправи з уже початих." },
    pl:  { t: "Nowych słów na sesję", d: "Ile nowych słów wprowadzać w jednej sesji — reszta to ćwiczenia na rozpoczętych." },
    lt:  { t: "Naujų žodžių per sesiją", d: "Kiek naujų žodžių pateikti per vieną sesiją — likusi dalis – jau pradėtų pratimai." },
    lv:  { t: "Jauni vārdi sesijā", d: "Cik jaunu vārdu ieviest vienā sesijā — pārējais ir jau iesāktu vārdu vingrinājumi." },
    ar:  { t: "كلمات جديدة لكل جلسة", d: "كم كلمة جديدة تُقدَّم في الجلسة الواحدة — والبقية تمارين على كلمات بدأتها." },
}, "MyPage.NPS");

// Порог слуховой партии (gamePrefs.listenPack) — подписи слайдера. {n} = текущее значение.
export const LPK = langGuard({
    ru:  { t: "Порог слуховой партии: {n} слов", d: "Слова учатся текстом, а на слух подтверждаются отдельной партией по {n} слов." },
    en:  { t: "Listening batch size: {n} words", d: "Words are learned by text, then confirmed by ear in a separate batch of {n}." },
    ukr: { t: "Поріг слухової партії: {n} слів", d: "Слова вчаться текстом, а на слух підтверджуються окремою партією по {n} слів." },
    pl:  { t: "Próg partii słuchowej: {n} słów", d: "Słowa uczy się tekstem, a ze słuchu potwierdza osobną partią po {n} słów." },
    lt:  { t: "Klausymo partijos riba: {n} žodžių", d: "Žodžiai mokomi tekstu, o iš klausos patvirtinami atskira {n} žodžių partija." },
    lv:  { t: "Klausīšanās partijas slieksnis: {n} vārdi", d: "Vārdus mācās ar tekstu, bet pēc dzirdes apstiprina atsevišķā {n} vārdu partijā." },
    ar:  { t: "حجم دفعة الاستماع: {n} كلمة", d: "تُتعلَّم الكلمات بالنص، ثم تُؤكَّد سماعيًا في دفعة منفصلة من {n}." },
}, "MyPage.LPK");

// Грамматические упражнения в сессии (gamePrefs.grammar, дефолт вкл.) — тумблер.
export const GRM = langGuard({
    ru:  { t: "Грамматика (род, формы)", d: "Добавлять упражнения на грамматику к выученным словам: род существительного и множественное число." },
    en:  { t: "Grammar (gender, forms)", d: "Add grammar exercises on learned words: noun gender and plural forms." },
    ukr: { t: "Граматика (рід, форми)", d: "Додавати граматичні вправи до вивчених слів: рід іменника та множина." },
    pl:  { t: "Gramatyka (rodzaj, formy)", d: "Dodawaj ćwiczenia gramatyczne do nauczonych słów: rodzaj rzeczownika i liczbę mnogą." },
    lt:  { t: "Gramatika (giminė, formos)", d: "Pridėti gramatikos pratimus prie išmoktų žodžių: daiktavardžio giminę ir daugiskaitą." },
    lv:  { t: "Gramatika (dzimte, formas)", d: "Pievienot gramatikas vingrinājumus apgūtajiem vārdiem: lietvārda dzimti un daudzskaitli." },
    ar:  { t: "القواعد (الجنس، الصيغ)", d: "أضف تمارين قواعد على الكلمات المتعلَّمة: جنس الاسم وصيغة الجمع." },
}, "MyPage.GRM");

// Статистика трека ФОРМ внутри грамм-карточки: клеток в работе / отработано / к повторению.
export const FRM = langGuard({
    ru:  { cells: "форм в работе", done: "отработано", due: "к повторению" },
    en:  { cells: "forms in progress", done: "mastered", due: "due now" },
    ukr: { cells: "форм у роботі", done: "відпрацьовано", due: "до повторення" },
    pl:  { cells: "form w toku", done: "opanowane", due: "do powtórki" },
    lt:  { cells: "formų mokomasi", done: "įsisavinta", due: "kartoti dabar" },
    lv:  { cells: "formas apgūšanā", done: "apgūtas", due: "jāatkārto" },
    ar:  { cells: "صيغ قيد التعلم", done: "مُتقنة", due: "للمراجعة الآن" },
}, "MyPage.FRM");

// Пер-POS тумблеры грамматики (gamePrefs.grammarPos): какие части речи дриллить.
export const GRM_POS = langGuard({
    ru:  { noun: "Сущ.", verb: "Глаг.", adjective: "Прил.", pronoun: "Местоим." },
    en:  { noun: "Nouns", verb: "Verbs", adjective: "Adjectives", pronoun: "Pronouns" },
    ukr: { noun: "Ім.", verb: "Дієсл.", adjective: "Прикм.", pronoun: "Займ." },
    pl:  { noun: "Rzecz.", verb: "Czas.", adjective: "Przym.", pronoun: "Zaim." },
    lt:  { noun: "Daikt.", verb: "Veiksm.", adjective: "Būdv.", pronoun: "Įvardž." },
    lv:  { noun: "Lietv.", verb: "Darb.", adjective: "Īpaš.", pronoun: "Vietn." },
    ar:  { noun: "أسماء", verb: "أفعال", adjective: "صفات", pronoun: "ضمائر" },
}, "MyPage.GRM_POS");

// Источники данных — атрибуция открытых лицензий (CC BY и т.п.); названия не переводятся.
export const SRC = langGuard({
    ru:  { t: "Источники данных", d: "Формы и род — Norsk ordbank (Språkbanken, CC BY 4.0) и Bokmålsordboka (UiB / Språkrådet); переводы и примеры — LEXIN (OsloMet / HK-dir); калибровка уровней — Kelly-list (UiO)." },
    en:  { t: "Data sources", d: "Forms and gender — Norsk ordbank (Språkbanken, CC BY 4.0) and Bokmålsordboka (UiB / Språkrådet); translations and examples — LEXIN (OsloMet / HK-dir); level calibration — Kelly list (UiO)." },
    ukr: { t: "Джерела даних", d: "Форми та рід — Norsk ordbank (Språkbanken, CC BY 4.0) і Bokmålsordboka (UiB / Språkrådet); переклади та приклади — LEXIN (OsloMet / HK-dir); калібрування рівнів — Kelly-list (UiO)." },
    pl:  { t: "Źródła danych", d: "Formy i rodzaj — Norsk ordbank (Språkbanken, CC BY 4.0) i Bokmålsordboka (UiB / Språkrådet); tłumaczenia i przykłady — LEXIN (OsloMet / HK-dir); kalibracja poziomów — Kelly-list (UiO)." },
    lt:  { t: "Duomenų šaltiniai", d: "Formos ir giminė — Norsk ordbank (Språkbanken, CC BY 4.0) ir Bokmålsordboka (UiB / Språkrådet); vertimai ir pavyzdžiai — LEXIN (OsloMet / HK-dir); lygių kalibravimas — Kelly-list (UiO)." },
    lv:  { t: "Datu avoti", d: "Formas un dzimte — Norsk ordbank (Språkbanken, CC BY 4.0) un Bokmålsordboka (UiB / Språkrådet); tulkojumi un piemēri — LEXIN (OsloMet / HK-dir); līmeņu kalibrēšana — Kelly-list (UiO)." },
    ar:  { t: "مصادر البيانات", d: "الصيغ والجنس — Norsk ordbank (Språkbanken, CC BY 4.0) وBokmålsordboka (UiB / Språkrådet)؛ الترجمات والأمثلة — LEXIN (OsloMet / HK-dir)؛ معايرة المستويات — Kelly-list (UiO)." },
}, "MyPage.SRC");
