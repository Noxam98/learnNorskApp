// @ts-check
// Общие утилиты и презентационные части для игр (Ввод/Выбор/Изучение).
// Игровая ЛОГИКА живёт в своих файлах (InputGame.jsx, ChoiceGame.jsx, StudyGame.jsx),
// здесь только переиспользуемая «обвязка».
import { useEffect, useState, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "../ui/BrandMark.jsx";
import { posMeta, chipPrefix, posLabel } from "../ui/pos.js";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { useSystemStore } from "../../store/systemStore.jsx";
import { playSound } from "../tools/sound.js";
import { langGuard } from "../../interface/i18nGuard.js";

// Блокировка скролла фона на время полноэкранной активности (игра/карточки/экзамен).
// Ref-counted: при наложении маунтов (переход между шагами) не «протекает» — фон
// разблокируется ТОЛЬКО когда отпущен последний замок, и восстанавливается ИСХОДНОЕ значение.
let _lockN = 0;
let _prevLock = null;
export function useScrollLock() {
    useEffect(() => {
        if (_lockN++ === 0) {
            const b = document.body, h = document.documentElement;
            _prevLock = { bo: b.style.overflow, ho: h.style.overflow, ob: b.style.overscrollBehavior };
            b.style.overflow = "hidden"; h.style.overflow = "hidden"; b.style.overscrollBehavior = "none";
        }
        return () => {
            if (--_lockN <= 0) {
                _lockN = 0;
                if (_prevLock) {
                    const b = document.body, h = document.documentElement;
                    b.style.overflow = _prevLock.bo; h.style.overflow = _prevLock.ho; b.style.overscrollBehavior = _prevLock.ob;
                    _prevLock = null;
                }
            }
        };
    }, []);
}

// Норвежское слово с приставкой по настройкам: артикль (en/ei/et) у сущ., «å» у глаг. Иначе — как есть.
// Применять там, где слово ВЫВОДИТСЯ для чтения (вопрос/карточка/раскрытый ответ), а не в вариантах
// выбора (там приставка выдала бы верный вариант) и не в строке ввода (артикль не печатают).
export const noWithPrefix = (no, word, { articles = true, verbAa = true } = {}) => {
    const pfx = chipPrefix(posMeta(word?.part_of_speech).key, word?.forms, { articles, verbAa });
    return pfx ? `${pfx} ${no}` : no;
};

export { ENDONYM } from "../../interface/languages.js";   // самоназвания языков — из единого реестра

// Честный «Не знаю» в заданиях: подсветит верный ответ, но засчитает как НЕ угадано.
export const DUNNO = langGuard({ ru: "Не знаю", ukr: "Не знаю", en: "I don't know", pl: "Nie wiem", lt: "Nežinau", lv: "Nezinu", ar: "لا أعرف" }, "gameShared.DUNNO");

// Грамм-упражнения (overlay поверх выученных слов): вопрос о форме слова. Подпись запрашиваемой
// формы по prompt.formLabel — коротко, по языку UI. Расширяется добавлением ключа формы.
export const FORM_LABEL = langGuard({
    ru: { gender: "en, ei или et?", indef_pl: "Множественное число?", def_sg: "Форма «этот …»?", def_pl: "Форма «эти …»?", present: "Настоящее время?", past: "Прошедшее время?", perfect: "Форма с har?", neuter: "Форма для et-слов?", comparative: "Форма «более …»?", superlative: "Форма «самый …»?", plural_adj: "Форма для многих?", objcase: "Форма «меня/ему»?", poss_neuter: "«Моё» — с et-словом?", poss_plural: "«Мои» — для многих?" },
    en: { gender: "en, ei or et?", indef_pl: "Plural?", def_sg: "The “this …” form?", def_pl: "The “these …” form?", present: "Present tense?", past: "Past tense?", perfect: "The har-form?", neuter: "Form for et-words?", comparative: "The “more …” form?", superlative: "The “most …” form?", plural_adj: "Form for many?", objcase: "The “me/him” form?", poss_neuter: "“My” with an et-word?", poss_plural: "“My” for many?" },
    ukr: { gender: "en, ei чи et?", indef_pl: "Множина?", def_sg: "Форма «цей …»?", def_pl: "Форма «ці …»?", present: "Теперішній час?", past: "Минулий час?", perfect: "Форма з har?", neuter: "Форма для et-слів?", comparative: "Форма «більш …»?", superlative: "Форма «най…»?", plural_adj: "Форма для багатьох?", objcase: "Форма «мене/йому»?", poss_neuter: "«Моє» — з et-словом?", poss_plural: "«Мої» — для багатьох?" },
    pl: { gender: "en, ei czy et?", indef_pl: "Liczba mnoga?", def_sg: "Forma „ten …”?", def_pl: "Forma „te …”?", present: "Czas teraźniejszy?", past: "Czas przeszły?", perfect: "Forma z har?", neuter: "Forma dla słów z et?", comparative: "Forma „bardziej …”?", superlative: "Forma „naj…”?", plural_adj: "Forma dla wielu?", objcase: "Forma „mnie/jemu”?", poss_neuter: "„Moje” przy et-słowie?", poss_plural: "„Moje” dla wielu?" },
    lt: { gender: "en, ei ar et?", indef_pl: "Daugiskaita?", def_sg: "Forma „tas …“?", def_pl: "Forma „tie …“?", present: "Esamasis laikas?", past: "Būtasis laikas?", perfect: "Forma su har?", neuter: "Forma et-žodžiams?", comparative: "Forma „labiau …“?", superlative: "Forma „pats …“?", plural_adj: "Forma daugeliui?", objcase: "Forma „mane/jam“?", poss_neuter: "„Mano“ su et-žodžiu?", poss_plural: "„Mano“ daugeliui?" },
    lv: { gender: "en, ei vai et?", indef_pl: "Daudzskaitlis?", def_sg: "Forma “tas …”?", def_pl: "Forma “tie …”?", present: "Tagadne?", past: "Pagātne?", perfect: "Forma ar har?", neuter: "Forma et-vārdiem?", comparative: "Forma “vairāk …”?", superlative: "Forma “vis…”?", plural_adj: "Forma daudziem?", objcase: "Forma “mani/viņam”?", poss_neuter: "“Mans” ar et-vārdu?", poss_plural: "“Mani” daudziem?" },
    ar: { gender: "en أم ei أم et؟", indef_pl: "الجمع؟", def_sg: "صيغة «هذا …»؟", def_pl: "صيغة «هذه …»؟", present: "المضارع؟", past: "الماضي؟", perfect: "الصيغة مع har؟", neuter: "الصيغة مع كلمات et؟", comparative: "صيغة «أكثر …»؟", superlative: "صيغة «الأكثر …»؟", plural_adj: "صيغة الجمع؟", objcase: "صيغة «ني/له»؟", poss_neuter: "«ملكي» مع كلمة et؟", poss_plural: "«ملكي» للجمع؟" },
}, "gameShared.FORM_LABEL");

// Доходчивое объяснение КАЖДОЙ формы (трек форм): что это и когда употребляется, с мини-примером.
// Ключ = клетка формы (gw.step). Показывается на карточке формы (под целевой строкой парадигмы)
// и под вопросом в выборе/вводе — объясняет форму, НЕ подсказывая ответ.
export const FORM_EXPLAIN = langGuard({
    ru: {
        gender: "Какой артикль у слова — en, ei или et? Правила нет: артикль просто запоминают вместе со словом.",
        indef_pl: "Несколько предметов: biler — машины.",
        def_sg: "«Этот, конкретный» — артикль переезжает в конец слова: bilen — эта машина.",
        def_pl: "«Эти, конкретные»: bilene — эти машины.",
        present: "Происходит сейчас или регулярно: jeg går — я иду / хожу.",
        past: "Было и закончилось: i går gikk jeg — вчера я шёл.",
        perfect: "Уже сделано, важен итог — с har: jeg har gått — я уже сходил.",
        neuter: "Когда описываешь et-слово: et stort hus — большой дом.",
        plural: "Когда предметов несколько: store hus — большие дома.",
        comparative: "Сравнение, «более …»: større — больше (по размеру).",
        superlative: "«Самый …»: størst — самый большой.",
    },
    en: {
        gender: "Which article the word takes — en, ei or et? There is no rule: just memorize the article with the word.",
        indef_pl: "Several things: biler — cars.",
        def_sg: "“This specific one” — the article moves to the end of the word: bilen — the car.",
        def_pl: "“These specific ones”: bilene — the cars.",
        present: "Happening now or regularly: jeg går — I walk / am walking.",
        past: "Finished in the past: i går gikk jeg — yesterday I walked.",
        perfect: "Already done, the result matters — with har: jeg har gått — I have walked.",
        neuter: "When describing an et-word: et stort hus — a big house.",
        plural: "When there are several: store hus — big houses.",
        comparative: "Comparison, “more …”: større — bigger.",
        superlative: "“The most …”: størst — the biggest.",
    },
    ukr: {
        gender: "Який артикль у слова — en, ei чи et? Правила немає: артикль просто запам'ятовують разом зі словом.",
        indef_pl: "Кілька предметів: biler — машини.",
        def_sg: "«Цей, конкретний» — артикль переїжджає в кінець слова: bilen — ця машина.",
        def_pl: "«Ці, конкретні»: bilene — ці машини.",
        present: "Відбувається зараз або регулярно: jeg går — я йду / ходжу.",
        past: "Було й закінчилося: i går gikk jeg — учора я йшов.",
        perfect: "Вже зроблено, важливий підсумок — з har: jeg har gått — я вже сходив.",
        neuter: "Коли описуєш et-слово: et stort hus — великий будинок.",
        plural: "Коли предметів кілька: store hus — великі будинки.",
        comparative: "Порівняння, «більш …»: større — більший.",
        superlative: "«Най…»: størst — найбільший.",
    },
    pl: {
        gender: "Jaki rodzajnik ma słowo — en, ei czy et? Nie ma reguły: rodzajnik zapamiętuje się razem ze słowem.",
        indef_pl: "Kilka rzeczy: biler — samochody.",
        def_sg: "„Ten konkretny” — rodzajnik przenosi się na koniec słowa: bilen — ten samochód.",
        def_pl: "„Te konkretne”: bilene — te samochody.",
        present: "Dzieje się teraz lub regularnie: jeg går — idę / chodzę.",
        past: "Było i minęło: i går gikk jeg — wczoraj szedłem.",
        perfect: "Już zrobione, liczy się rezultat — z har: jeg har gått — już poszedłem.",
        neuter: "Gdy opisujesz słowo z et: et stort hus — duży dom.",
        plural: "Gdy rzeczy jest kilka: store hus — duże domy.",
        comparative: "Porównanie, „bardziej …”: større — większy.",
        superlative: "„Naj…”: størst — największy.",
    },
    lt: {
        gender: "Koks žodžio artikelis — en, ei ar et? Taisyklės nėra: artikelį tiesiog įsimink kartu su žodžiu.",
        indef_pl: "Keli daiktai: biler — automobiliai.",
        def_sg: "„Tas konkretus“ — artikelis persikelia į žodžio galą: bilen — tas automobilis.",
        def_pl: "„Tie konkretūs“: bilene — tie automobiliai.",
        present: "Vyksta dabar arba reguliariai: jeg går — einu / vaikštau.",
        past: "Buvo ir baigėsi: i går gikk jeg — vakar ėjau.",
        perfect: "Jau padaryta, svarbus rezultatas — su har: jeg har gått — jau nuėjau.",
        neuter: "Kai apibūdini et-žodį: et stort hus — didelis namas.",
        plural: "Kai daiktų keli: store hus — dideli namai.",
        comparative: "Palyginimas, „labiau …“: større — didesnis.",
        superlative: "„Pats …“: størst — didžiausias.",
    },
    lv: {
        gender: "Kāds vārdam artikuls — en, ei vai et? Likuma nav: artikulu vienkārši iegaumē kopā ar vārdu.",
        indef_pl: "Vairākas lietas: biler — mašīnas.",
        def_sg: "„Tā konkrētā” — artikuls pārceļas uz vārda beigām: bilen — tā mašīna.",
        def_pl: "„Tās konkrētās”: bilene — tās mašīnas.",
        present: "Notiek tagad vai regulāri: jeg går — es eju / staigāju.",
        past: "Bija un beidzās: i går gikk jeg — vakar es gāju.",
        perfect: "Jau izdarīts, svarīgs rezultāts — ar har: jeg har gått — es jau aizgāju.",
        neuter: "Kad apraksti et-vārdu: et stort hus — liela māja.",
        plural: "Kad lietas ir vairākas: store hus — lielas mājas.",
        comparative: "Salīdzinājums, „vairāk …”: større — lielāks.",
        superlative: "„Vis…”: størst — vislielākais.",
    },
    ar: {
        gender: "ما أداة الكلمة — en أم ei أم et؟ لا توجد قاعدة: احفظ الأداة مع الكلمة.",
        indef_pl: "عدة أشياء، بدون «الـ»: biler — سيارات.",
        def_sg: "الشيء «المحدد» — تلتصق الأداة بنهاية الكلمة: bilen — السيارة.",
        def_pl: "الأشياء «المحددة»: bilene — السيارات.",
        present: "يحدث الآن أو باستمرار: jeg går — أمشي.",
        past: "حدث وانتهى: i går gikk jeg — أمس مشيت.",
        perfect: "أُنجز بالفعل والمهم النتيجة — مع har: jeg har gått — لقد مشيت.",
        neuter: "عند وصف كلمة et: et stort hus — بيت كبير.",
        plural: "عندما تكون الأشياء عدة: store hus — بيوت كبيرة.",
        comparative: "مقارنة، «أكثر …»: større — أكبر.",
        superlative: "«الأكثر …»: størst — الأكبر.",
    },
}, "gameShared.FORM_EXPLAIN");

// Подписи откликов прохождения рампы (RampCheer): ступень/выучено/защищено/форма сдана.
export const MASTERY = langGuard({
    ru:  { step: "ступень", stepDown: "ступень ниже", mastered: "Слово выучено!", masteredPhrase: "Фраза выучена!", protectedW: "Защищено", formDone: "Форма сдана" },
    en:  { step: "step", stepDown: "step down", mastered: "Word mastered!", masteredPhrase: "Phrase mastered!", protectedW: "Protected", formDone: "Form done" },
    ukr: { step: "сходинка", stepDown: "сходинка нижче", mastered: "Слово вивчено!", masteredPhrase: "Фразу вивчено!", protectedW: "Захищено", formDone: "Форму складено" },
    pl:  { step: "etap", stepDown: "etap niżej", mastered: "Słowo opanowane!", masteredPhrase: "Wyrażenie opanowane!", protectedW: "Ochronione", formDone: "Forma zaliczona" },
    lt:  { step: "pakopa", stepDown: "pakopa žemyn", mastered: "Žodis išmoktas!", masteredPhrase: "Frazė išmokta!", protectedW: "Apsaugota", formDone: "Forma įveikta" },
    lv:  { step: "pakāpe", stepDown: "pakāpe zemāk", mastered: "Vārds apgūts!", masteredPhrase: "Frāze apgūta!", protectedW: "Aizsargāts", formDone: "Forma nokārtota" },
    ar:  { step: "درجة", stepDown: "درجة أدنى", mastered: "أُتقنت الكلمة!", masteredPhrase: "أُتقنت العبارة!", protectedW: "محمي", formDone: "أُنجزت الصيغة" },
}, "gameShared.MASTERY");

// Стрелка ПЕРЕХОДА между ступенями: дуга-«прыжок» над той парой пипсов, между которыми переход
// произошёл, и в его направлении (вперёд — вправо, откат — влево, зеркалим scaleX). Прямые стрелки
// спрайта тут не годятся: дуга читается именно как перескок с точки на точку, а не как «вниз/вправо».
// lo/hi — индексы пипсов (1..4); горизонталь считает CSS из ширины пипса и зазора, чтобы геометрия
// жила в одном месте (см. .rampcheer__arrow).
const RampArrow = ({ lo, hi, back = false }) => {
    const a = Math.min(4, Math.max(1, lo));
    const b = Math.min(4, Math.max(1, hi));
    return (
        <span className={"rampcheer__arrow" + (back ? " is-back" : "")} aria-hidden="true"
            style={/** @type {any} */ ({ "--lo": Math.min(a, b), "--hi": Math.max(a, b) })}>
            <svg viewBox="0 0 24 15" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.2 12.4C5.4 3.6 18.6 3.6 20.8 12.4" />
                <path d="M18.4 9.8 L20.8 13 L23.2 10.4" />
            </svg>
        </span>
    );
};

// Отклик прохождения ступени рампы при ВЕРНОМ ответе (рендерится в состоянии CORRECT):
//  • финальный ввод слова впервые → праздник «Слово выучено!» (золото, разлёт частиц, фанфара);
//  • финальный ввод на повторе → сдержанное «Защищено»;
//  • ввод формы (produce трека форм) → «Форма сдана ✓»;
//  • иначе — пипсы высоты рампы «ступень N/4» (в унисон с ростом тона звука «верно»).
export const RampCheer = ({ word, rank = 0, repeat = false, gmode = "", firstTry = true, typo = false }) => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const soundOn = useSystemStore((s) => s.soundOn);
    const m = MASTERY[lang] || MASTERY.en;
    const form = !!word?.form_track;
    const formDone = form && word?.stage === "produce";
    const finalInput = !form && gmode === "input" && word?.step === "input_int2no";
    // «выучено»/«Защищено» — ТОЛЬКО за прохождение с ПЕРВОЙ попытки (firstTry): ответ не с первого
    // раза (ошибка → ретрай) слово не выпускает/не защищает (SRS пишет первую попытку). «Защищено»
    // ещё и только чисто (не опечатка): опечатка на повторе — отдельный итог «с опечаткой», не щит.
    const mastered = finalInput && !repeat && firstTry;
    const shield = finalInput && repeat && firstTry && !typo;
    useEffect(() => {
        if (mastered && soundOn) playSound("mastered");   // фанфара — только за первое «выучено»
    }, []); // eslint-disable-line
    if (mastered || shield || formDone) {
        return (
            <div className={`rampcheer rampcheer--big${mastered ? " rampcheer--gold" : ""}`}>
                {mastered && <span className="mburst" aria-hidden="true">{Array.from({ length: 10 }).map((_, i) => <i key={i} />)}</span>}
                <Icon n={mastered ? "trophy" : formDone ? "check-circle" : "lock"} sm />
                <span>{mastered ? (word?.part_of_speech === "phrase" ? m.masteredPhrase : m.mastered) : formDone ? m.formDone : m.protectedW}</span>
            </div>
        );
    }
    if (finalInput) return null;   // финальный ввод БЕЗ выучено/защищено (опечатка / не с первой попытки) — без пипсов
    if (rank < 1 || rank > 4) return null;
    return (
        <div className="rampcheer" aria-hidden="true">
            <span className="rampcheer__pips">
                {/* переход rank-1 → rank: дуга вправо над этой парой точек (с 1-й ступени — над ней самой) */}
                <RampArrow lo={rank - 1} hi={rank} />
                {[1, 2, 3, 4].map((i) => <i key={i} className={i <= rank ? "is-on" : ""} />)}
            </span>
            <span className="rampcheer__n">{m.step} {rank}/4</span>
        </div>
    );
};

