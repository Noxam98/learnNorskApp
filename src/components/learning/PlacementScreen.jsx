// Вводный тест (placement) «Учёбы»: intro (3 пути) → play (адаптивный квиз) → result.
// Калибрует уровень CEFR. Самооценка и «калибровать в фоне» — альтернативы тесту.
// Обёрнут в .study-root, чтобы работали scoped-стили .plc-*/.ladder/.lvl-chip/.conf.
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { ChoiceQuestion } from "../gameComponents/ChoiceQuestion.jsx";
import { InputQuestion } from "../gameComponents/InputQuestion.jsx";
import { hyLang } from "../ui/hyphenate.js";
import api from "../tools/api.js";
import { ENDONYM } from "../../interface/languages.js";
import { langGuard } from "../../interface/i18nGuard.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const T = langGuard({
    ru: {
        eyebrow: "Вводный тест · ~3 минуты", title1: "Определим твой", title2: "уровень норвежского",
        desc: "Адаптивный тест подстраивает сложность под твои ответы. Чем точнее уровень — тем лучше система подберёт слова и режим повторений. Можно пропустить любой вопрос.",
        d1t: "Уровень CEFR", d1d: "A1–C1 — старт подбора слов под тебя",
        d2t: "Направление повторений", d2d: "система сама решит, как спрашивать — для лучшего запоминания",
        d3t: "Стартовый набор", d3d: "первые слова уже на твой уровень",
        start: "Начать тест", self: "Оценить себя сам", skip: "Пропустить — калибровать в фоне",
        selfTitle: "Выбери уровень сам", selfHint: "уточним в фоне за первые сессии", save: "Сохранить и начать",
        footer: "Тест можно пройти позже или переоценить уровень в любой момент — в «Профиле».",
        loading: "Готовим вопросы…", dir: "Норвежский → ", dirIn: " → Норвежский", whats: "Что это значит?", dontKnow: "Не знаю — пропустить",
        grading: "Считаем результат…", passed: "Тест пройден", resTitle: "Уровень определён предварительно",
        resDesc: "Будем уточнять его по ходу — точность вырастет за первые сессии. Слова и сложность уже настроены.",
        yourLevel: "твой уровень", confLow: "низкая", confMid: "средняя", confHigh: "высокая",
        confLbl: "Уверенность оценки", howAsk: "Как мы будем тебя спрашивать", auto: "авто",
        dirExplain: "Направление перевода выбирает система — для каждого слова отдельно. По мере того как слово крепнет, переключаем тебя с узнавания на припоминание: так слово надёжнее уходит в долговременную память.",
        begin: "Начать учиться",
        lvlD: { A1: "только начинаю", A2: "базовый", B1: "средний", B2: "уверенный", C1: "продвинутый", C2: "свободно" },
    },
    en: {
        eyebrow: "Placement test · ~3 min", title1: "Let's find your", title2: "Norwegian level",
        desc: "The adaptive test adjusts difficulty to your answers. The more accurate the level — the better we pick words and review mode. You can skip any question.",
        d1t: "CEFR level", d1d: "A1–C1 — tailors your word picks",
        d2t: "Review direction", d2d: "the system decides how to ask — for better recall",
        d3t: "Starter set", d3d: "first words already at your level",
        start: "Start test", self: "Self-assess", skip: "Skip — calibrate in background",
        selfTitle: "Pick your level", selfHint: "we'll refine it over first sessions", save: "Save and start",
        footer: "You can take the test later or re-assess your level anytime in Profile.",
        loading: "Preparing questions…", dir: "Norwegian → ", dirIn: " → Norwegian", whats: "What does it mean?", dontKnow: "Don't know — skip",
        grading: "Calculating…", passed: "Test complete", resTitle: "Level set provisionally",
        resDesc: "We'll refine it as you go — accuracy grows over your first sessions. Words and difficulty are tuned.",
        yourLevel: "your level", confLow: "low", confMid: "medium", confHigh: "high",
        confLbl: "Estimate confidence", howAsk: "How we'll ask you", auto: "auto",
        dirExplain: "The system picks the translation direction — per word. As a word strengthens we switch you from recognition to recall: that's how it settles into long-term memory.",
        begin: "Start learning",
        lvlD: { A1: "just starting", A2: "basic", B1: "intermediate", B2: "confident", C1: "advanced", C2: "fluent" },
    },
    ukr: {
        eyebrow: "Вступний тест · ~3 хв", title1: "Визначимо твій", title2: "рівень норвезької",
        desc: "Адаптивний тест підлаштовує складність під твої відповіді. Можна пропустити будь-яке питання.",
        d1t: "Рівень CEFR", d1d: "A1–C1 — підбір слів під тебе",
        d2t: "Напрям повторень", d2d: "система сама вирішить, як питати",
        d3t: "Стартовий набір", d3d: "перші слова вже на твій рівень",
        start: "Почати тест", self: "Оцінити себе сам", skip: "Пропустити — калібрувати у фоні",
        selfTitle: "Обери рівень сам", selfHint: "уточнимо за перші сесії", save: "Зберегти й почати",
        footer: "Тест можна пройти пізніше або переоцінити рівень будь-коли — у «Профілі».",
        loading: "Готуємо питання…", dir: "Норвезька → ", dirIn: " → Норвезька", whats: "Що це означає?", dontKnow: "Не знаю — пропустити",
        grading: "Рахуємо…", passed: "Тест пройдено", resTitle: "Рівень визначено попередньо",
        resDesc: "Уточнюватимемо далі — точність зросте за перші сесії.",
        yourLevel: "твій рівень", confLow: "низька", confMid: "середня", confHigh: "висока",
        confLbl: "Впевненість оцінки", howAsk: "Як ми будемо питати", auto: "авто",
        dirExplain: "Напрям перекладу обирає система — для кожного слова окремо. Із зростанням сили перемикаємо тебе з упізнавання на пригадування.",
        begin: "Почати навчання",
        lvlD: { A1: "тільки починаю", A2: "базовий", B1: "середній", B2: "впевнений", C1: "просунутий", C2: "вільно" },
    },
    pl: {
        eyebrow: "Test poziomujący · ~3 min", title1: "Określmy twój", title2: "poziom norweskiego",
        desc: "Adaptacyjny test dopasowuje trudność do twoich odpowiedzi. Każde pytanie można pominąć.",
        d1t: "Poziom CEFR", d1d: "A1–C1 — dobór słów pod ciebie",
        d2t: "Kierunek powtórek", d2d: "system sam zdecyduje, jak pytać",
        d3t: "Zestaw startowy", d3d: "pierwsze słowa już na twój poziom",
        start: "Zacznij test", self: "Oceń się sam", skip: "Pomiń — kalibracja w tle",
        selfTitle: "Wybierz poziom sam", selfHint: "doprecyzujemy przez pierwsze sesje", save: "Zapisz i zacznij",
        footer: "Test możesz wykonać później lub zmienić poziom w dowolnej chwili w „Profilu”.",
        loading: "Przygotowujemy pytania…", dir: "Norweski → ", dirIn: " → Norweski", whats: "Co to znaczy?", dontKnow: "Nie wiem — pomiń",
        grading: "Liczymy…", passed: "Test ukończony", resTitle: "Poziom ustalony wstępnie",
        resDesc: "Będziemy go doprecyzowywać — dokładność wzrośnie przez pierwsze sesje.",
        yourLevel: "twój poziom", confLow: "niska", confMid: "średnia", confHigh: "wysoka",
        confLbl: "Pewność oceny", howAsk: "Jak będziemy pytać", auto: "auto",
        dirExplain: "Kierunek tłumaczenia wybiera system — dla każdego słowa osobno. W miarę wzmacniania słowa przełączamy z rozpoznawania na przypominanie.",
        begin: "Zacznij naukę",
        lvlD: { A1: "dopiero zaczynam", A2: "podstawowy", B1: "średni", B2: "pewny", C1: "zaawansowany", C2: "biegle" },
    },
    lt: {
        eyebrow: "Lygio testas · ~3 min", title1: "Nustatykime tavo", title2: "norvegų kalbos lygį",
        desc: "Adaptyvus testas pritaiko sudėtingumą prie tavo atsakymų. Bet kurį klausimą galima praleisti.",
        d1t: "CEFR lygis", d1d: "A1–C1 — žodžių parinkimas pagal tave",
        d2t: "Kartojimo kryptis", d2d: "sistema pati nuspręs, kaip klausti",
        d3t: "Pradinis rinkinys", d3d: "pirmieji žodžiai jau tavo lygio",
        start: "Pradėti testą", self: "Įvertinti save", skip: "Praleisti — kalibruoti fone",
        selfTitle: "Pasirink lygį pats", selfHint: "patikslinsime per pirmas sesijas", save: "Išsaugoti ir pradėti",
        footer: "Testą gali atlikti vėliau arba bet kada perskaičiuoti lygį „Profilyje“.",
        loading: "Ruošiame klausimus…", dir: "Norvegų → ", dirIn: " → Norvegų", whats: "Ką tai reiškia?", dontKnow: "Nežinau — praleisti",
        grading: "Skaičiuojame…", passed: "Testas baigtas", resTitle: "Lygis nustatytas preliminariai",
        resDesc: "Tikslinsime jį toliau — tikslumas augs per pirmas sesijas.",
        yourLevel: "tavo lygis", confLow: "žemas", confMid: "vidutinis", confHigh: "aukštas",
        confLbl: "Vertinimo tikrumas", howAsk: "Kaip klausime", auto: "auto",
        dirExplain: "Vertimo kryptį parenka sistema — kiekvienam žodžiui atskirai. Žodžiui stiprėjant perjungiame iš atpažinimo į prisiminimą.",
        begin: "Pradėti mokytis",
        lvlD: { A1: "tik pradedu", A2: "bazinis", B1: "vidutinis", B2: "užtikrintas", C1: "pažengęs", C2: "laisvai" },
    },
    lv: {
        eyebrow: "Līmeņa tests · ~3 min", title1: "Noteiksim tavu", title2: "norvēģu valodas līmeni",
        desc: "Adaptīvais tests pielāgo grūtību tavām atbildēm. Jebkuru jautājumu var izlaist.",
        d1t: "CEFR līmenis", d1d: "A1–C1 — vārdu atlase tev",
        d2t: "Atkārtošanas virziens", d2d: "sistēma pati izlems, kā jautāt",
        d3t: "Sākuma kopums", d3d: "pirmie vārdi jau tavā līmenī",
        start: "Sākt testu", self: "Novērtēt sevi pašam", skip: "Izlaist — kalibrēt fonā",
        selfTitle: "Izvēlies līmeni pats", selfHint: "precizēsim pirmajās sesijās", save: "Saglabāt un sākt",
        footer: "Testu var izpildīt vēlāk vai pārvērtēt līmeni jebkurā brīdī sadaļā „Profils“.",
        loading: "Sagatavojam jautājumus…", dir: "Norvēģu → ", dirIn: " → Norvēģu", whats: "Ko tas nozīmē?", dontKnow: "Nezinu — izlaist",
        grading: "Aprēķinām…", passed: "Tests pabeigts", resTitle: "Līmenis noteikts provizoriski",
        resDesc: "Precizēsim to gaitā — precizitāte augs pirmajās sesijās.",
        yourLevel: "tavs līmenis", confLow: "zema", confMid: "vidēja", confHigh: "augsta",
        confLbl: "Novērtējuma ticamība", howAsk: "Kā mēs tev jautāsim", auto: "auto",
        dirExplain: "Tulkojuma virzienu izvēlas sistēma — katram vārdam atsevišķi. Vārdam nostiprinoties, mēs pārslēdzam tevi no atpazīšanas uz atcerēšanos.",
        begin: "Sākt mācīties",
        lvlD: { A1: "tikai sāku", A2: "pamata", B1: "vidējais", B2: "pārliecināts", C1: "augstāks", C2: "brīvi" },
    },
    ar: {
        eyebrow: "اختبار تحديد المستوى · ~3 دقائق", title1: "لنحدّد مستواك", title2: "في النرويجية",
        desc: "يضبط الاختبار التكيّفي الصعوبة وفق إجاباتك. كلما كان المستوى أدقّ — كان اختيارنا للكلمات ووضع المراجعة أفضل. يمكنك تخطّي أي سؤال.",
        d1t: "مستوى CEFR", d1d: "A1–C1 — يخصّص اختيار كلماتك",
        d2t: "اتجاه المراجعة", d2d: "يقرّر النظام كيفية السؤال — لتذكّر أفضل",
        d3t: "مجموعة البداية", d3d: "أول الكلمات على مستواك بالفعل",
        start: "ابدأ الاختبار", self: "قيّم نفسك", skip: "تخطّ — المعايرة في الخلفية",
        selfTitle: "اختر مستواك", selfHint: "سنحسّنه خلال الجلسات الأولى", save: "احفظ وابدأ",
        footer: "يمكنك إجراء الاختبار لاحقًا أو إعادة تقييم مستواك في أي وقت من «الملف الشخصي».",
        loading: "نجهّز الأسئلة…", dir: "النرويجية ← ", dirIn: " ← النرويجية", whats: "ماذا يعني هذا؟", dontKnow: "لا أعرف — تخطّ",
        grading: "جارٍ الحساب…", passed: "اكتمل الاختبار", resTitle: "حُدّد المستوى مبدئيًا",
        resDesc: "سنحسّنه أثناء التقدّم — تنمو الدقة خلال جلساتك الأولى. الكلمات والصعوبة مضبوطة.",
        yourLevel: "مستواك", confLow: "منخفضة", confMid: "متوسطة", confHigh: "عالية",
        confLbl: "ثقة التقدير", howAsk: "كيف سنسألك", auto: "تلقائي",
        dirExplain: "يختار النظام اتجاه الترجمة — لكل كلمة على حدة. مع قوّة الكلمة ننقلك من التعرّف إلى الاستحضار: هكذا تستقرّ في الذاكرة طويلة الأمد.",
        begin: "ابدأ التعلّم",
        lvlD: { A1: "بدأت للتو", A2: "أساسي", B1: "متوسط", B2: "واثق", C1: "متقدّم", C2: "بطلاقة" },
    },
}, "PlacementScreen.T");

