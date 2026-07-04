import { langGuard } from "../../interface/i18nGuard.js";

// Каноническое значение part_of_speech с бэкенда → ключ фронта (у прилагательного — "adj").
const KEY_OF = {
    noun: "noun", verb: "verb", adjective: "adj", adverb: "adverb", preposition: "preposition",
    conjunction: "conjunction", pronoun: "pronoun", determiner: "determiner",
    numeral: "numeral", interjection: "interjection", phrase: "phrase",
};
const CLS = {
    noun: "pos--noun", verb: "pos--verb", adj: "pos--adj", adverb: "pos--adv",
    preposition: "pos--prep", conjunction: "pos--conj", pronoun: "pos--pron",
    determiner: "pos--det", numeral: "pos--num", interjection: "pos--intj", phrase: "pos--phrase",
};

// Фолбэк для «грязных»/легаси значений. ВАЖНО: специфичные раньше общих (pronoun до noun,
// adverb до verb — иначе подстроки «noun» в «pronoun» и «verb» в «adverb» дают ложный матч),
// плюс границы слова \b на коротких англ. ключах.
const MAP = [
    { re: /(pronomen|pronoun|местоим|займен)/i,               cls: "pos--pron",   key: "pronoun" },
    { re: /(determinativ|determiner|артикл|определит)/i,      cls: "pos--det",    key: "determiner" },
    { re: /(adverb|нареч|присл)/i,                             cls: "pos--adv",    key: "adverb" },
    { re: /(preposisjon|preposition|предлог|прийм)/i,         cls: "pos--prep",   key: "preposition" },
    { re: /(konjunksjon|conjunction|союз|сполуч)/i,           cls: "pos--conj",   key: "conjunction" },
    { re: /(tallord|numeral|числит|числ)/i,                    cls: "pos--num",    key: "numeral" },
    { re: /(interjeksjon|interjection|междомет|виг)/i,        cls: "pos--intj",   key: "interjection" },
    { re: /(adjektiv|adjective|\badj\b|прил|прикм|przym|būdv)/i, cls: "pos--adj",  key: "adj" },
    { re: /(substantiv|\bnoun\b|сущ|ім\.|rzecz|dkt)/i,        cls: "pos--noun",   key: "noun" },
    { re: /(\bverb\b|глаг|дієсл|czas|veiks)/i,                 cls: "pos--verb",   key: "verb" },
    { re: /(phrase|uttrykk|фраза|setning|fraz)/i,             cls: "pos--phrase", key: "phrase" },
];

// Справочник частей речи: короткая подпись (чип), название, что означает, норвежский пример.
export const POS_INFO = {
    noun:         { short: "сущ.",    name: "Существительное", desc: "Предмет, существо, явление или понятие.", ex: "hund (собака), frihet (свобода)" },
    verb:         { short: "гл.",     name: "Глагол",          desc: "Действие или состояние.",                 ex: "å snakke (говорить), være (быть)" },
    adj:          { short: "прил.",   name: "Прилагательное",  desc: "Признак предмета (какой?).",              ex: "stor (большой), god (хороший)" },
    adverb:       { short: "нареч.",  name: "Наречие",         desc: "Как, где или когда происходит действие.", ex: "fort (быстро), her (здесь), alltid (всегда)" },
    preposition:  { short: "предл.",  name: "Предлог",         desc: "Связь слов: место, время, отношение.",    ex: "på (на), i (в), til (к)" },
    conjunction:  { short: "союз",    name: "Союз",            desc: "Соединяет слова и предложения.",          ex: "og (и), men (но), fordi (потому что)" },
    pronoun:      { short: "мест.",   name: "Местоимение",     desc: "Заменяет существительное.",               ex: "han (он), den (это/тот), seg (себя)" },
    determiner:   { short: "детерм.", name: "Детерминатив",    desc: "Определяет существительное: артикль, притяжательные, указательные.", ex: "denne (этот), min (мой), noen (некоторые)" },
    numeral:      { short: "числ.",   name: "Числительное",    desc: "Число или порядок.",                      ex: "tre (три), første (первый)" },
    interjection: { short: "межд.",   name: "Междометие",      desc: "Возглас, эмоция или оклик.",              ex: "hei (привет), au (ой), ja (да)" },
    phrase:       { short: "фраза",   name: "Устойчивое выражение", desc: "Несколько слов как единое выражение.", ex: "på grunn av (из-за)" },
    other:        { short: "проч.",   name: "Не определено",   desc: "Часть речи ещё не размечена.",            ex: "" },
};