// Отклик ОШИБКИ: ступень слова/формы ПОНИЗИЛАСЬ — красные пипсы нового уровня + «ступень ниже»
// (в паре с падающим звуком «ошибка», транспонированным по высоте рампы). Грамм-overlay без
// рампы (местоимения) — не показываем.
export const RampDrop = ({ word, rank = 0 }) => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const m = MASTERY[lang] || MASTERY.en;
    const form = !!word?.form_track;
    if (!form && word?.grammar) return null;              // overlay-клетка: отката рампы нет
    // Ступень неизвестна (rank=0): режим ЗАУЧИВАНИЯ и легаси-наборы идут ВНЕ рампы — обещать
    // «ступень ниже» там нечестно (в заучивании SRS вообще не трогается). Симметрично RampCheer,
    // который при rank<1 тоже молчит.
    if (!form && rank < 1) return null;
    // новый уровень после отката: формы produce→choose(2)/choose→card(0); база — на ступень ниже (min 1)
    const newRank = form ? (word?.stage === "produce" ? 2 : 0) : Math.max(1, rank - 1);
    return (
        <div className="rampcheer rampcheer--drop" aria-hidden="true">
            <Icon n="arrow-down" sm />
            <span className="rampcheer__pips">
                {/* откат rank → newRank: та же дуга, но зеркальная — влево, к ступени, куда съехали */}
                <RampArrow lo={newRank} hi={rank} back />
                {[1, 2, 3, 4].map((i) => <i key={i} className={i <= newRank ? "is-on is-down" : ""} />)}
            </span>
            <span className="rampcheer__n">{m.stepDown}</span>
        </div>
    );
};

