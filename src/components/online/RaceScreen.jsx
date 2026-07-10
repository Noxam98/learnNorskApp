/* «Гонка слов» — игровой экран онлайн-гонки.
   Управляется состоянием из OnlinePage (позиции машин/зверей, текущее слово, оверлеи),
   общается с сервером через onAnswer. Визуал портирован из дизайн-макета (race-*). */
import { useEffect, useMemo, useRef, useState } from "react";
import { RaceRunner, ANIMAL_LIST, ANIMAL_COLORS } from "./RaceRunner.jsx";
import { playYawn } from "../tools/raceAudio.js";
import { ENDONYM } from "../../interface/languages.js";

// Самоназвания языков (для лейблов «Переведите на …») — из единого реестра. Строки гонки — ниже.
const RACE_I18N = {
    ru: { tagline: "Кто первым правильно ответит все слова", you: "Ты", exit: "Выйти", ready: "на старте", moving: "рывок!", stalled: "заглох", restarting: "завёлся", finished: "финиш", dnf: "отключился",
        go: "Поехали!", toNo: "Переведите на норвежский", toLang: "Переведите на", placeholder: "Введите перевод…", check: "Проверить",
        correctRow: "верно подряд", bannerLeader: "{name} на финише!", bannerTimer: "У вас {n} сек", hurry: "Время поджимает!",
        podium: "Подиум", yourPlace: "Твоё место", reached: "доехал {a}/{b}", playAgain: "Играть снова", toLobby: "В лобби", word: "слово", of: "из",
        fell: "Зверёк упал!", fellHint: "Верное слово:", getUp: "Поднять", typeIt: "Впиши это слово, чтобы зверёк встал", pickIt: "Выбери это слово, чтобы зверёк встал",
        listen: "Прослушать", correct: "Верно!", wrong: "Неверно", exitConfirm: "Точно выйти?", oppFinished: "{name} финишировал" },
    en: { tagline: "First to answer every word correctly wins", you: "You", exit: "Exit", ready: "idling", moving: "boost!", stalled: "stalled", restarting: "restarting", finished: "finish", dnf: "left",
        go: "Go!", toNo: "Translate to Norwegian", toLang: "Translate to", placeholder: "Type the translation…", check: "Check",
        correctRow: "in a row", bannerLeader: "{name} hit the finish!", bannerTimer: "You have {n}s", hurry: "Time is running out!",
        podium: "Podium", yourPlace: "Your place", reached: "reached {a}/{b}", playAgain: "Play again", toLobby: "To lobby", word: "word", of: "of",
        fell: "Your animal fell!", fellHint: "Correct word:", getUp: "Get up", typeIt: "Type this word to get your animal back up", pickIt: "Pick this word to get your animal back up",
        listen: "Listen", correct: "Correct!", wrong: "Wrong", exitConfirm: "Leave for real?", oppFinished: "{name} finished" },
    ukr: { tagline: "Хто першим правильно відповість усі слова", you: "Ти", exit: "Вийти", ready: "на старті", moving: "ривок!", stalled: "заглух", restarting: "завівся", finished: "фініш", dnf: "вийшов",
        go: "Поїхали!", toNo: "Перекладіть норвезькою", toLang: "Перекладіть на", placeholder: "Введіть переклад…", check: "Перевірити",
        correctRow: "правильно поспіль", bannerLeader: "{name} на фініші!", bannerTimer: "У вас {n} с", hurry: "Час спливає!",
        podium: "Подіум", yourPlace: "Твоє місце", reached: "доїхав {a}/{b}", playAgain: "Грати знову", toLobby: "До лобі", word: "слово", of: "з",
        fell: "Звірятко впало!", fellHint: "Правильне слово:", getUp: "Підняти", typeIt: "Впиши це слово, щоб звірятко встало", pickIt: "Обери це слово, щоб звірятко встало",
        listen: "Прослухати", correct: "Правильно!", wrong: "Неправильно", exitConfirm: "Точно вийти?", oppFinished: "{name} фінішував" },
    pl: { tagline: "Wygrywa pierwszy, kto poprawnie odpowie wszystkie słowa", you: "Ty", exit: "Wyjdź", ready: "na luzie", moving: "przyspieszenie!", stalled: "zgasł", restarting: "odpala", finished: "meta", dnf: "rozłączony",
        go: "Jedziemy!", toNo: "Przetłumacz na norweski", toLang: "Przetłumacz na", placeholder: "Wpisz tłumaczenie…", check: "Sprawdź",
        correctRow: "pod rząd", bannerLeader: "{name} na mecie!", bannerTimer: "Masz {n} s", hurry: "Czas ucieka!",
        podium: "Podium", yourPlace: "Twoje miejsce", reached: "dojechał {a}/{b}", playAgain: "Zagraj ponownie", toLobby: "Do poczekalni", word: "słowo", of: "z",
        fell: "Zwierzak się przewrócił!", fellHint: "Poprawne słowo:", getUp: "Podnieś", typeIt: "Wpisz to słowo, aby zwierzak wstał", pickIt: "Wybierz to słowo, aby zwierzak wstał",
        listen: "Odsłuchaj", correct: "Dobrze!", wrong: "Źle", exitConfirm: "Na pewno wyjść?", oppFinished: "{name} na mecie" },
    lt: { tagline: "Laimi pirmas teisingai atsakęs visus žodžius", you: "Tu", exit: "Išeiti", ready: "tuščia eiga", moving: "startas!", stalled: "užgeso", restarting: "užvedama", finished: "finišas", dnf: "atsijungė",
        go: "Pirmyn!", toNo: "Išverskite į norvegų", toLang: "Išverskite į", placeholder: "Įveskite vertimą…", check: "Tikrinti",
        correctRow: "iš eilės", bannerLeader: "{name} finiše!", bannerTimer: "Turite {n} s", hurry: "Laikas baigiasi!",
        podium: "Podiumas", yourPlace: "Tavo vieta", reached: "pasiekė {a}/{b}", playAgain: "Žaisti dar kartą", toLobby: "Į laukiamąjį", word: "žodis", of: "iš",
        fell: "Žvėrelis parkrito!", fellHint: "Teisingas žodis:", getUp: "Pakelti", typeIt: "Įvesk šį žodį, kad žvėrelis atsistotų", pickIt: "Pasirink šį žodį, kad žvėrelis atsistotų",
        listen: "Klausyti", correct: "Teisingai!", wrong: "Neteisingai", exitConfirm: "Tikrai išeiti?", oppFinished: "{name} finišavo" },
    lv: { tagline: "Uzvar pirmais, kurš pareizi atbild visus vārdus", you: "Tu", exit: "Iziet", ready: "tukšgaitā", moving: "rāviens!", stalled: "noslāpis", restarting: "iedarbina", finished: "finišs", dnf: "atvienojies",
        go: "Brauc!", toNo: "Iztulko uz norvēģu", toLang: "Iztulko uz", placeholder: "Ievadi tulkojumu…", check: "Pārbaudīt",
        correctRow: "pēc kārtas", bannerLeader: "{name} finišā!", bannerTimer: "Tev ir {n} s", hurry: "Laiks beidzas!",
        podium: "Pjedestāls", yourPlace: "Tava vieta", reached: "sasniedza {a}/{b}", playAgain: "Spēlēt vēlreiz", toLobby: "Uz vestibilu", word: "vārds", of: "no",
        fell: "Zvēriņš nokrita!", fellHint: "Pareizais vārds:", getUp: "Piecelt", typeIt: "Ieraksti šo vārdu, lai zvēriņš pieceltos", pickIt: "Izvēlies šo vārdu, lai zvēriņš pieceltos",
        listen: "Klausīties", correct: "Pareizi!", wrong: "Nepareizi", exitConfirm: "Tiešām iziet?", oppFinished: "{name} finišēja" },
    ar: { tagline: "يفوز أول من يجيب عن كل الكلمات بشكل صحيح", you: "أنت", exit: "خروج", ready: "في وضع الخمول", moving: "اندفاع!", stalled: "متوقّف", restarting: "إعادة التشغيل", finished: "خط النهاية", dnf: "غادر",
        go: "انطلق!", toNo: "ترجم إلى النرويجية", toLang: "ترجم إلى", placeholder: "اكتب الترجمة…", check: "تحقق",
        correctRow: "على التوالي", bannerLeader: "{name} بلغ خط النهاية!", bannerTimer: "أمامك {n} ث", hurry: "الوقت ينفد!",
        podium: "منصة التتويج", yourPlace: "مركزك", reached: "بلغ {a}/{b}", playAgain: "العب مرة أخرى", toLobby: "إلى الردهة", word: "كلمة", of: "من",
        fell: "سقط حيوانك!", fellHint: "الكلمة الصحيحة:", getUp: "انهض", typeIt: "اكتب هذه الكلمة لينهض حيوانك", pickIt: "اختر هذه الكلمة لينهض حيوانك",
        listen: "استماع", correct: "صحيح!", wrong: "خطأ", exitConfirm: "الخروج فعلاً؟", oppFinished: "{name} أنهى السباق" },
};