// Порядок категорий для фильтра/справочника (без other — это «не размечено»).
export const POS_ORDER = ["noun", "verb", "adj", "adverb", "preposition", "conjunction", "pronoun", "determiner", "numeral", "interjection", "phrase"];

// Ключ части речи на бэкенде (для фильтра ?pos=): у прилагательного бэкенд ждёт "adjective".
export const posApiKey = (key) => (key === "adj" ? "adjective" : key);

// Возвращает { cls, key, raw }. Сначала точное каноническое значение (его пишет бэкенд),
// иначе — фолбэк по подстрокам для легаси/«грязных» значений.
export const posMeta = (pos) => {
    const raw = (pos || "").toString();
    const exact = KEY_OF[raw.trim().toLowerCase()];
    if (exact) return { cls: CLS[exact], key: exact, raw };
    for (const m of MAP) if (m.re.test(raw)) return { cls: m.cls, key: m.key, raw };
    return { cls: "pos--other", key: "other", raw };
};

// Служебные ключи forms (НЕ поверхностные формы): pos — метка части речи, gender — артикль.
// Держать в синхроне с бэком (fuzzy.py FORMS_META_KEYS) и со схемами форм.
export const FORMS_META_KEYS = ["pos", "gender"];

// Поверхностные формы слова: лемма + словоформы из forms (def_sg/indef_pl/present/past/…),
// без служебных (FORMS_META_KEYS). Для приёма ответа во «Вводе»: hunden/snakker засчитываем как слово.
export const wordForms = (lemma, forms) => {
    const out = lemma ? [lemma] : [];
    if (forms && typeof forms === "object") {
        for (const [k, v] of Object.entries(forms)) {
            if (FORMS_META_KEYS.includes(k)) continue;
            if (typeof v === "string" && v.trim()) out.push(v.trim());
        }
    }
    return out;
};

// Приставка перед словом на чипе: артикль (en/ei/et) у сущ. и «å» у глаголов.
// Управляется настройками (articles / verbAa). posKey — нормализованный ключ из posMeta.
export const chipPrefix = (posKey, forms, { articles = true, verbAa = true } = {}) => {
    if (posKey === "noun" && forms?.gender) return articles ? forms.gender : "";
    if (posKey === "verb") return verbAa ? "å" : "";
    return "";
};

// Локализованные подписи парадигмы форм (по языку UI), с en-фолбэком. Ключи стабильны и
// привязаны к строению posFormsRows — добавление формы = добавление ключа во ВСЕ языки.
export const FORM_ROW_LABELS = langGuard({
    ru:  { sg: "ед. число", sg_def: "«этот …»", pl: "мн. число", pl_def: "«эти …»", inf: "начальная (å)", present: "настоящее", past: "прошедшее", perfect: "с har (уже)", positive: "базовая", neuter: "для et-слов", comparative: "«более …»", superlative: "«самый …»", subj: "подлежащее", objc: "дополнение", none: "нет формы" },
    en:  { sg: "singular", sg_def: "“this …”", pl: "plural", pl_def: "“these …”", inf: "base (å)", present: "present", past: "past", perfect: "with har", positive: "base form", neuter: "for et-words", comparative: "“more …”", superlative: "“most …”", subj: "subject", objc: "object", none: "no such form" },
    ukr: { sg: "однина", sg_def: "«цей …»", pl: "множина", pl_def: "«ці …»", inf: "початкова (å)", present: "теперішній", past: "минулий", perfect: "з har (вже)", positive: "базова", neuter: "для et-слів", comparative: "«більш …»", superlative: "«най…»", subj: "підмет", objc: "додаток", none: "немає форми" },
    pl:  { sg: "l. pojedyncza", sg_def: "„ten …”", pl: "l. mnoga", pl_def: "„te …”", inf: "podstawowa (å)", present: "teraźniejszy", past: "przeszły", perfect: "z har (już)", positive: "podstawowa", neuter: "dla słów z et", comparative: "„bardziej …”", superlative: "„naj…”", subj: "podmiot", objc: "dopełnienie", none: "brak formy" },
    lt:  { sg: "vienaskaita", sg_def: "„tas …“", pl: "daugiskaita", pl_def: "„tie …“", inf: "pradinė (å)", present: "esamasis", past: "būtasis", perfect: "su har (jau)", positive: "pagrindinė", neuter: "et-žodžiams", comparative: "„labiau …“", superlative: "„pats …“", subj: "veiksnys", objc: "papildinys", none: "formos nėra" },
    lv:  { sg: "vienskaitlis", sg_def: "“tas …”", pl: "daudzskaitlis", pl_def: "“tie …”", inf: "pamatforma (å)", present: "tagadne", past: "pagātne", perfect: "ar har (jau)", positive: "pamata", neuter: "et-vārdiem", comparative: "“vairāk …”", superlative: "“vis…”", subj: "priekšmets", objc: "papildinātājs", none: "formas nav" },
    ar:  { sg: "مفرد", sg_def: "«هذا …»", pl: "جمع", pl_def: "«هذه …»", inf: "المصدر (å)", present: "مضارع", past: "ماضٍ", perfect: "مع har", positive: "أساسية", neuter: "مع كلمات et", comparative: "«أكثر …»", superlative: "«الأكثر …»", subj: "فاعل", objc: "مفعول", none: "لا توجد صيغة" },
}, "pos.FORM_ROW_LABELS");