// Является ли элемент грамм-упражнением (несёт параметризованный контракт target).
export const isGrammar = (w) => !!(w && (w.grammar || w.target));

// Верный ответ грамм-упражнения = target.value (НЕ перевод/лемма).
export const grammarAnswer = (w) => (w?.target?.value ?? "").toString();

// Варианты грамм-выбора (артикли) — берём из el.options, ДЕДУПЛИЦИРУЕМ (как путь слова: uniq) и
// ПЕРЕМЕШИВАЕМ. Дубль поверхностной формы иначе даёт дублирующийся React-key + дистрактор, равный
// принятому ответу (grammarAccepts.includes) → он подсветился бы зелёным наравне с верным.
export const grammarOptions = (w) => shuffle(uniq(((w?.options) || []).map((o) => o?.w).filter(Boolean)));

// FormPrompt — вопрос о форме слова: крупная лемма + локализованная подпись запрашиваемой формы.
// Используют грамм-ветки ChoiceGame/InputGame вместо обычного перевод-промпта.
// props: word — элемент (берём prompt.lemma и prompt.formLabel), lang — язык UI.
export const FormPrompt = ({ word, lang }) => {
    const p = word?.prompt || {};
    const lemma = p.lemma || word?.no || "";
    const labels = FORM_LABEL[lang] || FORM_LABEL.en;
    const label = labels[p.formLabel] || FORM_LABEL.en[p.formLabel] || "";
    // трек форм: короткое объяснение формы под вопросом (что это, не подсказывая ответ)
    const why = word?.form_track ? ((FORM_EXPLAIN[lang] || FORM_EXPLAIN.en)[word?.step] || "") : "";
    // как на карточке формы: блеклый перевод над словом + чип части речи — напоминание контекста
    const tr = (word?.translate?.[lang] || []).filter(Boolean).join(", ");
    const posText = posLabel(word?.part_of_speech, interfaceTranslate[lang]);
    return (
        <>
            {/* часть речи — сверху мелко; ЗАДАНИЕ — под словом, крупнее и с фиолетовым
                подчёркиванием (взгляд сразу на «что спрашивают») */}
            {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}
            {tr && <div className="fcard-trans">{tr}</div>}
            <h1 className="qword qword--grammar" lang="no">{lemma}</h1>
            {label && <div className="qform-ask">{label}</div>}
            {why && <div className="qform-why">{why}</div>}
        </>
    );
};

