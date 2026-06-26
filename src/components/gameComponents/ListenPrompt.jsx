// @ts-check
// Аудио-подсказка для задания «на слух» (стадия choice_no2int): норвежское слово ПРОИГРЫВАЕТСЯ,
// текст скрыт — игрок узнаёт на слух и выбирает перевод. Кнопка ▶ с кольцом прогресса (плавно
// заполняется по ходу аудио), автоплей, кнопка «не слышно?» со слоёной диагностикой и эскейпы
// «показать текст» / «всегда текстом». Звук — через ЕДИНЫЙ канал tts.js (speakTextEnd с onTick),
// чтобы воспроизведения НЕ пересекались (общий stopAudio гасит предыдущее); кольцо — по реальному
// прогрессу аудио, пишем dashoffset напрямую в DOM (без re-render → без мерцания).
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon.jsx";
import { speakTextEnd } from "../ui/tts.js";
import { useSystemStore } from "../../store/systemStore.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

const LEAD_MS = 300;   // пауза перед воспроизведением аудио
const RING_R = 45, RING_C = 2 * Math.PI * 45;   // радиус/длина окружности SVG-кольца прогресса

const T = langGuard({
    ru:  { hint: "Послушай и выбери перевод", cantHear: "Не слышно?", showText: "Показать текст",
           replay: "Ещё раз", turnOn: "Включить звук", alwaysText: "Всегда текстом",
           diagVol: "Звук выключен в приложении. Включи — и слово зазвучит.",
           diagBlocked: "Браузер не дал звуку заиграть сам. Нажми ▶, чтобы услышать.",
           diagDevice: "Проверь громкость и «беззвучный режим» на устройстве. Или ответь по тексту." },
    ukr: { hint: "Послухай і обери переклад", cantHear: "Не чути?", showText: "Показати текст",
           replay: "Ще раз", turnOn: "Увімкнути звук", alwaysText: "Завжди текстом",
           diagVol: "Звук вимкнено в застосунку. Увімкни — і слово зазвучить.",
           diagBlocked: "Браузер не дав звуку заграти сам. Натисни ▶, щоб почути.",
           diagDevice: "Перевір гучність і «беззвучний режим» на пристрої. Або відповідай за текстом." },
    en:  { hint: "Listen and pick the translation", cantHear: "Can't hear?", showText: "Show text",
           replay: "Again", turnOn: "Turn on sound", alwaysText: "Always text",
           diagVol: "Sound is off in the app. Turn it on to hear the word.",
           diagBlocked: "The browser blocked autoplay. Tap ▶ to hear it.",
           diagDevice: "Check your device volume and silent mode. Or answer by text." },
    pl:  { hint: "Posłuchaj i wybierz tłumaczenie", cantHear: "Nie słychać?", showText: "Pokaż tekst",
           replay: "Jeszcze raz", turnOn: "Włącz dźwięk", alwaysText: "Zawsze tekst",
           diagVol: "Dźwięk jest wyłączony w aplikacji. Włącz, aby usłyszeć słowo.",
           diagBlocked: "Przeglądarka zablokowała autoodtwarzanie. Naciśnij ▶, aby usłyszeć.",
           diagDevice: "Sprawdź głośność i tryb cichy w urządzeniu. Albo odpowiedz tekstem." },
    lt:  { hint: "Klausyk ir pasirink vertimą", cantHear: "Negirdi?", showText: "Rodyti tekstą",
           replay: "Dar kartą", turnOn: "Įjungti garsą", alwaysText: "Visada tekstu",
           diagVol: "Garsas išjungtas programėlėje. Įjunk, kad išgirstum žodį.",
           diagBlocked: "Naršyklė užblokavo automatinį grojimą. Paspausk ▶, kad išgirstum.",
           diagDevice: "Patikrink garsą ir „tylųjį režimą“ įrenginyje. Arba atsakyk tekstu." },
    lv:  { hint: "Klausies un izvēlies tulkojumu", cantHear: "Nedzirdi?", showText: "Rādīt tekstu",
           replay: "Vēlreiz", turnOn: "Ieslēgt skaņu", alwaysText: "Vienmēr ar tekstu",
           diagVol: "Skaņa lietotnē ir izslēgta. Ieslēdz to, lai dzirdētu vārdu.",
           diagBlocked: "Pārlūks bloķēja automātisko atskaņošanu. Pieskaries ▶, lai dzirdētu.",
           diagDevice: "Pārbaudi ierīces skaļumu un klusuma režīmu. Vai atbildi ar tekstu." },
    ar:  { hint: "استمع واختر الترجمة", cantHear: "لا تسمع؟", showText: "إظهار النص",
           replay: "مرة أخرى", turnOn: "تشغيل الصوت", alwaysText: "دائمًا نص",
           diagVol: "الصوت مُطفأ في التطبيق. شغّله لتسمع الكلمة.",
           diagBlocked: "حظر المتصفّح التشغيل التلقائي. انقر ▶ لسماعها.",
           diagDevice: "تحقّق من مستوى صوت جهازك ووضع الصمت. أو أجب بالنص." },
}, "ListenPrompt.T");

/**
 * @param {{ word: string, ttsLang?: string, uiLang?: string, asking?: boolean,
 *   onEnded?: () => void, onShowText?: () => void, onDisableAlways?: () => void }} p
 */