// Полный набор грамматических форм слова → [{label, value}] для подробного показа.
// word — само норвежское слово (нужно для неопр. формы ед.ч. сущ. и инфинитива гл.).
// lang — язык UI для подписей форм (en-фолбэк). Существующие вызовы без lang → en.
export const posFormsRows = (word, forms, lang = "en") => {
    if (!forms) return [];
    const L = FORM_ROW_LABELS[lang] || FORM_ROW_LABELS.en;
    const r = [];
    // key — стабильный ключ строки (для подсветки целевой формы на карточках трека форм).
    // «n/a» и подобные маркеры из автозаполнения = «формы не существует» → человеческое
    // «нет формы» на языке юзера (none:true — потребитель может приглушить строку).
    const JUNK = new Set(["n/a", "na", "-", "–", "—", "none", "null", "ingen"]);
    const add = (key, label, value) => {
        if (!value) return;
        if (JUNK.has(String(value).trim().toLowerCase())) { r.push({ key, label, value: L.none, none: true }); return; }
        r.push({ key, label, value });
    };
    if (forms.pos === "noun") {
        // ei-слово валидно и как общего рода (реформа 2005) — учим «ei/en klokke»
        const g = forms.gender === "ei" ? "ei/en" : forms.gender;
        add("sg", L.sg, [g, word].filter(Boolean).join(" "));
        add("sg_def", L.sg_def, forms.def_sg);
        add("pl", L.pl, forms.indef_pl);
        add("pl_def", L.pl_def, forms.def_pl);
    } else if (forms.pos === "verb") {
        add("inf", L.inf, `å ${word}`);
        add("present", L.present, forms.present);
        add("past", L.past, forms.past);
        add("perfect", L.perfect, forms.perfect);
    } else if (forms.pos === "adjective") {
        add("positive", L.positive, word);
        add("neuter", L.neuter, forms.neuter);
        add("pl", L.pl, forms.plural);
        add("comparative", L.comparative, forms.comparative);
        add("superlative", L.superlative, forms.superlative);
    } else if (forms.pos === "pronoun") {
        // курируемая парадигма: личные (obj — объектный падеж) и притяжательные (ср. род / мн.)
        if (forms.obj) {
            add("subj", L.subj, word);          // подлежащее: jeg
            add("objc", L.objc, forms.obj);     // дополнение: meg
        } else {
            add("positive", L.positive, word);  // базовая (общий род): min
            add("neuter", L.neuter, forms.neuter);  // ср. род: mitt
            add("pl", L.pl, forms.plural);      // мн.: mine
        }
    }
    return r;
};

// Компактная парадигма одной строкой: только значения форм через « · »
// (напр. «en bil · bilen · biler · bilene»). Для тесных мест — флешкарты.
// Переиспользует posFormsRows, чтобы порядок/состав форм был единым. (Подписи тут не выводятся,
// поэтому lang не обязателен — но прокидываем для единообразия, когда вызывают со значением.)
export const posFormsLine = (word, forms, lang = "en") =>
    posFormsRows(word, forms, lang).map((row) => row.value).join(" · ");

// Локализованная короткая метка части речи.
export const posLabel = (pos, t) => {
    const { key, raw } = posMeta(pos);
    return t?.pos?.[key] || POS_INFO[key]?.short || (key === "other" ? (raw ? raw.slice(0, 8) : "") : key);
};

// Полная (несокращённая) метка части речи — для мест, где хватает места (модалки).
export const posLabelFull = (pos, t) => {
    const { key } = posMeta(pos);
    if (key === "other") return "";
    return t?.posFull?.[key] || POS_INFO[key]?.name || posLabel(pos, t);
};

export default posMeta;
