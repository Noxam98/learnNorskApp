// @ts-check
// Игра «Собери из букв»: дано родное слово — собрать норвежское на QWERTY-клавиатуре (как Gboard).
// Ступень рампы «продукция со страховкой». Направление — только родной→норв.
// Механика цикла (стейт-машина, SRS, ретрай, авто-переход, финиш) — в useGameLoop; здесь
// клавиатура, деривация слова, озвучка и рендер.
import { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import { DUNNO, PLAY_STYLE, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen, tplSlots , RampCheer , RampDrop , usePlayDialogRef } from "./gameShared.jsx";
import { GameKeyboard, KBD_SET } from "./GameKeyboard.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { langGuard } from "../../interface/i18nGuard.js";

const norm = (s) => (s || "").trim().toLowerCase();
// Промпт «Собери слово · Norsk» на 7 языках. Локально (как CellsGame.L/OrderGame.L), чтобы не
// трогать общий словарь и его страж паритета. Раньше тут был отсутствующий ключ t.collectFromLetters
// → ВСЕ языки проваливались в русский литерал (араб/лит/лат видели кириллицу).
// Фразы проходят ТУ ЖЕ ступень «собери из букв» (ступень рампы build_int2no): клавиатура сама
// даёт клавишу пробела ровно столько раз, сколько его во фразе. Меняются только подписи.
const L = langGuard({
    ru:  { build: "Собери слово · Norsk", buildPhrase: "Собери фразу · Norsk", phrase: "Фраза" },
    en:  { build: "Build the word · Norsk", buildPhrase: "Build the phrase · Norsk", phrase: "Phrase" },
    ukr: { build: "Склади слово · Norsk", buildPhrase: "Склади фразу · Norsk", phrase: "Фраза" },
    pl:  { build: "Ułóż słowo · Norsk", buildPhrase: "Ułóż frazę · Norsk", phrase: "Fraza" },
    lt:  { build: "Sudėk žodį · Norsk", buildPhrase: "Sudėk frazę · Norsk", phrase: "Frazė" },
    lv:  { build: "Saliec vārdu · Norsk", buildPhrase: "Saliec frāzi · Norsk", phrase: "Frāze" },
    ar:  { build: "كوّن الكلمة · Norsk", buildPhrase: "كوّن العبارة · Norsk", phrase: "عبارة" },
}, "BuildGame.L");

export const BuildGame = ({ setGameState, sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const [typed, setTyped] = useState(/** @type {string[]} */([]));   // введённые буквы по порядку (с клавиатуры)
    const submitArmedRef = useRef(false);   // дебаунс: ~250мс после нового слова submit не принимается (анти-фантомный Enter)

    const loop = useGameLoop({
        gmode: "build", words: wordsProp, onResult, onFinish, onExit, setGameState,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        // пауза перед переходом = длина озвучки ответа + хвост (target/aLang ниже — коллбэк зовётся позже)
        speakAnswer: () => (sound && target) ? speakTextEnd(target, aLang) : null,
        onAdvance: () => setTyped([]),   // новое слово — чистый ввод
        onWrong: () => setTyped([]),     // после ошибки — очистить, собрать заново
    });
    const { t, currentLanguage, total, current, status, missedIds, knownFirstTry, score, qIndex, qTotal, segs, answer, restart, backToSelection } = loop;
    const lx = L[currentLanguage] || L.ru;
    const playRef = usePlayDialogRef();

    const target = current?.translate?.no?.[0] || current?.no || "";
    const isPhrase = current?.part_of_speech === "phrase";   // подписи «фраза» вместо «слово»
    // подсказка — родной перевод; фолбэк на ru/en, но НИКОГДА на норвежский ответ (target)
    const trArr = (current?.translate?.[currentLanguage]?.length ? current.translate[currentLanguage]
        : (current?.translate?.ru?.length ? current.translate.ru : (current?.translate?.en || []))).filter(Boolean);
    const prompt = trArr.join(", ") || "—";
    const targetChars = useMemo(() => [...norm(target)], [current]); // символы цели по порядку
    // сколько каждой буквы нужно (для активации клавиш и счётчика-бейджа)
    const needed = useMemo(() => {
        const m = /** @type {Record<string, number>} */ ({}); for (const c of targetChars) m[c] = (m[c] || 0) + 1; return m;
    }, [current]); // eslint-disable-line
    const extras = useMemo(() => Object.keys(needed).filter((c) => !KBD_SET.has(c)), [current]); // eslint-disable-line
    const remainingOf = (c) => (needed[c] || 0) - typed.filter((x) => x === c).length;
    const qLang = hyLang(currentLanguage, false);  // язык подсказки — родной
    const aLang = hyLang(currentLanguage, true);   // ответ — норвежский

    // При показе: озвучиваем ЗАПРАШИВАЕМОЕ слово (родной перевод) + прогреваем норвежский ответ.
    useEffect(() => {
        if (!sound || status !== "ASKING") return;
        if (trArr[0]) speakText(trArr[0], qLang).catch(() => {});
        if (target) prefetchTts(target, aLang);
    }, [current, sound]); // eslint-disable-line
    // После ОШИБКИ озвучиваем верное слово. После ВЕРНОГО озвучкой+паузой управляет useGameLoop
    // (speakAnswer), чтобы переход совпал с длиной аудио.
    useEffect(() => {
        if (sound && status === "INCORRECT" && target) speakText(target, aLang).catch(() => {});
    }, [status]); // eslint-disable-line

    const canType = status === "ASKING" || status === "INCORRECT"; // в INCORRECT — повтор после показа ответа
    const assistKey = targetChars[typed.length] || null;   // ожидаемая по порядку буква → расширить её зону тапа

    // дебаунс submit: на новом слове блокируем отправку на 250мс (анти-фантомный Enter с прошлого задания)
    useEffect(() => {
        submitArmedRef.current = false;
        const tm = setTimeout(() => { submitArmedRef.current = true; }, 250);
        return () => clearTimeout(tm);
    }, [current]);

    // submit по ✓/Enter работает и на ПУСТОМ (= неверно → показывает шаблон-подсказку, слово откатывается)
    const submit = (sel = typed) => { if (!submitArmedRef.current) return; answer(norm(sel.join("")) === norm(target)); };
    // ввод буквы с клавиатуры: просто добавить. Проверка — по кнопке ✓ (не авто-завершение).
    const onType = (c) => setTyped((prev) => [...prev, c]);
    const dontKnow = () => { if (status === "ASKING") answer(false); };

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";

    // Импровизированный инпут с мигающим курсором (как реальное поле). ШАБЛОН-подсказку (тусклое
    // слово + подсветка верных/красных букв) показываем ТОЛЬКО ПОСЛЕ ошибки (INCORRECT). Хелпер tplSlots.
    const slots = tplSlots(typed, targetChars, { tpl: status === "INCORRECT", caret: canType });

    return (
        <div ref={playRef} className="play play--kbd" data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={baseCorrect + knownFirstTry} wrongCount={baseWrong + missedIds.size} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage">
                <div className="qcard">
                    <div className="qcount">{isPhrase ? lx.phrase : t.word} {qIndex} / {qTotal}</div>
                    <div className="qprompt">{isPhrase ? lx.buildPhrase : lx.build}</div>
                    <h1 className="qword" lang={qLang}>{hyphenate(prompt, qLang)}
                        {trArr[0] && <SpeakButton text={trArr[0]} lang={qLang} className="qspeak"
                            ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />}
                    </h1>
                    {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}

                    {/* собранное слово — тусклый шаблон + подсветка по позициям + мигающий курсор.
                        Буквы — инлайн в .build-line__row (обычный letter-spacing, спаны лишь красят). */}
                    <div className="build-line" lang={aLang}>
                        <span className="build-line__row">{slots.length ? slots : <span className="build-line__ph">_ _ _</span>}</span>
                    </div>

                    {/* QWERTY-клавиатура (режим «сборка»: активны только буквы слова, бейдж-счётчик повторов) */}
                    {canType && (
                        <GameKeyboard
                            lang={aLang} remainingOf={remainingOf} needed={needed} extras={extras} assistKey={assistKey}
                            canSubmit canBackspace={typed.length > 0}
                            onType={onType} onBackspace={() => setTyped((t) => t.slice(0, -1))} onSubmit={() => submit()}
                            onDunno={dontKnow} dunnoLabel={DUNNO[currentLanguage]} showDunno={status === "ASKING"} />
                    )}

                    {status === "CORRECT" && (
                        <div className="feedback" role="status" aria-live="polite" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(98,192,131,.16)", color: "var(--game-correct)" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-correct)" }}>{t.correctly}</div>
                            <RampCheer word={current} rank={rank} repeat={repeat} gmode="build" />
                        </div>
                    )}
                    {status === "INCORRECT" && (
                        <div className="feedback" role="status" aria-live="polite" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <RampDrop word={current} rank={rank} />
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <div className="fb-line">{t.mistake}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(target, aLang)}</div>
                            <div className="fb-line fb-line--cta"><Icon n="edit" sm /> {t.typeRightToGo}</div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    {/* проверка — клавишей ✓ в самой клавиатуре (как в обычном вводе); стирание — ⌫; «Не знаю» — слева.
                        Нижнюю дубль-кнопку «Проверить» убрали: она дублировала клавиатурный ✓. */}
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missedIds.size} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>
        </div>
    );
};

export default BuildGame;