// Принятые ответы грамм-выбора: target.value + target.accept (напр. род ei-слова: и ei, и en верны).
export const grammarAccepts = (w) => [w?.target?.value, ...((w?.target?.accept) || [])].filter(Boolean).map(String);

/** @type {import('react').CSSProperties} */
export const PLAY_STYLE = { position: "fixed", inset: 0, zIndex: 90, overflow: "hidden" };

// Полноэкранный оверлей игры/карточек = МОДАЛЬНЫЙ диалог: даём SR роль (role=dialog + aria-modal),
// делаем контейнер фокусируемым (tabindex=-1) и УВОДИМ ФОКУС ВНУТРЬ оверлея при маунте — иначе фокус
// остаётся на кнопке под наложением и SR не понимает, что контекст сменился. Возвращает ref для корня.
// Esc-закрытие тут СПЕЦИАЛЬНО не вешаем: фазой play уже управляет контроллер сессии (второй хэндлер
// = двойной выход). Меняем только семантику/фокус.
export function usePlayDialogRef() {
    // any: один ref вешается на корни разных игр (div/section/…); хук трогает только общие
    // DOM-методы (setAttribute/focus), поэтому конкретный HTMLElement-подтип не нужен и мешал бы tsc.
    const ref = useRef(/** @type {any} */(null));
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        if (el.getAttribute("tabindex") == null) el.setAttribute("tabindex", "-1");
        if (!el.contains(document.activeElement)) {
            try { el.focus({ preventScroll: true }); } catch { el.focus(); }
        }
    }, []);
    return ref;
}

