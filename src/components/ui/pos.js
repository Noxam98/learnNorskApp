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

// Артикль существительного (en/ei/et) для подстановки перед словом в карточке. "" если не сущ.
export const nounArticle = (forms) =>
    (forms && forms.pos === "noun" && forms.gender) ? forms.gender : "";

// Поверхностные формы слова: лемма + словоформы из forms (def_sg/indef_pl/present/past/…),
// без служебных pos/gender. Для приёма ответа во «Вводе»: hunden/snakker засчитываем как слово.
export const wordForms = (lemma, forms) => {
    const out = lemma ? [lemma] : [];
    if (forms && typeof forms === "object") {
        for (const [k, v] of Object.entries(forms)) {
            if (k === "pos" || k === "gender") continue;
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

// Полный набор грамматических форм слова → [{label, value}] для подробного показа.
// word — само норвежское слово (нужно для неопр. формы ед.ч. сущ. и инфинитива гл.).
export const posFormsRows = (word, forms) => {
    if (!forms) return [];
    const r = [];
    const add = (label, value) => { if (value) r.push({ label, value }); };
    if (forms.pos === "noun") {
        add("ед. ч.", [forms.gender, word].filter(Boolean).join(" "));
        add("ед. ч. (определ.)", forms.def_sg);
        add("мн. ч.", forms.indef_pl);
        add("мн. ч. (определ.)", forms.def_pl);
    } else if (forms.pos === "verb") {
        add("инфинитив", `å ${word}`);
        add("настоящее", forms.present);
        add("прош. время", forms.past);
        add("перфект", forms.perfect);
    } else if (forms.pos === "adjective") {
        add("положит.", word);
        add("ср. род", forms.neuter);
        add("мн. ч.", forms.plural);
        add("сравнит.", forms.comparative);
        add("превосх.", forms.superlative);
    }
    return r;
};

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
