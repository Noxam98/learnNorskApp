/* «Гонка слов» — игровой экран онлайн-гонки.
   Управляется состоянием из OnlinePage (позиции машин/зверей, текущее слово, оверлеи),
   общается с сервером через onAnswer. Визуал портирован из дизайн-макета (race-*). */
import { useEffect, useMemo, useRef, useState } from "react";
import { RaceRunner, ANIMAL_LIST, ANIMAL_COLORS } from "./RaceRunner.jsx";

// Язык интерфейса игрока (для лейблов «Переведите на …») + строки гонки на 5 языках.
const LANG_NAME = { ru: "русский", en: "English", ukr: "українську", pl: "polski", lt: "lietuvių" };
const RACE_I18N = {
    ru: { tagline: "Кто первым правильно ответит все слова", you: "Ты", exit: "Выйти", ready: "на старте", moving: "рывок!", stalled: "заглох", restarting: "завёлся", finished: "финиш", dnf: "отключился",
        go: "Поехали!", toNo: "Переведите на норвежский", toLang: "Переведите на", placeholder: "Введите перевод…", check: "Проверить",
        correctRow: "верно подряд", bannerLeader: "{name} на финише!", bannerTimer: "У вас {n} сек", hurry: "Время поджимает!",
        podium: "Подиум", yourPlace: "Твоё место", reached: "доехал {a}/{b}", playAgain: "Играть снова", toLobby: "В лобби", word: "слово", of: "из" },
    en: { tagline: "First to answer every word correctly wins", you: "You", exit: "Exit", ready: "idling", moving: "boost!", stalled: "stalled", restarting: "restarting", finished: "finish", dnf: "left",
        go: "Go!", toNo: "Translate to Norwegian", toLang: "Translate to", placeholder: "Type the translation…", check: "Check",
        correctRow: "in a row", bannerLeader: "{name} hit the finish!", bannerTimer: "You have {n}s", hurry: "Time is running out!",
        podium: "Podium", yourPlace: "Your place", reached: "reached {a}/{b}", playAgain: "Play again", toLobby: "To lobby", word: "word", of: "of" },
    ukr: { tagline: "Хто першим правильно відповість усі слова", you: "Ти", exit: "Вийти", ready: "на старті", moving: "ривок!", stalled: "заглух", restarting: "завівся", finished: "фініш", dnf: "вийшов",
        go: "Поїхали!", toNo: "Перекладіть норвезькою", toLang: "Перекладіть на", placeholder: "Введіть переклад…", check: "Перевірити",
        correctRow: "правильно поспіль", bannerLeader: "{name} на фініші!", bannerTimer: "У вас {n} с", hurry: "Час спливає!",
        podium: "Подіум", yourPlace: "Твоє місце", reached: "доїхав {a}/{b}", playAgain: "Грати знову", toLobby: "До лобі", word: "слово", of: "з" },
    pl: { tagline: "Wygrywa pierwszy, kto poprawnie odpowie wszystkie słowa", you: "Ty", exit: "Wyjdź", ready: "na luzie", moving: "przyspieszenie!", stalled: "zgasł", restarting: "odpala", finished: "meta", dnf: "rozłączony",
        go: "Jedziemy!", toNo: "Przetłumacz na norweski", toLang: "Przetłumacz na", placeholder: "Wpisz tłumaczenie…", check: "Sprawdź",
        correctRow: "pod rząd", bannerLeader: "{name} na mecie!", bannerTimer: "Masz {n} s", hurry: "Czas ucieka!",
        podium: "Podium", yourPlace: "Twoje miejsce", reached: "dojechał {a}/{b}", playAgain: "Zagraj ponownie", toLobby: "Do poczekalni", word: "słowo", of: "z" },
    lt: { tagline: "Laimi pirmas teisingai atsakęs visus žodžius", you: "Tu", exit: "Išeiti", ready: "tuščia eiga", moving: "startas!", stalled: "užgeso", restarting: "užvedama", finished: "finišas", dnf: "atsijungė",
        go: "Pirmyn!", toNo: "Išverskite į norvegų", toLang: "Išverskite į", placeholder: "Įveskite vertimą…", check: "Tikrinti",
        correctRow: "iš eilės", bannerLeader: "{name} finiše!", bannerTimer: "Turite {n} s", hurry: "Laikas baigiasi!",
        podium: "Podiumas", yourPlace: "Tavo vieta", reached: "pasiekė {a}/{b}", playAgain: "Žaisti dar kartą", toLobby: "Į laukiamąjį", word: "žodis", of: "iš" },
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

function AnswerZone({ word, lang, T, feedback, streak, onAnswer }) {
    const [val, setVal] = useState("");
    const [picked, setPicked] = useState(null);
    const inputRef = useRef(null);
    const isType = word.mode !== "choice";
    const isNoPrompt = word.dir === "no2int";   // показываем норвежское слово
    const promptLabel = isNoPrompt ? `${T.toLang} ${LANG_NAME[lang] || lang}` : T.toNo;

    useEffect(() => { setVal(""); setPicked(null); }, [word.token]);
    useEffect(() => { if (isType && inputRef.current && !feedback) inputRef.current.focus(); }, [word.token, feedback, isType]);

    const submit = () => { const v = val.trim(); if (v) onAnswer({ token: word.token, text: v }); };
    const pick = (i) => { if (picked != null || feedback) return; setPicked(i); onAnswer({ token: word.token, choice: i }); };

    return (
        <div className={"answerzone" + (feedback === "right" ? " is-right" : "") + (feedback === "wrong" ? " is-wrong" : "")}>
            <div className="answerzone__inner">
                <div className="az__head">
                    <span className="az__prompt">{promptLabel}</span>
                    {streak > 1 && <span className="az__streak">🔥 {streak} {T.correctRow}</span>}
                </div>
                <div className="az__word">
                    <span className="az__no">{word.prompt}</span>
                    {isNoPrompt && (
                        <button className="az__speak" onClick={() => speak(word.prompt)} aria-label="Listen" title="Listen">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                        </button>
                    )}
                    <span className="az__pos">{T.word} {(word.i ?? 0) + 1} {T.of} {word.total}</span>
                </div>
                {isType ? (
                    <div className="az__type">
                        <input ref={inputRef} className="az__input" value={val} placeholder={T.placeholder}
                            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                            disabled={!!feedback} spellCheck="false" autoComplete="off" autoCapitalize="off" />
                        <button className="az__check" onClick={submit}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {T.check}
                        </button>
                    </div>
                ) : (
                    <div className="az__choices">
                        {(word.options || []).map((o, i) => {
                            const isWrong = picked === i && feedback === "wrong";
                            const isRight = picked === i && feedback === "right";
                            return (
                                <button key={i} className={"az__opt" + (isRight ? " is-right" : "") + (isWrong ? " is-wrong" : "")}
                                    onClick={() => pick(i)} disabled={picked != null || !!feedback}>
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
            <div className="go"><div className="go__flag">🐾</div><div className="go__word">{T.go}</div></div>
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
                    <div className="banner__lead">{T.bannerLeader.replace("{name}", leader)}</div>
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
export function RacePodium({ podium, lang, meName, onLobby }) {
    const T = RACE_I18N[lang] || RACE_I18N.ru;
    const ranked = (podium || []).map((p) => ({ ...p, isYou: p.name === meName }));
    const top3 = ranked.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]].filter(Boolean); // визуально 2-1-3
    const me = ranked.find((p) => p.isYou);
    const palette = ["#CE4A21", "#3C7A4E", "#2A6A74", "#A9781A", "#5E54B8", "#C24E8E"];
    const colorOf = (p) => ANIMAL_COLORS[p.animal] || palette[ranked.indexOf(p) % palette.length];
    return (
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
                    <button className="race__chip" onClick={onLobby} style={{ padding: "11px 18px" }}>{T.toLobby}</button>
                </div>
            </div>
        </div>
    );
}

export default function RaceScreen({ positions, total, word, feedback, streak, grace, goFlash, lang, theme, roomName, onAnswer, onExit }) {
    const T = RACE_I18N[lang] || RACE_I18N.ru;
    const base = useMemo(() => decorate(positions || []), [positions]);

    // Состояния зверя живут на клиенте: сервер шлёт moving/stalled как событие и не
    // возвращает в neutral. Мы делаем рывок/падение кратким, затем возвращаем в neutral —
    // тогда возобновляются холостые анимации (кувырки/прыжки) и каждый новый рывок
    // (рост progress) перезапускает галоп с пылью, а ошибка — падение → подъём.
    const [disp, setDisp] = useState({});       // id -> отображаемое состояние
    const dispRef = useRef({});
    const prevProg = useRef({});
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
            if (p.finished) { cur[p.id] = "finished"; clearTimeout(timers.current[p.id]); }
            else if (p.state === "dnf") { cur[p.id] = "dnf"; clearTimeout(timers.current[p.id]); }
            else if (pp != null && p.progress > pp) arm(p.id, "moving", 620);          // доехал на слово → рывок
            else if (p.state === "stalled" && cur[p.id] !== "stalled" && cur[p.id] !== "restarting" && (pp == null || p.progress === pp))
                arm(p.id, "stalled", 720, { state: "restarting", hold: 460 });          // ошибка → падение → подъём
            else if (cur[p.id] == null) cur[p.id] = "neutral";
            prevProg.current[p.id] = p.progress;
        });
        setDisp(cur);
        return undefined;
    }, [positions]);
    useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

    const lanes = base.map((p) => ({ ...p, state: p.finished ? "finished" : (disp[p.id] || p.state) }));
    const others = lanes.filter((p) => !p.isYou);
    const you = lanes.find((p) => p.isYou);
    const hasAnswer = !!word && !(you && you.state === "finished");

    return (
        <div className="race" data-theme={theme} style={{ position: "fixed", inset: 0, zIndex: 90 }}>
            <div className="race__top">
                <div className="race__brand">
                    <div className="race__title">
                        <div className="race__mode"><span className="race__chk">🐾</span>{roomName}</div>
                        <div className="race__tag">{T.tagline}</div>
                    </div>
                </div>
                <div className="race__spacer" />
                <button className="race__chip race__exit" onClick={onExit}>{T.exit}</button>
            </div>

            <div className={"race__lanes" + (hasAnswer ? " has-answer" : "")}>
                {others.map((p) => <Lane key={p.id} player={p} total={total} T={T} />)}
                {you && <Lane key="you" player={you} total={total} T={T} />}
            </div>

            {hasAnswer && <AnswerZone word={word} lang={lang} T={T} feedback={feedback} streak={streak} onAnswer={onAnswer} />}

            {goFlash && <GoFlash T={T} />}
            {grace && <FinishBanner leader={grace.leader} T={T} secs={grace.sec} total={grace.total || 25} />}
        </div>
    );
}