export const filterChosenWords = (dictList) =>
    dictList.flatMap((d) => d.words.filter((w) => w?.gameData?.isChoosedToGame));

export const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// Снисходительная сверка ввода: å≈a, ø≈o, æ≈ae + срезаем прочие диакритики (é→e).
// Норвежская раскладка не у всех — печать без спецсимволов засчитывается.
export const foldLoose = (s) => (s || "").trim().toLowerCase()
    .replace(/å/g, "a").replace(/ø/g, "o").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

// \u041b\u0451\u0433\u043a\u0430\u044f \u043d\u043e\u0440\u043c\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u041e\u041f\u0415\u0427\u0410\u0422\u041e\u041a \u043f\u043e \u0420\u0415\u0410\u041b\u042c\u041d\u042b\u041c \u043a\u043b\u0430\u0432\u0438\u0448\u0430\u043c: \u0440\u0435\u0433\u0438\u0441\u0442\u0440 + \u043f\u0440\u043e\u0431\u0435\u043b\u044b, \u043d\u043e \u00e5/\u00f8/\u00e6
// \u0421\u041e\u0425\u0420\u0410\u041d\u042f\u0415\u041c (\u0432 \u043e\u0442\u043b\u0438\u0447\u0438\u0435 \u043e\u0442 foldLoose, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0441\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0438\u0445 \u0432 a/o/ae). \u041d\u0443\u0436\u043d\u043e, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0441\u0435\u0434\u0441\u0442\u0432\u043e \u043a\u043b\u0430\u0432\u0438\u0448
// \u0441\u0447\u0438\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u043c \u043a\u043d\u043e\u043f\u043a\u0430\u043c (\u00e5 \u0440\u044f\u0434\u043e\u043c \u0441 \u00f8/p/\u00e6), \u0430 \u043d\u0435 \u043f\u043e \u0441\u0432\u0451\u0440\u043d\u0443\u0442\u044b\u043c a/o \u2014 \u0438\u043d\u0430\u0447\u0435 \u043f\u0440\u043e\u043c\u0430\u0445 \u00e5\u2192\u00f8 \u0442\u0435\u0440\u044f\u043b\u0441\u044f.
// NFC-нормализация: å/ø/æ из target.value грамм-формы могут прийти в разложенном виде (NFD:
// a+◌̊), а экранный ввод даёт прекомпозированные — без NFC они НЕ совпали бы. Для ASCII — no-op.
export const foldLight = (s) => (s || "").trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");

