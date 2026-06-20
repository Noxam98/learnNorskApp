// Вкладка «Экзамен» раздела «Учёба». Три состояния (локальный стейт, не URL):
//   settings → play (тёмный фокус-оверлей) → results.
// Каждый ответ пишется в SRS через api.learningAnswer. Локальная 5-язычная i18n.
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../components/tools/api.js";
import { Icon } from "../../components/ui/Icon.jsx";
import { speakText } from "../../components/ui/tts.js";
import { interfaceTranslate } from "../../interface/interfaceTranslation.jsx";
import { posMeta, posLabel } from "../../components/ui/pos.js";
import { useSystemStore } from "../../store/systemStore.jsx";

// ---------- Локальная i18n (ru/en/ukr/pl/lt) ----------
const T = {
    ru: {
        scope: "Охват", scopeDue: "К повторению", scopeAll: "Все слова", scopeTopic: "Тема",
        scopeLevel: "Уровень", scopeWeak: "Только слабые",
        pickTopic: "Выберите тему", pickLevel: "Выберите уровень",
        count: "Число слов", qtypes: "Типы вопросов · вперемешку",
        tChoice: "Выбор", tInput: "Ввод", tListen: "Аудирование",
        conditions: "Условия", timer: "Таймер на сессию", noHints: "Без подсказок",
        summary: "Сводка экзамена", sWords: "Слов", sTypes: "Типы", sTimer: "Таймер",
        sDiff: "Сложность", offText: "Выкл.",
        start: "Начать экзамен", focusNote: "Прохождение в режиме фокуса · прогресс не теряется",
        empty: "Нет слов под выбранный охват. Измените настройки или добавьте слова в учёбу.",
        loading: "Готовим экзамен…",
        norWord: "Норвежское слово", listenHint: "Прослушайте и введите перевод",
        inputHint: "Введите перевод · без подсказок", choiceHint: "Выберите перевод · без подсказок",
        placeholder: "перевод…", answer: "Ответить", replay: "Повторить",
        exitConfirm: "Прервать экзамен? Результаты текущей сессии не сохранятся.",
        gradeExcellent: "Отличный результат", gradeGood: "Хорошо", gradeKeep: "Продолжай",
        correctOf: (k, n) => `${k} из ${n} верно`,
        breakdown: "По темам и уровням", errors: "Разбор ошибок",
        noErrors: "Ошибок нет — отличная работа!",
        sendToReview: "Отправить ошибки в повторение", retry: "Пройти заново",
        backToStudy: "Вернуться в Учёбу", sentToast: "Ошибки отправлены в повторение",
        levelLabel: "Уровень", anyLevel: "Любой",
    },
    en: {
        scope: "Scope", scopeDue: "Due", scopeAll: "All words", scopeTopic: "Topic",
        scopeLevel: "Level", scopeWeak: "Weak only",
        pickTopic: "Pick a topic", pickLevel: "Pick a level",
        count: "Word count", qtypes: "Question types · mixed",
        tChoice: "Choice", tInput: "Typing", tListen: "Listening",
        conditions: "Conditions", timer: "Session timer", noHints: "No hints",
        summary: "Exam summary", sWords: "Words", sTypes: "Types", sTimer: "Timer",
        sDiff: "Difficulty", offText: "Off",
        start: "Start exam", focusNote: "Focus mode · progress is not lost",
        empty: "No words for this scope. Change settings or add words to study.",
        loading: "Preparing exam…",
        norWord: "Norwegian word", listenHint: "Listen and type the translation",
        inputHint: "Type the translation · no hints", choiceHint: "Choose the translation · no hints",
        placeholder: "translation…", answer: "Answer", replay: "Replay",
        exitConfirm: "Abort the exam? Current session results won't be saved.",
        gradeExcellent: "Excellent result", gradeGood: "Good", gradeKeep: "Keep going",
        correctOf: (k, n) => `${k} of ${n} correct`,
        breakdown: "By topics and levels", errors: "Mistakes review",
        noErrors: "No mistakes — great job!",
        sendToReview: "Send mistakes to review", retry: "Try again",
        backToStudy: "Back to Study", sentToast: "Mistakes sent to review",
        levelLabel: "Level", anyLevel: "Any",
    },
    ukr: {
        scope: "Охоплення", scopeDue: "До повторення", scopeAll: "Усі слова", scopeTopic: "Тема",
        scopeLevel: "Рівень", scopeWeak: "Лише слабкі",
        pickTopic: "Оберіть тему", pickLevel: "Оберіть рівень",
        count: "Кількість слів", qtypes: "Типи питань · вперемішку",
        tChoice: "Вибір", tInput: "Введення", tListen: "Аудіювання",
        conditions: "Умови", timer: "Таймер на сесію", noHints: "Без підказок",
        summary: "Зведення екзамену", sWords: "Слів", sTypes: "Типи", sTimer: "Таймер",
        sDiff: "Складність", offText: "Вимк.",
        start: "Почати екзамен", focusNote: "Проходження у режимі фокуса · прогрес не втрачається",
        empty: "Немає слів під обране охоплення. Змініть налаштування або додайте слова.",
        loading: "Готуємо екзамен…",
        norWord: "Норвезьке слово", listenHint: "Прослухайте та введіть переклад",
        inputHint: "Введіть переклад · без підказок", choiceHint: "Оберіть переклад · без підказок",
        placeholder: "переклад…", answer: "Відповісти", replay: "Повторити",
        exitConfirm: "Перервати екзамен? Результати поточної сесії не збережуться.",
        gradeExcellent: "Відмінний результат", gradeGood: "Добре", gradeKeep: "Продовжуй",
        correctOf: (k, n) => `${k} з ${n} вірно`,
        breakdown: "За темами та рівнями", errors: "Розбір помилок",
        noErrors: "Помилок немає — чудова робота!",
        sendToReview: "Надіслати помилки на повторення", retry: "Пройти знову",
        backToStudy: "Повернутися до Навчання", sentToast: "Помилки надіслано на повторення",
        levelLabel: "Рівень", anyLevel: "Будь-який",
    },
    pl: {
        scope: "Zakres", scopeDue: "Do powtórki", scopeAll: "Wszystkie słowa", scopeTopic: "Temat",
        scopeLevel: "Poziom", scopeWeak: "Tylko słabe",
        pickTopic: "Wybierz temat", pickLevel: "Wybierz poziom",
        count: "Liczba słów", qtypes: "Typy pytań · na przemian",
        tChoice: "Wybór", tInput: "Wpisywanie", tListen: "Słuchanie",
        conditions: "Warunki", timer: "Timer na sesję", noHints: "Bez podpowiedzi",
        summary: "Podsumowanie egzaminu", sWords: "Słów", sTypes: "Typy", sTimer: "Timer",
        sDiff: "Trudność", offText: "Wył.",
        start: "Rozpocznij egzamin", focusNote: "Tryb skupienia · postęp nie ginie",
        empty: "Brak słów dla tego zakresu. Zmień ustawienia lub dodaj słowa do nauki.",
        loading: "Przygotowujemy egzamin…",
        norWord: "Norweskie słowo", listenHint: "Posłuchaj i wpisz tłumaczenie",
        inputHint: "Wpisz tłumaczenie · bez podpowiedzi", choiceHint: "Wybierz tłumaczenie · bez podpowiedzi",
        placeholder: "tłumaczenie…", answer: "Odpowiedz", replay: "Powtórz",
        exitConfirm: "Przerwać egzamin? Wyniki bieżącej sesji nie zostaną zapisane.",
        gradeExcellent: "Świetny wynik", gradeGood: "Dobrze", gradeKeep: "Tak trzymaj",
        correctOf: (k, n) => `${k} z ${n} poprawnie`,
        breakdown: "Wg tematów i poziomów", errors: "Analiza błędów",
        noErrors: "Brak błędów — świetna robota!",
        sendToReview: "Wyślij błędy do powtórki", retry: "Spróbuj ponownie",
        backToStudy: "Wróć do Nauki", sentToast: "Błędy wysłane do powtórki",
        levelLabel: "Poziom", anyLevel: "Dowolny",
    },
    lt: {
        scope: "Apimtis", scopeDue: "Kartoti", scopeAll: "Visi žodžiai", scopeTopic: "Tema",
        scopeLevel: "Lygis", scopeWeak: "Tik silpni",
        pickTopic: "Pasirinkite temą", pickLevel: "Pasirinkite lygį",
        count: "Žodžių skaičius", qtypes: "Klausimų tipai · maišyti",
        tChoice: "Pasirinkimas", tInput: "Rašymas", tListen: "Klausymas",
        conditions: "Sąlygos", timer: "Sesijos laikmatis", noHints: "Be užuominų",
        summary: "Egzamino santrauka", sWords: "Žodžių", sTypes: "Tipai", sTimer: "Laikmatis",
        sDiff: "Sudėtingumas", offText: "Išj.",
        start: "Pradėti egzaminą", focusNote: "Susitelkimo režimas · pažanga neprarandama",
        empty: "Šiai apimčiai žodžių nėra. Pakeiskite nustatymus arba pridėkite žodžių.",
        loading: "Ruošiame egzaminą…",
        norWord: "Norvegiškas žodis", listenHint: "Klausykite ir įveskite vertimą",
        inputHint: "Įveskite vertimą · be užuominų", choiceHint: "Pasirinkite vertimą · be užuominų",
        placeholder: "vertimas…", answer: "Atsakyti", replay: "Kartoti",
        exitConfirm: "Nutraukti egzaminą? Šios sesijos rezultatai nebus išsaugoti.",
        gradeExcellent: "Puikus rezultatas", gradeGood: "Gerai", gradeKeep: "Tęsk",
        correctOf: (k, n) => `${k} iš ${n} teisingai`,
        breakdown: "Pagal temas ir lygius", errors: "Klaidų analizė",
        noErrors: "Klaidų nėra — puikus darbas!",
        sendToReview: "Siųsti klaidas kartoti", retry: "Bandyti dar kartą",
        backToStudy: "Atgal į Mokymąsi", sentToast: "Klaidos išsiųstos kartoti",
        levelLabel: "Lygis", anyLevel: "Bet koks",
    },
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const COUNT_PRESETS = [10, 20, 30, 50];
const ALL_TYPES = ["choice", "input", "listen"];
const SESSION_SECONDS = 8 * 60; // 8:00 на сессию

// Перевод слова на текущий язык: первый вариант — «правильный» ответ.
const trList = (w, lang) => (w?.translate?.[lang] || w?.translate?.ru || []).filter(Boolean);
const firstTr = (w, lang) => trList(w, lang)[0] || "";

const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

// Свободный ответ считаем верным, если совпадает с любым из вариантов перевода.
const inputMatches = (given, w, lang) => {
    const g = norm(given);
    if (!g) return false;
    return trList(w, lang).some((v) => norm(v) === g);
};

const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

export default function ExamTab({ lang, go, openWord, refresh }) {
    const t = T[lang] || T.ru;
    const tg = interfaceTranslate[lang] || interfaceTranslate.ru || {};
    const topicNames = tg.topics || {};
    const showToast = useSystemStore((s) => s.showToast);

    const [phase, setPhase] = useState("settings"); // settings | play | results

    // --- настройки ---
    const [scope, setScope] = useState("due");
    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState("A2");
    const [count, setCount] = useState(20);
    const [types, setTypes] = useState(["choice", "input", "listen"]);
    const [timerOn, setTimerOn] = useState(true);
    const [loading, setLoading] = useState(false);

    // --- ход экзамена ---
    const [questions, setQuestions] = useState([]); // [{ word, type, options? }]
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState([]);     // [{ word, type, given, correct }]
    const [given, setGiven] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

    const startedRef = useRef(0);     // время старта текущего вопроса
    const inputRef = useRef(null);
    const finishRef = useRef(null);   // актуальная функция завершения для таймера

    const topicKeys = useMemo(() => Object.keys(topicNames), [topicNames]);

    // Готовый список тем берём из самого пула слов учёбы (чтобы не показывать пустые).
    const [availTopics, setAvailTopics] = useState([]);
    useEffect(() => {
        let on = true;
        api.learningList({ limit: 500 })
            .then((r) => {
                if (!on) return;
                const set = new Set();
                (r?.words || []).forEach((w) => (w.topics || []).forEach((tp) => set.add(tp)));
                const ordered = topicKeys.filter((k) => set.has(k));
                const extra = [...set].filter((k) => !topicKeys.includes(k));
                setAvailTopics([...ordered, ...extra]);
            })
            .catch(() => {});
        return () => { on = false; };
    }, [topicKeys]);

    // При выборе охвата «Тема» подставим первую доступную тему.
    useEffect(() => {
        if (scope === "topic" && !topic && availTopics.length) setTopic(availTopics[0]);
    }, [scope, topic, availTopics]);

    const toggleType = (k) => {
        setTypes((prev) => {
            if (prev.includes(k)) {
                const next = prev.filter((x) => x !== k);
                return next.length ? next : prev; // хотя бы один тип обязателен
            }
            return [...prev, k];
        });
    };

    const setCountClamped = (n) => setCount(Math.max(1, Math.min(100, n)));

    // ---------- Сбор набора слов и старт ----------
    const fetchSet = async () => {
        if (scope === "due") {
            const r = await api.learningDue(Math.max(count, 1));
            return r?.words || [];
        }
        const opts = {};
        if (scope === "weak") opts.status = "weak";
        else if (scope === "level") opts.level = level;
        else if (scope === "topic") opts.topic = topic;
        const r = await api.learningList(opts);
        return r?.words || [];
    };

    // Тип вопроса для слова: случайный из выбранных; «listen» только если есть TTS.
    const pickType = (w, selected) => {
        let pool = selected;
        if (!w?.hasTts) pool = selected.filter((x) => x !== "listen");
        if (!pool.length) pool = ["input"]; // фолбэк, если остался только listen без tts
        return pool[Math.floor(Math.random() * pool.length)];
    };

    // Дистракторы для choice: 3 чужих перевода (по первому варианту), без дублей.
    const buildOptions = (w, allWords, l) => {
        const correct = firstTr(w, l);
        const seen = new Set([norm(correct)]);
        const pool = shuffle(allWords.filter((x) => x.pool_id !== w.pool_id));
        const opts = [];
        for (const x of pool) {
            const cand = firstTr(x, l);
            if (cand && !seen.has(norm(cand))) { seen.add(norm(cand)); opts.push(cand); }
            if (opts.length === 3) break;
        }
        return shuffle([correct, ...opts]);
    };

    const onStart = async () => {
        setLoading(true);
        try {
            const set = await fetchSet();
            const valid = (set || []).filter((w) => firstTr(w, lang));
            if (!valid.length) { showToast?.(t.empty); setLoading(false); return; }

            const chosen = shuffle(valid).slice(0, count);
            const qs = chosen.map((w) => {
                const type = pickType(w, types);
                const q = { word: w, type };
                if (type === "choice") q.options = buildOptions(w, valid, lang);
                return q;
            });

            setQuestions(qs);
            setAnswers([]);
            setIdx(0);
            setGiven("");
            setSecondsLeft(SESSION_SECONDS);
            startedRef.current = Date.now();
            setPhase("play");
        } catch {
            showToast?.(t.empty);
        } finally {
            setLoading(false);
        }
    };

    // ---------- Таймер сессии ----------
    useEffect(() => {
        if (phase !== "play" || !timerOn) return;
        const id = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) { clearInterval(id); finishRef.current?.(); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [phase, timerOn]);

    // Автофокус на поле ввода для input/listen.
    const current = questions[idx];
    useEffect(() => {
        if (phase === "play" && current && current.type !== "choice") {
            const id = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(id);
        }
    }, [phase, idx, current]);

    // Озвучка для аудио-вопроса при появлении.
    useEffect(() => {
        if (phase === "play" && current?.type === "listen") {
            speakText(current.word.no);
        }
    }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps

    const recordAndAdvance = (isCorrect, givenVal) => {
        const q = current;
        const elapsed = Math.max(0, Math.round((Date.now() - startedRef.current) / 1000));
        api.learningAnswer({ pool_id: q.word.pool_id, correct: isCorrect, elapsed, mode: q.type }).catch(() => {});

        const entry = { word: q.word, type: q.type, given: givenVal, correct: isCorrect };
        const nextAnswers = [...answers, entry];
        setAnswers(nextAnswers);

        if (idx + 1 >= questions.length) {
            setPhase("results");
        } else {
            setIdx(idx + 1);
            setGiven("");
            startedRef.current = Date.now();
        }
    };

    const onChoice = (opt) => {
        if (!current) return;
        recordAndAdvance(norm(opt) === norm(firstTr(current.word, lang)), opt);
    };

    const onSubmitInput = () => {
        if (!current) return;
        recordAndAdvance(inputMatches(given, current.word, lang), given.trim());
    };

    // Завершение по таймеру: оставшиеся вопросы засчитываем как неотвеченные (неверно).
    const finishByTimer = () => {
        const remaining = questions.slice(idx);
        const extra = remaining.map((q) => {
            api.learningAnswer({ pool_id: q.word.pool_id, correct: false, elapsed: 0, mode: q.type }).catch(() => {});
            return { word: q.word, type: q.type, given: "", correct: false };
        });
        setAnswers((prev) => [...prev, ...extra]);
        setPhase("results");
    };
    finishRef.current = finishByTimer;

    const exitPlay = () => {
        if (window.confirm(t.exitConfirm)) {
            setPhase("settings");
            setQuestions([]);
            setAnswers([]);
            setIdx(0);
        }
    };

    // ---------- Результаты ----------
    const stats = useMemo(() => {
        const total = answers.length;
        const right = answers.filter((a) => a.correct).length;
        const pct = total ? Math.round((right / total) * 100) : 0;

        const byTopic = {};
        const byLevel = {};
        const bump = (map, key, ok) => {
            if (!key) return;
            if (!map[key]) map[key] = { ok: 0, n: 0 };
            map[key].n += 1;
            if (ok) map[key].ok += 1;
        };
        answers.forEach((a) => {
            (a.word.topics || []).forEach((tp) => bump(byTopic, tp, a.correct));
            bump(byLevel, a.word.level, a.correct);
        });
        const toRows = (map) => Object.entries(map)
            .map(([k, v]) => ({ key: k, val: Math.round((v.ok / v.n) * 100) }))
            .sort((x, y) => y.val - x.val);

        return {
            total, right, pct,
            topicRows: toRows(byTopic),
            levelRows: toRows(byLevel),
            errors: answers.filter((a) => !a.correct),
        };
    }, [answers]);

    const onSendErrors = () => {
        // Ошибки уже записаны как неверные через learningAnswer → они уже «к повторению».
        // Здесь только подтверждаем действие пользователю.
        showToast?.(t.sentToast);
        go("today");
        refresh?.();
    };

    const onRetry = () => {
        setPhase("settings");
        setQuestions([]);
        setAnswers([]);
        setIdx(0);
        setGiven("");
    };

    const onBackToStudy = () => {
        go("today");
        refresh?.();
    };

    // ====================================================================
    // PLAY (тёмный фокус-оверлей)
    // ====================================================================
    if (phase === "play" && current) {
        const w = current.word;
        const progressPct = Math.round((idx / questions.length) * 100);
        const hint = current.type === "choice" ? t.choiceHint
            : current.type === "listen" ? t.listenHint : t.inputHint;
        const hintIcon = current.type === "choice" ? "graduation"
            : current.type === "listen" ? "headphones" : "type";

        return (
            <div className="exam-stage" style={overlay}>
                <div className="exam-bar">
                    <button className="exam-bar__back" onClick={exitPlay} aria-label="exit"><Icon n="x" /></button>
                    <div className="exam-progress"><span style={{ width: `${progressPct}%` }} /></div>
                    <span className="exam-count">{idx + 1} / {questions.length}</span>
                    {timerOn && (
                        <span className="exam-timer"><Icon n="clock" sm /> {fmtTime(secondsLeft)}</span>
                    )}
                </div>

                <div style={stageBody}>
                    <span className="session-pill" style={{ background: "var(--game-surface)" }}>
                        <Icon n={hintIcon} sm /> {hint}
                    </span>

                    <div>
                        <div style={eyebrow}>{current.type === "listen" ? t.norWord : t.norWord}</div>
                        {current.type === "listen" ? (
                            <button onClick={() => speakText(w.no)} style={speakerBtn} aria-label="play">
                                <Icon n="headphones" />
                            </button>
                        ) : (
                            <div style={bigWord}>{w.no}</div>
                        )}
                        {current.type === "listen" && (
                            <button onClick={() => speakText(w.no)} style={replayBtn}>
                                <Icon n="rotate" sm /> {t.replay}
                            </button>
                        )}
                    </div>

                    {current.type === "choice" ? (
                        <div style={choiceWrap}>
                            {current.options.map((opt) => (
                                <button key={opt} onClick={() => onChoice(opt)} style={choiceOpt}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--game-accent)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--game-border)"; }}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={inputWrap}>
                            <input ref={inputRef} className="input" style={darkInput}
                                placeholder={t.placeholder} value={given}
                                onChange={(e) => setGiven(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") onSubmitInput(); }} />
                            <button className="session-btn" style={{ justifyContent: "center", width: "100%" }}
                                onClick={onSubmitInput}>
                                <Icon n="check" sm /> {t.answer}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ====================================================================
    // RESULTS
    // ====================================================================
    if (phase === "results") {
        const { pct, right, total, topicRows, levelRows, errors } = stats;
        const grade = pct >= 80 ? t.gradeExcellent : pct >= 60 ? t.gradeGood : t.gradeKeep;
        const gradeColor = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--st-learn)" : "var(--st-weak)";
        const C = 2 * Math.PI * 52; // длина окружности r=52
        const dashOffset = C * (1 - pct / 100);
        const barColor = (v) => v >= 80 ? "var(--st-master)" : v >= 60 ? "var(--st-learn)" : "var(--st-weak)";
        const topicLabel = (k) => topicNames[k] || k;

        return (
            <div className="exam-grid">
                {/* левая колонка: оценка + ошибки */}
                <div className="col" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                    <div className="spanel">
                        <div className="spanel__body">
                            <div className="grade-hero">
                                <div className="ring grade-ring" style={{ "--size": "148px" }}>
                                    <svg className="ring__svg" viewBox="0 0 120 120">
                                        <circle className="ring__bg" cx="60" cy="60" r="52" />
                                        <circle className="ring__fg" cx="60" cy="60" r="52"
                                            stroke={gradeColor}
                                            strokeDasharray={C.toFixed(1)}
                                            strokeDashoffset={dashOffset.toFixed(1)} />
                                    </svg>
                                    <span className="ring__label">
                                        <span className="grade-big">{pct}<small style={{ fontSize: "var(--fs-24)" }}>%</small></span>
                                    </span>
                                </div>
                                <div className="col" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <span className="grade-cefr" style={{ background: gradeColor }}>
                                        <Icon n="check" sm style={{ marginRight: 7 }} /> {grade}
                                    </span>
                                    <div style={{ fontSize: "var(--fs-15)", fontWeight: 700 }}>
                                        {t.correctOf(right, total)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="spanel">
                        <div className="spanel__head">
                            <span className="spanel__title">{t.errors} · {errors.length}</span>
                        </div>
                        <div className="spanel__body" style={{ paddingTop: "var(--sp-3)" }}>
                            {errors.length === 0 ? (
                                <div className="muted" style={{ fontSize: "var(--fs-14)" }}>{t.noErrors}</div>
                            ) : (
                                <div className="errlist">
                                    {errors.map((e, i) => {
                                        const m = posMeta(e.word.part_of_speech);
                                        return (
                                            <div className="errrow" key={`${e.word.pool_id}-${i}`}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => openWord?.(e.word.no, e.word.pool_id)}>
                                                <span className="errrow__ic"><Icon n="x-circle" /></span>
                                                <span className="errrow__w">{e.word.no}</span>
                                                <span className={`chip pos ${m.cls}`} style={{ padding: "2px 8px", fontSize: 11 }}>
                                                    {posLabel(e.word.part_of_speech, tg)}
                                                </span>
                                                <span className="errrow__correct">
                                                    <span className="errrow__bad">{e.given || "—"}</span>
                                                    {" → "}<b>{firstTr(e.word, lang)}</b>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* правая колонка: разбивка + действия */}
                <div className="col" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                    <div className="spanel">
                        <div className="spanel__head"><span className="spanel__title">{t.breakdown}</span></div>
                        <div className="spanel__body">
                            <div className="breakdown">
                                {topicRows.map((r) => (
                                    <div className="bd-row" key={`tp-${r.key}`}>
                                        <div className="bd-row__top">
                                            <span className="bd-row__name">{topicLabel(r.key)}</span>
                                            <span className="bd-row__val">{r.val}%</span>
                                        </div>
                                        <div className="lvl-track"><span style={{ width: `${r.val}%`, background: barColor(r.val) }} /></div>
                                    </div>
                                ))}
                                {topicRows.length > 0 && levelRows.length > 0 && (
                                    <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                                )}
                                {levelRows.map((r) => (
                                    <div className="bd-row" key={`lv-${r.key}`}>
                                        <div className="bd-row__top">
                                            <span className="bd-row__name">{r.key}</span>
                                            <span className="bd-row__val">{r.val}%</span>
                                        </div>
                                        <div className="lvl-track"><span style={{ width: `${r.val}%`, background: barColor(r.val) }} /></div>
                                    </div>
                                ))}
                                {topicRows.length === 0 && levelRows.length === 0 && (
                                    <div className="muted" style={{ fontSize: "var(--fs-14)" }}>—</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="spanel">
                        <div className="spanel__body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                            <button className="btn btn--accent btn--lg btn--block" onClick={onSendErrors}
                                disabled={errors.length === 0}>
                                <Icon n="rotate" sm /> {t.sendToReview}
                            </button>
                            <button className="btn btn--outline btn--block" onClick={onRetry}>
                                <Icon n="rotate" sm /> {t.retry}
                            </button>
                            <button className="btn btn--ghost btn--block" onClick={onBackToStudy}>
                                <Icon n="graduation" sm /> {t.backToStudy}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ====================================================================
    // SETTINGS (по умолчанию)
    // ====================================================================
    const scopeOpts = [
        { key: "due", icon: "rotate", label: t.scopeDue },
        { key: "all", icon: "type", label: t.scopeAll },
        { key: "topic", icon: "graduation", label: t.scopeTopic },
        { key: "level", icon: "graduation", label: t.scopeLevel },
        { key: "weak", icon: "x-circle", label: t.scopeWeak },
    ];
    const typeOpts = [
        { key: "choice", icon: "check-circle", label: t.tChoice },
        { key: "input", icon: "type", label: t.tInput },
        { key: "listen", icon: "headphones", label: t.tListen },
    ];
    const scopeSummary = scopeOpts.find((s) => s.key === scope)?.label || "";
    const typeSummary = typeOpts.filter((x) => types.includes(x.key)).map((x) => x.label).join(" · ");

    return (
        <div className="exam-grid">
            {/* настройки */}
            <div className="spanel">
                <div className="spanel__body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>

                    <div className="opt-group">
                        <span className="opt-label">{t.scope}</span>
                        <div className="opt-row">
                            {scopeOpts.map((s) => (
                                <button key={s.key} className={"opt" + (scope === s.key ? " is-on" : "")}
                                    onClick={() => setScope(s.key)}>
                                    <Icon n={s.icon} /> {s.label}
                                </button>
                            ))}
                        </div>
                        {scope === "topic" && (
                            <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}
                                style={{ marginTop: "var(--sp-2)" }}>
                                {availTopics.length === 0 && <option value="">{t.pickTopic}</option>}
                                {availTopics.map((k) => (
                                    <option key={k} value={k}>{topicNames[k] || k}</option>
                                ))}
                            </select>
                        )}
                        {scope === "level" && (
                            <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}
                                style={{ marginTop: "var(--sp-2)" }}>
                                {LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="opt-group">
                        <span className="opt-label">{t.count}</span>
                        <div className="row" style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
                            <div className="stepper">
                                <button onClick={() => setCountClamped(count - 1)}>−</button>
                                <span className="stepper__val">{count}</span>
                                <button onClick={() => setCountClamped(count + 1)}>+</button>
                            </div>
                            <div className="opt-row">
                                {COUNT_PRESETS.map((n) => (
                                    <button key={n} className={"opt" + (count === n ? " is-on" : "")}
                                        onClick={() => setCount(n)}>{n}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="opt-group">
                        <span className="opt-label">{t.qtypes}</span>
                        <div className="opt-row">
                            {typeOpts.map((x) => (
                                <button key={x.key} className={"opt" + (types.includes(x.key) ? " is-on" : "")}
                                    onClick={() => toggleType(x.key)}>
                                    <Icon n={x.icon} /> {x.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="opt-group">
                        <span className="opt-label">{t.conditions}</span>
                        <div className="col" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                            <button style={condRow} onClick={() => setTimerOn((v) => !v)}>
                                <span style={condLeft}><Icon n="clock" /> <span style={{ fontWeight: 600 }}>{t.timer}</span></span>
                                <Toggle on={timerOn} />
                            </button>
                            <div style={{ ...condRow, cursor: "default" }}>
                                <span style={condLeft}><Icon n="x-circle" /> <span style={{ fontWeight: 600 }}>{t.noHints}</span></span>
                                <Toggle on />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* сводка */}
            <div className="spanel" style={{ position: "sticky", top: 84 }}>
                <div className="spanel__head"><span className="spanel__title">{t.summary}</span></div>
                <div className="spanel__body">
                    <div className="exam-summary">
                        <div className="exam-sumrow">
                            <span className="exam-sumrow__l"><Icon n="rotate" sm /> {t.scope}</span>
                            <span className="exam-sumrow__v">{scopeSummary}</span>
                        </div>
                        <div className="exam-sumrow">
                            <span className="exam-sumrow__l"><Icon n="type" sm /> {t.sWords}</span>
                            <span className="exam-sumrow__v">{count}</span>
                        </div>
                        <div className="exam-sumrow">
                            <span className="exam-sumrow__l"><Icon n="check-circle" sm /> {t.sTypes}</span>
                            <span className="exam-sumrow__v">{typeSummary}</span>
                        </div>
                        <div className="exam-sumrow">
                            <span className="exam-sumrow__l"><Icon n="clock" sm /> {t.sTimer}</span>
                            <span className="exam-sumrow__v">{timerOn ? "8:00" : t.offText}</span>
                        </div>
                        <div className="exam-sumrow">
                            <span className="exam-sumrow__l"><Icon n="x-circle" sm /> {t.sDiff}</span>
                            <span className="exam-sumrow__v">{t.noHints}</span>
                        </div>
                        <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                        <button className="btn btn--accent btn--lg btn--block" onClick={onStart} disabled={loading}>
                            <Icon n="graduation" sm /> {loading ? t.loading : t.start}
                        </button>
                        <span className="muted-3" style={{ fontSize: "var(--fs-12)", textAlign: "center" }}>
                            {t.focusNote}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Тоггл без эмодзи (классов .toggle в CSS нет — рисуем локально).
function Toggle({ on }) {
    return (
        <span style={{
            width: 42, height: 24, borderRadius: 999, flex: "none",
            background: on ? "var(--fjord-600)" : "var(--border-2)",
            position: "relative", transition: "background .15s ease",
        }}>
            <span style={{
                position: "absolute", top: 3, left: on ? 21 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left .15s ease", boxShadow: "0 1px 2px rgba(0,0,0,.25)",
            }} />
        </span>
    );
}

// ---- инлайн-стили (полноэкранный тёмный фокус + центр сцены) ----
const overlay = {
    position: "fixed", inset: 0, zIndex: 95,
    background: "var(--game-bg)", color: "var(--game-ink)",
};
const stageBody = {
    flex: 1, minHeight: 0, width: "100%", overflowY: "auto",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "var(--sp-6)", padding: "var(--sp-6)", textAlign: "center",
};
const eyebrow = {
    fontSize: "var(--fs-12)", fontWeight: 700, letterSpacing: "var(--ls-wider)",
    textTransform: "uppercase", color: "var(--game-ink-2)", marginBottom: 14,
};
const bigWord = {
    fontSize: "clamp(30px, 8.5vw, var(--fs-72))", fontWeight: 800,
    letterSpacing: "var(--ls-tight)", lineHeight: 1.05,
    overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%",
};
const speakerBtn = {
    width: 110, height: 110, borderRadius: 32, border: "1px solid var(--game-border)",
    background: "var(--game-surface)", color: "var(--game-accent)", cursor: "pointer",
    display: "grid", placeItems: "center", margin: "0 auto",
};
const replayBtn = {
    marginTop: 16, background: "transparent", border: "none", color: "var(--game-ink-2)",
    fontWeight: 700, fontSize: "var(--fs-14)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
};
const choiceWrap = {
    width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "var(--sp-3)",
};
const choiceOpt = {
    width: "100%", padding: "18px", borderRadius: "var(--r-md)",
    background: "var(--game-surface)", border: "1px solid var(--game-border)",
    color: "var(--game-ink)", fontSize: "var(--fs-18)", fontWeight: 600,
    cursor: "pointer", transition: "border-color .15s ease",
    overflowWrap: "anywhere", wordBreak: "break-word",
};
const inputWrap = {
    width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "var(--sp-4)",
};
const darkInput = {
    background: "var(--game-surface)", borderColor: "var(--game-border)",
    color: "var(--game-ink)", fontSize: "var(--fs-20)", textAlign: "center", padding: 18,
};
const condRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)",
    padding: "11px 14px", border: "1px solid var(--border)", borderRadius: "var(--r-md)",
    background: "transparent", cursor: "pointer", width: "100%", textAlign: "left",
};
const condLeft = { display: "flex", alignItems: "center", gap: 10, color: "var(--ink)" };
