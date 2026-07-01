// Онбординг «Учёбы» — один раз при первом заходе (флаг gamePrefs.studyOnboarded в БД). Объясняет
// механику + даёт настроить аудио/грамматику под себя. Затем ведёт к калибровке. Позже менять — в Профиле.
import { useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";
import api from "../tools/api.js";
import { useAuthStore } from "../../store/AuthStore.jsx";
import { GRM, GRM_POS } from "../../pages/MyPage.i18n.js";

const T = langGuard({
    ru: {
        eyebrow: "Как работает Учёба",
        title: "Учим слова по-умному",
        p1t: "Слова — из твоего словаря", p1d: "Учёба берёт слова из «Моего словаря» и Базы. Можно докинуть новых под свой уровень в один тап.",
        p2t: "«Выучено» — это без ошибок", p2d: "Слово считается выученным, когда проходишь его без ошибок в «Выборе» и «Переводе». Карточки — просто чтобы освежить.",
        p3t: "Повторения по интервалам", p3d: "Система сама напоминает слово перед тем, как ты его забудешь — каждый раз чуть позже. Заходи понемногу каждый день.",
        cta: "Начать", skip: "Пропустить",
    },
    en: {
        eyebrow: "How Study works",
        title: "Learn words the smart way",
        p1t: "Words come from your dictionary", p1d: "Study pulls words from your dictionary and the base. Add new ones for your level in one tap.",
        p2t: "“Mastered” means no mistakes", p2d: "A word is mastered when you pass it without errors in Choice and Typing. Cards are just to refresh.",
        p3t: "Spaced repetition", p3d: "The system reminds you of a word right before you'd forget it — a bit later each time. Come back a little every day.",
        cta: "Start", skip: "Skip",
    },
    ukr: {
        eyebrow: "Як працює Навчання",
        title: "Вчимо слова розумно",
        p1t: "Слова — з твого словника", p1d: "Навчання бере слова з «Мого словника» та Бази. Можна докинути нових під свій рівень одним тапом.",
        p2t: "«Вивчено» — це без помилок", p2d: "Слово вважається вивченим, коли проходиш його без помилок у «Виборі» та «Перекладі». Картки — щоб освіжити.",
        p3t: "Повторення за інтервалами", p3d: "Система сама нагадує слово перед тим, як ти його забудеш — щоразу трохи пізніше. Заходь потроху щодня.",
        cta: "Почати", skip: "Пропустити",
    },
    pl: {
        eyebrow: "Jak działa Nauka",
        title: "Ucz się słów mądrze",
        p1t: "Słowa z twojego słownika", p1d: "Nauka bierze słowa z „Mojego słownika” i Bazy. Dodaj nowe na swój poziom jednym tapnięciem.",
        p2t: "„Opanowane” to bez błędów", p2d: "Słowo jest opanowane, gdy przejdziesz je bez błędów w „Wyborze” i „Wpisywaniu”. Fiszki — by odświeżyć.",
        p3t: "Powtórki w odstępach", p3d: "System przypomni słowo tuż zanim je zapomnisz — za każdym razem trochę później. Wracaj codziennie po trochu.",
        cta: "Zacznij", skip: "Pomiń",
    },
    lt: {
        eyebrow: "Kaip veikia Mokymasis",
        title: "Mokykis žodžių išmaniai",
        p1t: "Žodžiai — iš tavo žodyno", p1d: "Mokymasis ima žodžius iš „Mano žodyno“ ir Bazės. Pridėk naujų pagal lygį vienu palietimu.",
        p2t: "„Išmokta“ — be klaidų", p2d: "Žodis išmoktas, kai įveiki jį be klaidų „Pasirinkime“ ir „Įvedime“. Kortelės — tik atnaujinti.",
        p3t: "Kartojimas intervalais", p3d: "Sistema primena žodį prieš pat pamirštant — kaskart kiek vėliau. Grįžk po truputį kasdien.",
        cta: "Pradėti", skip: "Praleisti",
    },
    lv: {
        eyebrow: "Kā darbojas Mācības",
        title: "Mācies vārdus gudri",
        p1t: "Vārdi nāk no tavas vārdnīcas", p1d: "Mācības ņem vārdus no „Manas vārdnīcas“ un Bāzes. Pievieno jaunus savam līmenim ar vienu pieskārienu.",
        p2t: "„Apgūts“ nozīmē bez kļūdām", p2d: "Vārds ir apgūts, kad izej to bez kļūdām „Izvēlē“ un „Rakstīšanā“. Kartiņas ir tikai atsvaidzināšanai.",
        p3t: "Atkārtošana ar intervāliem", p3d: "Sistēma atgādina vārdu tieši pirms tu to aizmirstu — katru reizi nedaudz vēlāk. Atgriezies pa druskai katru dienu.",
        cta: "Sākt", skip: "Izlaist",
    },
    ar: {
        eyebrow: "كيف تعمل الدراسة",
        title: "تعلّم الكلمات بذكاء",
        p1t: "الكلمات تأتي من قاموسك", p1d: "تأخذ الدراسة الكلمات من قاموسك والقاعدة. أضف كلمات جديدة لمستواك بنقرة واحدة.",
        p2t: "«متقَن» يعني بلا أخطاء", p2d: "تُعدّ الكلمة متقَنة عندما تجتازها بلا أخطاء في «الاختيار» و«الكتابة». البطاقات للتذكير فقط.",
        p3t: "تكرار متباعد", p3d: "يذكّرك النظام بالكلمة قبيل أن تنساها — في كل مرة بعد فترة أطول قليلًا. عُد قليلًا كل يوم.",
        cta: "ابدأ", skip: "تخطّ",
    },
}, "LearningIntro.T");

// Строки блока настроек (аудио + заголовок). Грамматику берём из готовых MyPage.i18n (GRM/GRM_POS).
const S = langGuard({
    ru:  { setup: "Настрой под себя", audioT: "Задания на слух", audioD: "Слова подтверждаются на слух отдельной партией. Выключи — будут только текстом." },
    en:  { setup: "Make it yours", audioT: "Listening tasks", audioD: "Words are confirmed by ear in a separate batch. Turn off — text only." },
    ukr: { setup: "Налаштуй під себе", audioT: "Завдання на слух", audioD: "Слова підтверджуються на слух окремою партією. Вимкни — лише текстом." },
    pl:  { setup: "Dostosuj do siebie", audioT: "Zadania ze słuchu", audioD: "Słowa potwierdzasz ze słuchu osobną partią. Wyłącz — tylko tekstem." },
    lt:  { setup: "Prisitaikyk", audioT: "Klausymo užduotys", audioD: "Žodžiai patvirtinami iš klausos atskira partija. Išjunk — tik tekstu." },
    lv:  { setup: "Pielāgo sev", audioT: "Klausīšanās uzdevumi", audioD: "Vārdus apstiprina pēc dzirdes atsevišķā partijā. Izslēdz — tikai ar tekstu." },
    ar:  { setup: "خصّصها لك", audioT: "مهام الاستماع", audioD: "تُؤكَّد الكلمات سماعيًا في دفعة منفصلة. أوقفها — بالنص فقط." },
}, "LearningIntro.S");

export default function LearningIntro({ lang = "ru", onDone }) {
    const t = T[lang] || T.ru;
    const s = S[lang] || S.ru;
    const grm = GRM[lang] || GRM.ru;
    const grmPos = GRM_POS[lang] || GRM_POS.ru;
    const prefs = useAuthStore((st) => st.user?.gamePrefs) || {};
    // Локальный черновик настроек (дефолты — «включено»); сохраняем разом по «Начать».
    // Порог слуховой партии тут НЕ трогаем — тонкая настройка живёт в Профиле (дефолт применится сам).
    const [audio, setAudio] = useState(prefs.audio !== false);
    const [grammar, setGrammar] = useState(prefs.grammar !== false);
    const [gpos, setGpos] = useState({ noun: true, verb: true, adjective: true, pronoun: true, ...(prefs.grammarPos || {}) });
    const posOn = (k) => gpos[k] !== false;

    const finish = () => {   // регистрируем прохождение онбординга + выбранные настройки в БД
        const patch = { audio, grammar, grammarPos: gpos, studyOnboarded: true };
        useAuthStore.setState((st) => (st.user ? { user: { ...st.user, gamePrefs: { ...(st.user.gamePrefs || {}), ...patch } } } : st));
        api.setGamePrefs(patch).catch(() => { /* офлайн — не критично, покажем ещё раз */ });
        onDone?.();
    };

    const rows = [
        { ic: "bookmark", t: t.p1t, d: t.p1d },
        { ic: "check-circle", t: t.p2t, d: t.p2d },
        { ic: "repeat", t: t.p3t, d: t.p3d },
    ];
    return (
        <div className="study-root intro-full">
            <span className="plc-hero__halo" /><span className="plc-hero__halo2" />
            <div className="intro-full__body">
                <span className="plc-hero__eyebrow"><Icon n="graduation" sm /> {t.eyebrow}</span>
                <div className="plc-hero__title">{t.title}</div>
                <div className="plc-detect" style={{ gridTemplateColumns: "1fr" }}>
                    {rows.map((r) => (
                        <div className="plc-detect__c" key={r.ic} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                            <Icon n={r.ic} />
                            <span className="col" style={{ gap: 4 }}>
                                <span className="plc-detect__t">{r.t}</span>
                                <span className="plc-detect__d">{r.d}</span>
                            </span>
                        </div>
                    ))}
                </div>
                {/* Настрой под себя: аудио + грамматика с тонкой пер-POS настройкой (позже — в Профиле).
                    Значок+заголовок+тумблер в строку, описание на второй; тема-адаптивно (.intro-set). */}
                <div className="plc-detect__t" style={{ alignSelf: "flex-start" }}>{s.setup}</div>
                <div className="card intro-set">
                    <div className="intro-set__row">
                        <div className="intro-set__head">
                            <span className="intro-set__ic"><Icon n="volume" sm /></span>
                            <span className="intro-set__t">{s.audioT}</span>
                            <button type="button" className={`toggle${audio ? " is-on" : ""}`} role="switch" aria-checked={audio} onClick={() => setAudio((v) => !v)} />
                        </div>
                        <div className="intro-set__d">{s.audioD}</div>
                    </div>
                    <div className="intro-set__row">
                        <div className="intro-set__head">
                            <span className="intro-set__ic"><Icon n="graduation" sm /></span>
                            <span className="intro-set__t">{grm.t}</span>
                            <button type="button" className={`toggle${grammar ? " is-on" : ""}`} role="switch" aria-checked={grammar} onClick={() => setGrammar((v) => !v)} />
                        </div>
                        <div className="intro-set__d">{grm.d}</div>
                        {grammar && (
                            <div className="intro-set__chips">
                                {["noun", "verb", "adjective", "pronoun"].map((k) => (
                                    <button key={k} type="button" role="switch" aria-checked={posOn(k)}
                                        className={`grm-pos__chip${posOn(k) ? " is-on" : ""}`}
                                        onClick={() => setGpos((p) => ({ ...p, [k]: !posOn(k) }))}>{grmPos[k]}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="plc-actions">
                    <button className="plc-hero__btn" onClick={finish}><Icon n="play" /> {t.cta}</button>
                </div>
            </div>
        </div>
    );
}