export const uniq = (arr) => {
    const s = new Set();
    return arr.filter((x) => x && !s.has(x.toLowerCase()) && s.add(x.toLowerCase()));
};

// Слоты «импровизированного инпута» (build-line) с мигающим курсором. tpl=true (после ошибки) —
// ШАБЛОН: тусклые ещё-не-введённые буквы цели + красным символ не на своём месте/лишний. tpl=false —
// просто набранное. typedArr/targetChars — массивы символов. Используют BuildGame и InputGame.
export const tplSlots = (typedArr, targetChars, { tpl = false, caret = false } = {}) => {
    const slots = [];
    const n = tpl ? Math.max(targetChars.length, typedArr.length) : typedArr.length;
    const caretAt = caret ? typedArr.length : -1;
    for (let i = 0; i < n; i++) {
        if (i === caretAt) slots.push(<span key="caret" className="build-line__caret" />);
        const ch = typedArr[i];
        if (ch != null) {
            const bad = tpl && (i >= targetChars.length || ch !== targetChars[i]);
            slots.push(<span key={i} className={bad ? "build-line__bad" : undefined}>{ch === " " ? " " : ch}</span>);
        } else if (tpl && i < targetChars.length) {
            slots.push(<span key={i} className="build-line__ghost">{targetChars[i] === " " ? " " : targetChars[i]}</span>);
        }
    }
    if (caretAt >= n) slots.push(<span key="caret" className="build-line__caret" />);
    return slots;
};

// «Отличается не более чем на одну правку» (OSA-1): подстановка одного символа, пропуск/лишний
// символ ИЛИ перестановка двух соседних. Для снисходительного зачёта опечаток.
// Строки сравнивать УЖЕ свёрнутыми (foldLoose). a === b обрабатываем выше как точное совпадение.
// adjacent(c1,c2) (необязательно): если задан — ОДНУ замену прощаем только когда клавиши соседние
// (палец соскользнул); пропуск/лишняя/перестановка — независимо от клавиш (механический слип).
/**
 * @param {string} a
 * @param {string} b
 * @param {((c1: string, c2: string) => boolean) | null} [adjacent]
 */
export const withinOneEdit = (a, b, adjacent = null) => {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la === lb) {
        const idx = [];
        for (let i = 0; i < la; i++) if (a[i] !== b[i]) { idx.push(i); if (idx.length > 2) return false; }
        if (idx.length <= 1) {
            if (idx.length === 0) return true;
            return adjacent ? !!adjacent(a[idx[0]], b[idx[0]]) : true;   // одна замена (с предикатом — только соседние)
        }
        // перестановка двух соседних
        return idx.length === 2 && idx[1] === idx[0] + 1 && a[idx[0]] === b[idx[1]] && a[idx[1]] === b[idx[0]];
    }
    // длины различаются на 1 → пропуск/лишний символ: short вкладывается в long с одним пропуском
    const [s, l] = la < lb ? [a, b] : [b, a];
    let i = 0, j = 0, skipped = false;
    while (i < s.length && j < l.length) {
        if (s[i] === l[j]) { i++; j++; }
        else { if (skipped) return false; skipped = true; j++; }
    }
    return true;
};

// Тумблер «автопереход» прямо в шапке игры: тап переключает авто-переход после верного ответа
// (выкл — листать тапом/пробелом). Иконка тускнеет, когда выключено (как кнопка звука).
const AutoAdvanceToggle = ({ t }) => {
    const autoAdvance = useSystemStore((s) => s.autoAdvance);
    return (
        <button className={"ptop__snd" + (autoAdvance ? "" : " is-off")}
            title={t.autoAdvanceTip} aria-label={t.autoAdvanceTip} aria-pressed={autoAdvance}
            onClick={(e) => { e.stopPropagation(); useSystemStore.getState().setAutoAdvance(!autoAdvance); }}>
            <Icon n="fast-forward" sm />
        </button>
    );
};