export default function PlacementScreen({ lang = "ru", onClose }) {
    const t = T[lang] || T.ru;
    const [phase, setPhase] = useState("intro");   // intro | play | result
    const [selfOpen, setSelfOpen] = useState(false);
    const [selfLevel, setSelfLevel] = useState("B1");
    const [questions, setQuestions] = useState([]);
    const [qi, setQi] = useState(0);
    const [answers, setAnswers] = useState([]);    // [{no, level, answer}]
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const cur = questions[qi] || null;
    const levelsInTest = useMemo(
        () => LEVELS.filter((lv) => questions.some((q) => q.level === lv)),
        [questions]
    );

    // --- запуск теста ---
    const beginTest = async () => {
        setBusy(true);
        try {
            const r = await api.placementGet(lang, 4);
            const qs = (r?.questions || []).slice().sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
            if (!qs.length) { onClose?.(false); return; }
            setQuestions(qs); setQi(0); setAnswers([]); setPhase("play");
        } catch { onClose?.(false); }
        finally { setBusy(false); }
    };

    const answer = (val) => {
        if (!cur) return;
        const type = cur.type || "choice"; // старый формат без type → choice (обратная совместимость)
        const next = [...answers, { no: cur.no, level: cur.level, answer: val || "", type }];
        setAnswers(next);
        if (qi + 1 >= questions.length) grade(next);
        else setQi(qi + 1);
    };

    const grade = async (all) => {
        setBusy(true); setPhase("result");
        try {
            const r = await api.placementGrade({ lang, answers: all });
            const answered = all.filter((a) => a.answer).length;
            const conf = all.length ? Math.round((answered / all.length) * 100) : 0;
            setResult({ level: r?.level || "A1", conf });
        } catch { setResult({ level: "A1", conf: 0 }); }
        finally { setBusy(false); }
    };

    const saveSelf = async () => {
        setBusy(true);
        try { await api.placementLevel(selfLevel); onClose?.(true); }
        catch { onClose?.(true); }
        finally { setBusy(false); }
    };

    // ====== INTRO ======
    if (phase === "intro") {
        return (
            <div className="study-root" style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "auto", background: "var(--canvas)" }}>
                <main className="shell study-main">
                    <div className="plc-wrap">
                        <div className="plc-hero">
                            <span className="plc-hero__halo" /><span className="plc-hero__halo2" />
                            <span className="plc-hero__eyebrow"><Icon n="graduation" sm /> {t.eyebrow}</span>
                            <div className="plc-hero__title">{t.title1}<br />{t.title2}</div>
                            <p className="plc-hero__desc">{t.desc}</p>
                            <div className="plc-detect">
                                <div className="plc-detect__c"><Icon n="target" /><span className="plc-detect__t">{t.d1t}</span><span className="plc-detect__d">{t.d1d}</span></div>
                                <div className="plc-detect__c"><Icon n="repeat" /><span className="plc-detect__t">{t.d2t}</span><span className="plc-detect__d">{t.d2d}</span></div>
                                <div className="plc-detect__c"><Icon n="sparkles" /><span className="plc-detect__t">{t.d3t}</span><span className="plc-detect__d">{t.d3d}</span></div>
                            </div>
                            <div className="plc-actions">
                                <button className="plc-hero__btn" onClick={beginTest} disabled={busy}><Icon n="play" /> {t.start}</button>
                                <div className="plc-hero__alt">
                                    <button className="plc-hero__ghost" onClick={() => setSelfOpen((v) => !v)}><Icon n="user" sm /> {t.self}</button>
                                    <button className="plc-hero__ghost" onClick={() => onClose?.(false)}><Icon n="clock" sm /> {t.skip}</button>
                                </div>
                            </div>
                        </div>

                        {selfOpen && (
                            <div className="plc-self">
                                <div className="card" style={{ padding: "var(--sp-5)" }}>
                                    <div className="flex-between" style={{ marginBottom: "var(--sp-4)" }}>
                                        <strong>{t.selfTitle}</strong>
                                        <span className="st-cold-note">{t.selfHint}</span>
                                    </div>
                                    <div className="plc-self__chips">
                                        {["A1", "A2", "B1", "B2", "C1"].map((lv) => (
                                            <button key={lv} className={"lvl-chip" + (selfLevel === lv ? " is-on" : "")} onClick={() => setSelfLevel(lv)}>
                                                <span className="lvl-chip__t">{lv}</span>
                                                <span className="lvl-chip__d">{t.lvlD[lv]}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn btn--primary btn--lg" style={{ marginTop: "var(--sp-5)" }} onClick={saveSelf} disabled={busy}>
                                        <Icon n="check" sm /> {t.save}
                                    </button>
                                </div>
                            </div>
                        )}

                        <p className="st-cold-note" style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>{t.footer}</p>
                    </div>
                </main>
            </div>
        );
    }

    // ====== PLAY ======
    if (phase === "play") {
        const pct = questions.length ? Math.round(((qi) / questions.length) * 100) : 0;
        const curIdx = LEVELS.indexOf(cur?.level);
        return (
            <div className="study-root">
                <div className="plc-stage">
                    <div className="plc-top">
                        <button className="plc-top__back" onClick={() => onClose?.(false)} aria-label="close"><Icon n="x" /></button>
                        <div className="plc-bar"><span style={{ width: `${pct}%` }} /></div>
                        <span className="plc-count">{qi + 1} / {questions.length}</span>
                    </div>
                    <div className="ladder">
                        {levelsInTest.map((lv) => {
                            const idx = LEVELS.indexOf(lv);
                            const klass = idx < curIdx ? " is-done" : idx === curIdx ? " is-now" : "";
                            return (
                                <div key={lv} className={"ladder__step" + klass}>
                                    <span className="ladder__bar" /><span className="ladder__lbl">{lv}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="plc-q">
                        {(cur?.type || "choice") === "input" ? (
                            <InputQuestion
                                prompt={cur?.prompt}
                                promptLang={hyLang(lang, false)}
                                lang={lang}
                                onSubmit={(text) => answer(text)}
                                hint={<><Icon n="globe" sm /> {ENDONYM[lang] || lang}{t.dirIn}</>}
                            >
                                <button className="plc-skip" onClick={() => answer("")}><Icon n="arrow-right" sm /> {t.dontKnow}</button>
                            </InputQuestion>
                        ) : (
                            <ChoiceQuestion
                                prompt={cur?.no}
                                promptLang="no"
                                options={cur?.options || []}
                                reveal={false}
                                onPick={(opt) => answer(opt)}
                                hint={<><Icon n="globe" sm /> {t.dir}{ENDONYM[lang] || lang}</>}
                            >
                                <button className="plc-skip" onClick={() => answer("")}><Icon n="arrow-right" sm /> {t.dontKnow}</button>
                            </ChoiceQuestion>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ====== RESULT ======
    const conf = result?.conf ?? 0;
    const confWord = conf >= 70 ? t.confHigh : conf >= 40 ? t.confMid : t.confLow;
    return (
        <div className="study-root" style={{ position: "fixed", inset: 0, zIndex: 95, overflow: "auto", background: "var(--canvas)" }}>
            <main className="shell study-main">
                <div className="plc-wrap plc-result">
                    <div className="plc-rhero">
                        <div className="plc-cefr"><div style={{ textAlign: "center" }}>
                            <div className="plc-cefr__lvl">{busy ? "…" : (result?.level || "A1")}</div>
                            <div className="plc-cefr__sub">{t.yourLevel}</div>
                        </div></div>
                        <div className="plc-rhero__txt">
                            <span className="eyebrow" style={{ color: "var(--fjord-600)" }}><Icon n="check-circle" sm /> {t.passed}</span>
                            <div className="plc-rhero__title">{t.resTitle}</div>
                            <p className="muted" style={{ fontSize: "var(--fs-15)", lineHeight: 1.5, margin: 0 }}>{t.resDesc}</p>
                            <div className="conf">
                                <div className="conf__track"><span className="conf__fill" style={{ width: `${Math.max(8, conf)}%` }} /></div>
                                <span className="conf__lbl">{t.confLbl}: {confWord}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: "var(--sp-5)" }}>
                        <div className="flex-between" style={{ marginBottom: "var(--sp-3)" }}>
                            <strong style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon n="repeat" sm /> {t.howAsk}</strong>
                            <span className="sbadge sbadge--review"><Icon n="sparkles" sm /> {t.auto}</span>
                        </div>
                        <p className="muted" style={{ fontSize: "var(--fs-14)", lineHeight: 1.5, margin: 0 }}>{t.dirExplain}</p>
                    </div>

                    <button className="btn btn--primary btn--lg btn--block" onClick={() => onClose?.(true)} disabled={busy}>
                        <Icon n="play" sm /> {t.begin}
                    </button>
                </div>
            </main>
        </div>
    );
}