function badgeFor(state, T) {
    return ({ neutral: [T.ready, "neutral"], moving: [T.moving, "moving"], stalled: [T.stalled, "stalled"],
        restarting: [T.restarting, "restarting"], finished: [T.finished, "finished"], dnf: [T.dnf, "dnf"] })[state] || [T.ready, "neutral"];
}

function speak(word) {
    try { const u = new SpeechSynthesisUtterance(word); u.lang = "nb-NO"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no-op */ }
}

// зверь приходит с сервера (выбор игрока); фолбэк — по позиции в списке
function decorate(positions) {
    return positions.map((p, i) => {
        const animal = p.animal || ANIMAL_LIST[i % ANIMAL_LIST.length];
        return { ...p, animal, color: ANIMAL_COLORS[animal] };
    });
}

function RaceTag({ player, label, badge, badgeKind, you, dim, compact }) {
    const initial = (label || "·").trim().charAt(0).toUpperCase();
    return (
        <div className={"ptag" + (dim ? " is-dim" : "") + (compact ? " ptag--compact" : "")}>
            <span className="ptag__av" style={{ background: player.color }}>{initial}</span>
            <span className="ptag__meta">
                <span className="ptag__name" title={label}>{label}{you && <span className="ptag__you">★</span>}</span>
                {badge && <span className={"sbadge sbadge--" + badgeKind}>{badge}</span>}
            </span>
        </div>
    );
}

