// Онбординг «Учёбы» — один раз при первом заходе. Коротко объясняет механику:
// откуда берутся слова, что значит «выучено», как работают интервалы. Затем ведёт к калибровке.
import { Icon } from "../ui/Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

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
}, "LearningIntro.T");

export default function LearningIntro({ lang = "ru", onDone }) {
    const t = T[lang] || T.ru;
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
                <div className="plc-actions">
                    <button className="plc-hero__btn" onClick={() => onDone?.()}><Icon n="play" /> {t.cta}</button>
                </div>
            </div>
        </div>
    );
}