// Регулятор громкости звука прямо в окне игры/экзамена: кнопка-иконка открывает
// поповер с ползунком 0..100%. 0% = выкл (synced с soundOn). Закрытие — тап вне.
const SoundControl = ({ t }) => {
    const [open, setOpen] = useState(false);
    const soundOn = useSystemStore((s) => s.soundOn);
    const soundVolume = useSystemStore((s) => s.soundVolume);
    const pct = soundOn ? Math.round((soundVolume ?? 1) * 100) : 0;
    const ref = useRef(/** @type {HTMLDivElement | null} */(null));
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("pointerdown", onDoc, true);
        return () => document.removeEventListener("pointerdown", onDoc, true);
    }, [open]);
    const setPct = (v) => useSystemStore.getState().setSoundVolume(v / 100);
    return (
        <div className="ptop__snd-wrap" ref={ref}>
            <button className={"ptop__snd" + (pct === 0 ? " is-off" : "")} title={t.gameSounds} aria-label={t.gameSounds}
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
                <Icon n="volume" sm />
            </button>
            {open && (
                <div className="snd-pop" onClick={(e) => e.stopPropagation()}>
                    <Icon n="volume" sm className={pct === 0 ? "snd-pop__mute" : ""} />
                    <input type="range" min="0" max="100" step="5" value={pct}
                        onChange={(e) => setPct(Number(e.target.value))} aria-label={t.gameSounds} />
                    <span className="snd-pop__val">{pct}%</span>
                </div>
            )}
        </div>
    );
};

// Верхняя панель: бренд, счётчики верно/ошибки (или произвольный centerNode — напр. «N/30»
// в экзамене, где ✓/✗ по ходу не показываем), регулятор громкости, выход.
// Маленький ненавязчивый значок «повтор» — для слов из повторений (а не новых). Только иконка ↻
// (подпись — в title/aria, по наведению/тапу), чтобы не мешать на экранах, где почти всё — повторы.
const REPEAT_LBL = langGuard({ ru: "повтор", ukr: "повтор", en: "review", pl: "powtórka", lt: "kartojimas", lv: "atkārtojums", ar: "مراجعة" }, "gameShared.REPEAT_LBL");
export const RepeatBadge = () => {
    const lang = useSystemStore((s) => s.currentLanguage);
    const txt = REPEAT_LBL[lang] || REPEAT_LBL.en;
    return (
        <span title={txt} aria-label={txt} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
            color: "var(--fjord-600)", background: "var(--fjord-50)", border: "1px solid var(--fjord-300)",
            width: 26, height: 26, borderRadius: "var(--r-full)",
        }}>
            <Icon n="repeat" sm />
        </span>
    );
};

/** @param {{correctCount?:number, wrongCount?:number, onExit?:any, t:any, centerNode?:any, tag?:any}} props */
export const PlayTopBar = ({ correctCount, wrongCount, onExit, t, centerNode = null, tag = null }) => {
    return (
        <div className="ptop">
            <a className="ptop__brand" onClick={onExit} style={{ cursor: "pointer" }}>
                <BrandMark />
                <span className="brand__name">Lære<b>·</b>Norsk</span>
            </a>
            {tag}
            <div className="pstats">
                {centerNode != null ? centerNode : (
                    <>
                        <span className="stat stat--ok"><Icon n="check" sm /> {correctCount}</span>
                        <span className="stat stat--err"><Icon n="x" sm /> {wrongCount}</span>
                    </>
                )}
            </div>
            <AutoAdvanceToggle t={t} />
            <SoundControl t={t} />
            <a className="pexit" onClick={onExit} style={{ cursor: "pointer" }}><Icon n="x" sm /> {t.exit}</a>
        </div>
    );
};

// Ранг ступени рампы слова для цвета сегмента: 0 — карточка (серый), 1..4 — зелёный по нарастанию,
// 4 = ввод с клавиатуры (самый насыщенный). cell — клетка рампы (card/choice_*/build_*/input_* | cloze_1..3).
// Грамматика (choice_gender/input_indefpl) — ОТДЕЛЬНЫЙ тир (rank 5 → свой цвет, не зелёная рампа).
// Грамматика/формы — по зелёной шкале стадий (карточка серая → ввод насыщенный), как база:
// form_card/choose/produce — ступени рампы форм; overlay-клетки приравнены к выбору/вводу.
const RAMP_RANK = { card: 0, study: 0, choice_int2no: 1, choice_no2int: 2, build_int2no: 3, input_int2no: 4, cloze_1: 1, cloze_2: 2, cloze_3: 3, order_int2no: 3, cells_int2no: 4, choice_gender: 2, input_indefpl: 4, input_present: 4, input_past: 4, input_perfect: 4, input_neuter: 4, input_comparative: 4, input_superlative: 4, input_pluraladj: 4, input_objcase: 4, input_possneut: 4, input_posspl: 4, form_card: 0, form_choose: 2, form_produce: 4 };
// Точного ключа нет (нестандартное направление: cloze_int2no / build_no2int / order_no2int …) →
// дефолт по РЕЖИМУ (первый сегмент cell), чтобы неизвестная клетка не падала в серый rank 0.
const MODE_RANK = { card: 0, study: 0, choice: 2, cloze: 3, order: 3, build: 3, cells: 4, input: 4, form: 2 };
export const stageRank = (cell) => {
    const key = cell || "card";
    if (key in RAMP_RANK) return RAMP_RANK[key];
    return MODE_RANK[String(key).split("_")[0]] ?? 0;
};