function Lane({ player, total, T }) {
    const pct = total > 0 ? Math.min(player.progress / total, 1) : 0;
    const left = (3 + pct * 86).toFixed(2) + "%";
    const finished = player.state === "finished";
    const dnf = player.state === "dnf";
    const [badge, badgeKind] = badgeFor(player.state, T);
    return (
        <div className={"lane" + (player.isYou ? " lane--own" : "") + (dnf ? " lane--dnf" : "") + (finished ? " lane--done" : "")} data-state={player.state}>
            <div className="lane__label">
                <RaceTag player={player} label={player.isYou ? T.you : player.name} badge={badge} badgeKind={badgeKind} you={player.isYou} dim={dnf} compact={!player.isYou} />
            </div>
            <div className="lane__track">
                <div className="track__road" data-moving={player.state === "moving"} />
                <div className="track__start" />
                <div className="track__finish" aria-hidden="true" />
                {player.isYou && <div className="track__progress">{player.progress}<span>/{total}</span></div>}
                <div className="track__carwrap" style={{ left }}>
                    <RaceRunner state={player.state} color={player.color} animal={player.animal} />
                    {finished && <div className="track__flag" aria-hidden="true">🌲</div>}
                </div>
            </div>
        </div>
    );
}

// recover != null → зверь ЛЕЖИТ: показываем ВЕРНЫЙ ответ, и игрок обязан его воспроизвести
// (впечатать / выбрать), чтобы зверь встал. Пробовать можно сколько угодно — это обучающий шаг,
// а не наказание. Судит СЕРВЕР: onRecover шлёт ответ, поднимает только его «ok» (см. _race_recover).
function AnswerZone({ word, lang, T, feedback, streak, onAnswer, recover, onRecover }) {
    const [val, setVal] = useState("");
    const [picked, setPicked] = useState(null);
    const [sent, setSent] = useState(false);    // анти-дабл-сабмит (печать): ждём ответ сервера
    const inputRef = useRef(null);
    const isType = word.mode !== "choice";
    const isNoPrompt = word.dir === "no2int";   // показываем норвежское слово
    const promptLabel = isNoPrompt ? `${T.toLang} ${ENDONYM[lang] || lang}` : T.toNo;
    const fallen = !!recover;
    const answerIsNo = word.dir === "int2no";   // верный ответ — норвежское слово (его можно озвучить)

    useEffect(() => { setVal(""); setPicked(null); setSent(false); }, [word.token, fallen]);
    useEffect(() => { if (isType && inputRef.current && !feedback) inputRef.current.focus(); }, [word.token, feedback, isType, fallen]);
    // Сервер ответил → снимаем блокировку. В падении ещё и сбрасываем выбор: пробуем снова.
    useEffect(() => { if (feedback) { setSent(false); if (fallen) setPicked(null); } }, [feedback, fallen]);

    const submit = () => {
        if (sent || (!fallen && feedback)) return;   // одно слово — один сабмит, пока не пришёл ответ
        const v = val.trim(); if (!v) return;
        setSent(true);
        if (fallen) onRecover({ token: recover.token, text: v });
        else onAnswer({ token: word.token, text: v });
    };
    const pick = (i) => {
        if (sent || (!fallen && (picked != null || feedback))) return;
        setPicked(i);
        if (fallen) { setSent(true); onRecover({ token: recover.token, choice: i }); }
        else onAnswer({ token: word.token, choice: i });
    };
    const lock = fallen ? sent : (!!feedback || sent);
    const shown = fallen ? recover.answer : word.prompt;   // упал → на месте вопроса стоит ВЕРНЫЙ ответ
    const canSpeak = fallen ? answerIsNo : isNoPrompt;

    return (
        <div className={"answerzone" + (fallen ? " answerzone--fallen" : "") + (feedback === "right" ? " is-right" : "") + (feedback === "wrong" ? " is-wrong" : "")}>
            <div className="answerzone__inner">
                <div className="az__head">
                    <span className={"az__prompt" + (fallen ? " az__prompt--fell" : "")}>{fallen ? `🐾 ${T.fell}` : promptLabel}</span>
                    {!fallen && streak > 1 && <span className="az__streak">🔥 {streak} {T.correctRow}</span>}
                </div>
                <div className="az__word">
                    {fallen && <span className="az__fellcap">{T.fellHint}</span>}
                    <span className="az__no" lang={canSpeak ? "no" : undefined}>{shown}</span>
                    {canSpeak && (
                        <button className="az__speak" onClick={() => speak(shown)} aria-label={T.listen} title={T.listen}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                        </button>
                    )}
                    {!fallen && <span className="az__pos">{T.word} {(word.i ?? 0) + 1} {T.of} {word.total}</span>}
                </div>
                {/* Результат словом (не только цветом) + live-region для скринридера. */}
                <div className="az__fb" role="status" aria-live="assertive" aria-atomic="true">
                    {fallen ? (isType ? T.typeIt : T.pickIt)
                        : feedback === "right" ? T.correct : feedback === "wrong" ? T.wrong : " "}
                </div>
                {isType ? (
                    <div className="az__type">
                        <input ref={inputRef} className="az__input" value={val} placeholder={fallen ? recover.answer : T.placeholder}
                            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                            disabled={lock} spellCheck="false" autoComplete="off" autoCapitalize="off" />
                        <button className="az__check" onClick={submit} disabled={lock}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {fallen ? T.getUp : T.check}
                        </button>
                    </div>
                ) : (
                    <div className="az__choices">
                        {(word.options || []).map((o, i) => {
                            const isWrong = picked === i && feedback === "wrong";
                            const isRight = picked === i && feedback === "right";
                            return (
                                <button key={i} className={"az__opt" + (isRight ? " is-right" : "") + (isWrong ? " is-wrong" : "")}
                                    onClick={() => pick(i)} disabled={fallen ? sent : (picked != null || !!feedback)}>
                                    <span className="az__key">{["A", "B", "C", "D"][i]}</span>{o}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function GoFlash({ T }) {
    return (
        <div className="ov ov-go">
            <div className="ov-scrim" />
            <div className="go" role="status" aria-live="assertive"><div className="go__flag">🐾</div><div className="go__word">{T.go}</div></div>
        </div>
    );
}

function FinishBanner({ leader, T, secs, total }) {
    const hurry = secs <= 3;
    const C = 2 * Math.PI * 21;
    const off = C * (1 - secs / total);
    return (
        <div className={"banner" + (hurry ? " is-hurry" : "")}>
            <div className="banner__card">
                <div className="banner__flag">🐾</div>
                <div className="banner__txt">
                    {/* Лидер финишировал — важное событие, озвучиваем (таймер ниже без live, чтобы не тараторил каждую секунду). */}
                    <div className="banner__lead" aria-live="polite">{T.bannerLeader.replace("{name}", leader)}</div>
                    <div className="banner__sub">{hurry ? T.hurry : T.bannerTimer.replace("{n}", secs)}</div>
                </div>
                <div className="banner__ring">
                    <svg viewBox="0 0 50 50"><circle className="bg" cx="25" cy="25" r="21" fill="none" strokeWidth="4" /><circle className="fg" cx="25" cy="25" r="21" fill="none" strokeWidth="4" strokeDasharray={C} strokeDashoffset={off} /></svg>
                    <span className="banner__sec">{secs}</span>
                </div>
            </div>
        </div>
    );
}

// Подиум гонки (используется из OnlinePage). podium: [{name, place, progress, total, finished}]
export function RacePodium({ podium, lang, theme, meName, onLobby }) {
    const T = RACE_I18N[lang] || RACE_I18N.ru;
    const ranked = (podium || []).map((p) => ({ ...p, isYou: p.name === meName }));
    const top3 = ranked.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]].filter(Boolean); // визуально 2-1-3
    const me = ranked.find((p) => p.isYou);
    const palette = ["#CE4A21", "#3C7A4E", "#2A6A74", "#A9781A", "#5E54B8", "#C24E8E"];
    const colorOf = (p) => ANIMAL_COLORS[p.animal] || palette[ranked.indexOf(p) % palette.length];
    return (
        <div className="race" data-theme={theme} style={{ position: "fixed", inset: 0, zIndex: 95 }}>
        <div className="ov ov-podium" style={{ pointerEvents: "auto" }}>
            <div className="ov-scrim" />
            <div className="podium">
                <div className="podium__title">🏆 {T.podium}</div>
                {me && <div className="podium__mine">{T.yourPlace}: <b>{me.place}</b></div>}
                <div className="podium__stand">
                    {order.map((p) => (
                        <div key={p.name + p.place} className={"pod pod--" + p.place}>
                            <div className="pod__tag">
                                <div className="pod__av" style={{ background: colorOf(p) }}>{(p.name || "·").charAt(0).toUpperCase()}</div>
                                <div className="pod__name">{p.name}</div>
                                <div className="pod__time">{p.finished ? T.reached.replace("{a}", p.total).replace("{b}", p.total) : T.reached.replace("{a}", p.progress).replace("{b}", p.total)}</div>
                            </div>
                            <div className="pod__block">{p.place}</div>
                        </div>
                    ))}
                </div>
                <div className="podium__list">
                    {ranked.slice(3).map((p) => (
                        <div key={p.name + p.place} className={"prow" + (p.isYou ? " is-me" : "")}>
                            <div className="prow__pl">{p.place}</div>
                            <div className="pod__av" style={{ background: colorOf(p), width: 26, height: 26, borderRadius: 8, fontSize: 12 }}>{(p.name || "·").charAt(0).toUpperCase()}</div>
                            <div className="prow__name">{p.name}</div>
                            <div className="prow__prog">{p.finished ? `${p.total}/${p.total}` : `${p.progress}/${p.total}`}</div>
                        </div>
                    ))}
                </div>
                <div className="podium__cta">
                    <button className="az__check" onClick={onLobby} style={{ height: 48, padding: "0 28px", fontSize: "var(--fs-16)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
                        {T.toLobby}
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
}

export default function RaceScreen({ positions, total, word, feedback, streak, grace, goFlash, lang, theme, roomName, onAnswer, onExit, recover, onRecover }) {
    const T = RACE_I18N[lang] || RACE_I18N.ru;
    const base = useMemo(() => decorate(positions || []), [positions]);

    // Состояния зверя живут на клиенте: сервер шлёт moving как событие и не возвращает в neutral.
    // Рывок делаем кратким, затем neutral — возобновляются холостые анимации (кувырки/прыжки).
    // ПАДЕНИЕ таймером НЕ гасим: зверь лежит, пока сервер держит fallen=true (игрок должен
    // воспроизвести верное слово). Снялся fallen → короткий подъём (restarting) → neutral.
    const [disp, setDisp] = useState({});       // id -> отображаемое состояние
    const dispRef = useRef({});
    const prevProg = useRef({});
    const prevFallen = useRef({});
    const timers = useRef({});
    useEffect(() => { dispRef.current = disp; }, [disp]);
    useEffect(() => {
        const cur = { ...dispRef.current };
        const arm = (id, state, hold, then) => {
            cur[id] = state;
            clearTimeout(timers.current[id]);
            timers.current[id] = setTimeout(() => {
                if (then) { setDisp((d) => ({ ...d, [id]: then.state })); clearTimeout(timers.current[id]);
                    timers.current[id] = setTimeout(() => setDisp((d) => ({ ...d, [id]: "neutral" })), then.hold); }
                else setDisp((d) => ({ ...d, [id]: "neutral" }));
            }, hold);
        };
        (positions || []).forEach((p) => {
            const pp = prevProg.current[p.id];
            const wasFallen = prevFallen.current[p.id];
            if (p.finished) { cur[p.id] = "finished"; clearTimeout(timers.current[p.id]); }
            else if (p.state === "dnf") { cur[p.id] = "dnf"; clearTimeout(timers.current[p.id]); }
            else if (p.fallen) { cur[p.id] = "stalled"; clearTimeout(timers.current[p.id]); }   // лежит, пока не подняли
            else if (wasFallen) arm(p.id, "restarting", 520);                          // встал → подъём → neutral
            else if (pp != null && p.progress > pp) arm(p.id, "moving", 620);          // доехал на слово → рывок
            else if (cur[p.id] == null) cur[p.id] = "neutral";
            prevProg.current[p.id] = p.progress;
            prevFallen.current[p.id] = !!p.fallen;
        });
        setDisp(cur);
        return undefined;
    }, [positions]);
    useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

    // зевки на простое — редкие, со случайными паузами, пока идёт гонка
    useEffect(() => {
        let id;
        const loop = () => { id = setTimeout(() => { playYawn(); loop(); }, 7000 + Math.random() * 7000); };
        loop();
        return () => clearTimeout(id);
    }, []);

    // Выход из активной гонки — с подтверждением (второй тап), иначе случайный DNF по одному касанию.
    const [confirmExit, setConfirmExit] = useState(false);
    const exitTimer = useRef(null);
    useEffect(() => () => clearTimeout(exitTimer.current), []);
    const handleExit = () => {
        if (confirmExit) { clearTimeout(exitTimer.current); onExit(); return; }
        setConfirmExit(true);
        exitTimer.current = setTimeout(() => setConfirmExit(false), 3000);
    };

    // Live-region: озвучиваем финиш соперников (полите, чтобы не перебивать «Верно/Неверно»).
    const [announce, setAnnounce] = useState("");
    const finishedRef = useRef(new Set());
    useEffect(() => {
        (positions || []).forEach((p) => {
            if (p.finished && !p.isYou && !finishedRef.current.has(p.id)) {
                finishedRef.current.add(p.id);
                setAnnounce(T.oppFinished.replace("{name}", p.name || ""));
            }
        });
    }, [positions, T]);

    const lanes = base.map((p) => ({ ...p, state: p.finished ? "finished" : (disp[p.id] || p.state) }));
    const others = lanes.filter((p) => !p.isYou);
    const you = lanes.find((p) => p.isYou);
    const hasAnswer = !!word && !(you && you.state === "finished");

    return (
        <div className="race" data-theme={theme} style={{ position: "fixed", inset: 0, zIndex: 90 }}>
            <div className="race__top">
                <div className="race__brand">
                    <div className="race__title">
                        <div className="race__mode"><span className="race__chk">🐾</span><span className="race__modename">{roomName}</span></div>
                        <div className="race__tag">{T.tagline}</div>
                    </div>
                </div>
                <div className="race__spacer" />
                <button className={"race__chip race__exit" + (confirmExit ? " is-armed" : "")} onClick={handleExit}>
                    {confirmExit ? T.exitConfirm : T.exit}
                </button>
            </div>

            {/* визуально скрытая live-region для событий гонки (финиш соперника) */}
            <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap" }}>{announce}</div>

            <div className={"race__lanes" + (hasAnswer ? " has-answer" : "")}>
                {others.map((p) => <Lane key={p.id} player={p} total={total} T={T} />)}
                {you && <Lane key="you" player={you} total={total} T={T} />}
            </div>

            {hasAnswer && <AnswerZone word={word} lang={lang} T={T} feedback={feedback} streak={streak}
                onAnswer={onAnswer} recover={recover} onRecover={onRecover} />}

            {goFlash && <GoFlash T={T} />}
            {grace && <FinishBanner leader={grace.leader} T={T} secs={grace.sec} total={grace.total || 25} />}
        </div>
    );
}