export function ListenPrompt({ word, ttsLang, uiLang = "ru", asking = true, onEnded, onShowText, onDisableAlways }) {
    const t = T[uiLang] || T.en;
    const soundVolume = useSystemStore((s) => s.soundVolume);
    const [state, setState] = useState("idle");   // idle | playing | ended | blocked
    const [diag, setDiag] = useState(false);
    const leadRef = useRef(0);
    const btnRef = useRef(/** @type {HTMLButtonElement | null} */(null));
    const fgRef = useRef(/** @type {SVGCircleElement | null} */(null));   // дугой прогресса управляем ИМПЕРАТИВНО (вне React — иначе re-render сбрасывает offset)
    // Перевести дугу offset from→to за durSec одной CSS-transition. Ключевой момент — форс-рефлоу
    // ПОСЛЕ установки стартового значения с transition:none: иначе Chromium, видя смену transition и
    // offset в одном пересчёте стиля, не запускает анимацию и дуга «телепортируется».
    const animateRing = (fromOff, toOff, durSec, easing) => {
        const el = fgRef.current; if (!el) return;
        el.style.transition = "none";
        el.style.strokeDashoffset = String(fromOff);
        void el.getBoundingClientRect();   // зафиксировать старт отдельным пересчётом
        el.style.transition = `stroke-dashoffset ${durSec}s ${easing}`;
        el.style.strokeDashoffset = String(toOff);
    };
    // заполнить кольцо за время звучания (durSec) — линейно от пустого к полному
    const fillRing = (durSec) => animateRing(RING_C, 0, Math.max(0.15, durSec || 0.6), "linear");
    // сбросить к пустому: quick=true → видимый быстрый ОТКАТ назад от полного (.22s); иначе мгновенно
    const resetRing = (quick) => {
        if (quick) { animateRing(0, RING_C, 0.22, "ease"); return; }
        const el = fgRef.current; if (el) { el.style.transition = "none"; el.style.strokeDashoffset = String(RING_C); }
    };
    const clearTimers = () => { if (leadRef.current) { clearTimeout(leadRef.current); leadRef.current = 0; } };
    // короткая анимация «перезапуск воспроизведения» — отскок кнопки + проворот иконки
    const animateRestart = () => {
        try {
            btnRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(.88)" }, { transform: "scale(1)" }], { duration: 280, easing: "ease-out" });
            btnRef.current?.querySelector(".ic")?.animate([{ transform: "rotate(-12deg)" }, { transform: "rotate(0)" }], { duration: 300, easing: "ease-out" });
        } catch { /* нет WAAPI — ок */ }
    };
    // Звук — координированным speakTextEnd (единый канал, не пересекается). Кольцо — по РЕАЛЬНОМУ
    // прогрессу аудио, но пишем в DOM напрямую (setRing) — без React-ре-рендера 40×/сек, поэтому без
    // мерцания; плавность — CSS-transition на stroke-dashoffset. Пауза 300мс перед звуком.
    const play = (fromClick = false) => {
        if (state === "playing") return;   // пока слово играет — повторный запуск заблокирован
        clearTimers();
        animateRestart();
        resetRing(fromClick && state === "ended");   // клик по уже доигравшему → быстрый откат кольца назад; иначе мгновенно пусто
        setState("playing"); setDiag(false);
        leadRef.current = window.setTimeout(() => {
            speakTextEnd(word, ttsLang, fillRing)   // fillRing получит длину аудио и запустит CSS-transition на дугу
                .then(() => { setState("ended"); onEnded?.(); })   // слово доиграло → кольцо полное, loop отпускает переход
                .catch((e) => { const m = String(e?.message || e); if (m.includes("interrupt")) { setState("ended"); return; } resetRing(false); setState("blocked"); onEnded?.(); });
        }, LEAD_MS);
    };

    useEffect(() => { play(false); return clearTimers; }, [word]); // eslint-disable-line

    // слоёная диагностика «не слышно»: точное → гадательное
    const advice = soundVolume === 0 ? "vol" : state === "blocked" ? "blocked" : "device";
    const adviceText = advice === "vol" ? t.diagVol : advice === "blocked" ? t.diagBlocked : t.diagDevice;

    return (
        <div className="listen">
            <button ref={btnRef} type="button" className={"listen__play" + (state === "playing" ? " is-playing" : "")}
                disabled={state === "playing"} onClick={() => play(true)} aria-label={t.replay}>
                <svg className="listen__ring" viewBox="0 0 100 100" aria-hidden="true">
                    <circle className="listen__ring-bg" cx="50" cy="50" r={RING_R} />
                    <circle ref={fgRef} className="listen__ring-fg" cx="50" cy="50" r={RING_R}
                        style={{ strokeDasharray: RING_C }} />
                </svg>
                <Icon n="volume" />
            </button>
            {asking && <div className="listen__hint">{t.hint}</div>}
            {asking && (
                <div className="listen__links">
                    <button type="button" className="listen__link" onClick={() => setDiag((v) => !v)}>{t.cantHear}</button>
                    <span className="listen__dot">·</span>
                    <button type="button" className="listen__link" onClick={onShowText}>{t.showText}</button>
                </div>
            )}
            {diag && (
                <div className="listen__diag">
                    <div className="listen__diagtext">{adviceText}</div>
                    <div className="listen__diagacts">
                        {advice === "vol" && (
                            <button type="button" className="gbtn gbtn--accent"
                                onClick={() => { useSystemStore.getState().setSoundVolume(0.8); setDiag(false); play(true); }}>
                                <Icon n="volume" sm /> {t.turnOn}
                            </button>
                        )}
                        {advice === "blocked" && (
                            <button type="button" className="gbtn gbtn--accent" onClick={() => { setDiag(false); play(true); }}>
                                <Icon n="volume" sm /> {t.replay}
                            </button>
                        )}
                        <button type="button" className="gbtn" onClick={onShowText}>{t.showText}</button>
                        <button type="button" className="gbtn" onClick={onDisableAlways}>{t.alwaysText}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ListenPrompt;