// Транспонировка звуков «вход в задание»/«верно» по стадии рампы (rank 0..4): чем дальше слово
// по рампе — тем выше тон (та же узнаваемая фраза). Диатоника до-ре-ми-фа-соль (полутоны).
const RANK_SEMIS = [0, 2, 4, 5, 7];
export const semisOf = (rank) => RANK_SEMIS[rank] ?? 0;

// Сегментный прогресс-бар (сегмент на слово). Сегмент — строка (легаси: "ok"/"err"/"now"/"done"/
// "card") ИЛИ объект { state, rank }: пройденные слова красятся ЦВЕТОМ СТАДИИ (rank 0 серый …
// 4 насыщенный зелёный), текущее — акцент «ты здесь», предстоящие — пустые (появляются по мере прохождения).
/**
 * @param {{ segs: import('../../types.js').ProgressSeg[], status?: import('../../types.js').GameStatus, nowMst?: boolean }} props
 */
export const ProgressSegments = ({ segs, status, nowMst = false }) => {
    // Лайфцикл ТЕКУЩЕГО сегмента: пока вопрос не отвечен (ASKING) — мигает «будущим» зелёным
    // (цвет следующей стадии); сразу после ответа ~1с — нейтральный (ждём итог); затем верно →
    // зелёный своей стадии, неверно → оранжевый (как было). resolved = прошла ли секунда ожидания.
    const [resolved, setResolved] = useState(false);
    useEffect(() => {
        if (status === "CORRECT" || status === "INCORRECT") {
            setResolved(false);
            const id = setTimeout(() => setResolved(true), 1000);
            return () => clearTimeout(id);
        }
        setResolved(false);
    }, [status]);

    return (
        <div className="pbar pbar--seg" aria-hidden="true">
            {segs.map((s, i) => {
                const isObj = s && typeof s === "object";
                const state = isObj ? (s.state || "") : (s || "");
                const r = isObj ? (s.rank ?? 0) : 0;
                let cls = "pseg";
                if (isObj) {
                    if (state === "now") {
                        if (status === "CORRECT" && nowMst) cls += " pseg--mst";    // слово ВЫУЧЕНО сейчас → кэп СРАЗУ (не ждём переход)
                        else if (status === "CORRECT" || status === "INCORRECT") {
                            if (!resolved) cls += " is-pending";                    // ждём итог — нейтральный
                            else if (status === "CORRECT") cls += " pseg--st" + r;  // верно → зелёный стадии
                            else cls += " is-wrong";                                // неверно → оранжевый
                        } else {
                            // ASKING → мигает «будущим» цветом. Зелёная рампа (0..4) — на тон вперёд;
                            // грамматика (тир 5) — своим цветом (без подъёма по зелёной шкале).
                            const blinkR = r >= 5 ? r : Math.min(r + 1, 4);
                            cls += " pseg--st" + blinkR + " is-blink";
                        }
                    } else if (state === "err") cls += " is-wrong";                 // пройдено с ошибкой → оранжевый
                    else if (state === "mst") cls += " pseg--mst";                  // слово ВЫУЧЕНО здесь → золото
                    else if (state !== "future") cls += " pseg--st" + r;            // пройдено верно → зелёный стадии
                    // future → базовый «пустой» сегмент
                } else if (state) {
                    cls += " is-" + state;
                }
                return <span key={i} className={cls} />;
            })}
        </div>
    );
};

// Экран «нет слов для игры».
export const NoWords = ({ t, onBack }) => (
    <div className="play" data-state="asking" style={PLAY_STYLE}>
        <div className="pstage">
            <p className="qprompt">{t.noWordsToPlay}</p>
            <button className="gbtn gbtn--accent" onClick={onBack}>
                <Icon n="arrow-left" sm /> {t.backToWordSelection}
            </button>
        </div>
    </div>
);

// Итоговый экран.
export const FinishScreen = ({ score, knownFirstTry, missedCount, total, t, onRestart, onExit }) => (
    <div className="finish" style={{ display: "block" }}>
        <div className="qcount">{t.gameFinished}</div>
        <div className="finish__score">{score}%</div>
        <div className="finish__sub">{knownFirstTry} / {total}</div>
        <div className="finish__grid">
            <div className="fstat"><div className="fstat__n ok">{knownFirstTry}</div><div className="fstat__l">{t.guessedStats?.[0]}</div></div>
            <div className="fstat"><div className="fstat__n err">{missedCount}</div><div className="fstat__l">{t.mistakesMade}</div></div>
            <div className="fstat"><div className="fstat__n">{total}</div><div className="fstat__l">{t.word}</div></div>
        </div>
        <div className="pcta">
            <button className="gbtn gbtn--accent" onClick={onRestart}><Icon n="play" sm /> {t.playAgain}</button>
            <button className="gbtn gbtn--ghost" onClick={onExit}><Icon n="arrow-left" sm /> {t.backToWordSelection}</button>
        </div>
    </div>
);
