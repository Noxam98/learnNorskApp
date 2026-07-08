// @ts-check
// Игра «Ввод»: игрок печатает перевод. Для НОРВЕЖСКОГО ответа (int2no) — наша экранная клавиатура
// (свободный режим, без подсказок-букв), как в «Сборке». Для родного языка (no2int) — штатный
// инпут (нашей раскладкой кириллицу/др. не набрать, да и смысла печатать родной нет).
// На верном — авто-переход; на ошибке — показ ответа, ввод сбрасывается, дальше — когда введёт верно.
// Механика цикла (стейт-машина, SRS, ретрай, авто-переход, финиш) — в useGameLoop.
import { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon.jsx";
import { posLabel, wordForms } from "../ui/pos.js";
import { hyphenate, hyLang } from "../ui/hyphenate.js";
import { SpeakButton } from "../ui/SpeakButton.jsx";
import { speakText, speakTextEnd, prefetchTts } from "../ui/tts.js";
import { playSound } from "../tools/sound.js";
import { ENDONYM, DUNNO, PLAY_STYLE, foldLoose, foldLight, withinOneEdit, PlayTopBar, RepeatBadge, ProgressSegments, NoWords, FinishScreen, noWithPrefix, tplSlots, isGrammar, grammarAnswer, grammarAccepts, FormPrompt, RampCheer , RampDrop } from "./gameShared.jsx";
import { GameKeyboard, keysAdjacent } from "./GameKeyboard.jsx";
import { useGameLoop } from "./useGameLoop.js";
import { useSystemStore } from "../../store/systemStore.jsx";

const TYPO_NEXT_MS = 250;   // хвост после окончания озвучки ответа (Да/Нет), затем авто-переход

// Ожидаемая след. буква для «ассиста» клавиатуры (расширение зоны тапа). Среди принятых ответов
// берём первый, чей префикс снисходительно (foldLoose: å≈a, ø≈o, æ≈ae) совпадает с уже введённым,
// и отдаём его следующий РЕАЛЬНЫЙ символ (с å/ø/æ — подсветить именно нужную клавишу).
// null — если ввод разошёлся со всеми принятыми (юзер печатает не то — не помогаем «не туда»).
const nextAssistKey = (targets, input) => {
    const ic = [...(input || "")];
    for (const tgt of (targets || [])) {
        const tc = [...(tgt || "")];
        let ok = true;
        for (let i = 0; i < ic.length; i++) {
            if (i >= tc.length || foldLoose(ic[i]) !== foldLoose(tc[i])) { ok = false; break; }
        }
        if (ok && ic.length < tc.length) return tc[ic.length].toLowerCase();
    }
    return null;
};

export const InputGame = ({ setGameState, mode = "no2int", sound = false, words: wordsProp, onResult, onExit, onFinish, stepNo = 0, stepTotal = 0, segs: segsOverride = null, repeat = false, baseCorrect = 0, baseWrong = 0, rank = 0 }) => {
    const isNo2Int = mode !== "int2no";
    // грамм-упражнение (ввод формы): печатаем норвежскую форму (target.value), всегда экранной клавой.
    const grammar = isGrammar(wordsProp?.[0]);
    // форма-СЛОВО (трек форм): озвучиваем лемму при показе и верную форму после ответа (norsk)
    const formWord = grammar && !!wordsProp?.[0]?.form_track;
    // печатаем норвежское → наша экранная клавиатура; для ввода родного перевода (no2int) — штатный инпут.
    // грамм — всегда экранная клава (норв. форма с å/ø/æ).
    const useKbd = grammar || !isNo2Int;
    const [input, setInput] = useState("");
    const [typoAsk, setTypoAsk] = useState(/** @type {{typed:string, correct:string}|null} */(null)); // найден near-miss — спросить «опечатка?»
    const [resolving, setResolving] = useState(false);   // после выбора Да/Нет — короткая пауза до авто-перехода (клавиатуру прячем)
    const typoTmrRef = useRef(/** @type {any} */(null)); // таймер этого авто-перехода
    const [typoOk, setTypoOk] = useState(false);   // ответ принят с одной опечаткой (повтор)
    const [letterHint, setLetterHint] = useState(/** @type {string|null} */(null)); // зачтено, но ввели базу вместо å/ø/æ — показать написание
    const [armed, setArmed] = useState(false);     // анти-ghost-click: тап-продолжение активируется не сразу
    const typoRef = useRef(false);                  // тот же флаг для onFinish (без гонок ререндера)
    const inputRef = useRef(/** @type {HTMLInputElement | null} */(null));
    const mountedRef = useRef(true);                // жив ли компонент — против поздних advance после выхода (Esc/×) в окне озвучки
    const submitArmedRef = useRef(false);           // дебаунс: ~250мс после нового слова submit не принимается
    //                                                 (чтобы фантомный Enter с прошлого задания не сработал)
    // Очистить поле и (для штатного инпута) вернуть фокус — чтобы после ошибки сразу вводить заново.
    const resetInput = () => { setInput(""); setTimeout(() => inputRef.current?.focus(), 0); };

    const loop = useGameLoop({
        gmode: "input", words: wordsProp, onResult, setGameState,
        // в onFinish прокидываем флаг «принято с опечаткой» — для пункта «Защищено с опечаткой» в итоге
        onFinish: onFinish ? (s) => onFinish({ ...s, typo: typoRef.current }) : null,
        onExit,
        stepNo, stepTotal, segs: segsOverride, autoAdvanceMs: 1100, rank,
        // со звуком пауза перед переходом = длина озвучки ответа + хвост (correctPrimary/aLang ниже).
        // При опечатке (held) переход по тапу — там озвучивает сама игра, см. эффект ниже.
        speakAnswer: () => (sound && correctPrimary && (!grammar || formWord)) ? speakTextEnd(correctPrimary, aLang) : null,
        onAdvance: () => { setInput(""); setTypoOk(false); setTypoAsk(null); setResolving(false); setLetterHint(null); typoRef.current = false; },   // новое слово — чистое поле
        onWrong: () => { resetInput(); setTypoOk(false); setTypoAsk(null); setLetterHint(null); typoRef.current = false; },     // после ошибки — сбросить (и сфокусировать штатный инпут)
    });
    const { t, currentLanguage, total, current, status, held, missedIds, knownFirstTry, score, qIndex, qTotal, segs, answer, advance, restart, backToSelection } = loop;

    const showArticles = useSystemStore((s) => s.showArticles);
    const showVerbAa = useSystemStore((s) => s.showVerbAa);
    const no = current?.translate?.no?.[0] || "";
    const translations = (current?.translate?.[currentLanguage] || []).filter(Boolean);
    const grammarAns = grammar ? grammarAnswer(current) : "";   // канонич. форма (target.value) — для показа/озвучки/шаблона
    const question = isNo2Int ? no : (translations.join(", ") || no);
    // грамм: принимаем ВСЕ валидные дублеты формы — target.value + target.accept (напр. boka/boken);
    // канонич. вид (grammarAns) остаётся для показа/озвучки. Обычный ввод — как было.
    const accepted = grammar ? grammarAccepts(current)
        : (isNo2Int ? translations : (current?.translate?.no || [])).map((s) => s.trim()).filter(Boolean);
    // при ВВОДе норвежского (int2no) принимаем и словоформы (hunden/snakker/snakket), не только лемму;
    // для родного (no2int) словоформ нет. Грамм — набор дублетов из accepted (wordForms не подмешиваем).
    const acceptSet = grammar ? accepted : (isNo2Int ? accepted : [...accepted, ...wordForms(no, current?.forms)]);
    // показ норв. слова — с артиклем/«å» по настройке: вопрос (no2int) и раскрытый ответ (int2no).
    // Озвучка и сверка ввода — по «голой» лемме (артикль не печатают). Грамм — вопрос рисует FormPrompt.
    const promptDisp = isNo2Int ? noWithPrefix(no, current, { articles: showArticles, verbAa: showVerbAa }) : question;
    const answerDisp = grammar ? grammarAns
        : (isNo2Int ? accepted.join(", ")
            : [noWithPrefix(accepted[0] || no, current, { articles: showArticles, verbAa: showVerbAa }), ...accepted.slice(1)].join(", "));
    const correctPrimary = grammar ? grammarAns : ((isNo2Int ? translations[0] : no) || "");
    const promptTarget = isNo2Int ? (ENDONYM[currentLanguage] || currentLanguage) : "Norsk";
    const qLang = hyLang(currentLanguage, isNo2Int);
    // грамм-ответ — норвежская форма → язык ввода/вывода всегда «nb»
    const aLang = grammar ? "nb" : hyLang(currentLanguage, !isNo2Int);
    const canType = (status === "ASKING" || status === "INCORRECT") && !resolving;
    const assistKey = useKbd ? nextAssistKey(acceptSet, input) : null;   // ожидаемая буква → расширить её зону тапа

    // дебаунс submit: на новом слове блокируем отправку на 250мс (анти-фантомный Enter с прошлого задания)
    useEffect(() => {
        submitArmedRef.current = false;
        const tm = setTimeout(() => { submitArmedRef.current = true; }, 250);
        return () => clearTimeout(tm);
    }, [current]);

    useEffect(() => {
        // фокус штатного инпута при показе и при повторе после ошибки
        if (!useKbd && (status === "ASKING" || status === "INCORRECT") && inputRef.current) inputRef.current.focus();
    }, [status, current]); // eslint-disable-line

    // Озвучка видимого слова при показе (+ прогрев правильного ответа заранее).
    // Грамм: форму-СЛОВО (трек форм) озвучиваем — лемма при показе + прогрев формы; артикли — нет.
    useEffect(() => {
        if (!sound || status !== "ASKING" || (grammar && !formWord)) return;
        if (formWord) {
            const lemma = current?.prompt?.lemma || no;
            if (lemma) speakText(lemma, "nb").catch(() => {});
            if (correctPrimary) prefetchTts(correctPrimary, aLang);
            return;
        }
        if (question) speakText(question, qLang).catch(() => {});
        if (correctPrimary) prefetchTts(correctPrimary, aLang);
    }, [current, sound]); // eslint-disable-line
    // Озвучка верного ответа: после ОШИБКИ или принятой опечатке (held), НО не в resolving — там
    // confirm/deny сами озвучивают и ждут конца аудио (afterTypoAudio), чтобы не было двойной озвучки.
    // После обычного ВЕРНОГО озвучкой+паузой управляет useGameLoop (speakAnswer).
    useEffect(() => {
        if (sound && correctPrimary && !resolving && (!grammar || formWord) && (status === "INCORRECT" || (status === "CORRECT" && held))) {
            speakText(correctPrimary, aLang).catch(() => {});
        }
    }, [status]); // eslint-disable-line

    const submit = (e) => {
        e?.preventDefault?.();
        if (!submitArmedRef.current || typoAsk) return;   // дебаунс + не отправляем, пока ждём ответа на «опечатка?»
        // грамм-форму сверяем СТРОГО (foldLight сохраняет å/ø/æ): «boker» ≠ «bøker» — иначе упражнение
        // на нерегулярное мн.ч. теряет смысл. Обычный ввод — снисходительно (foldLoose), как было.
        const eq = grammar ? foldLight : foldLoose;
        const fin = eq(input);
        const exactHit = acceptSet.find((a) => eq(a) === fin);
        if (exactHit) {
            // зачтено. Если ввели БАЗОВУЮ букву вместо å/ø/æ (foldLight различается) — тихо показать
            // правильное написание (всегда верно, снисходительность сохраняется).
            setLetterHint(useKbd && foldLight(input) !== foldLight(exactHit) ? exactHit : null);
            setTypoOk(false); typoRef.current = false; answer(true); return;
        }
        // Близкая опечатка: ОДНА правка (замена — только соседних по клаве букв / перестановка / пропуск-
        // лишняя), слова от 3 букв (на 2-буквенных 1 правка ≈ совсем другое слово). НЕ зачитываем сами —
        // показываем что нашли и спрашиваем пользователя (он сам отвечает за свою учёбу). Только при вводе
        // норвежского (наша раскладка → карта соседства валидна).
        // грамм-форма: прощение опечаток отключено (scoring.typoForgive=false) — мимо ровно один путь: верно/неверно.
        const typoForgive = grammar ? (current?.scoring?.typoForgive ?? false) : true;
        if (useKbd && typoForgive) {
            // соседство проверяем ДВАЖДЫ: по свёрнутой строке (a/o/ae — для тех, кто печатает базовые буквы)
            // И по «сырой» с сохранёнными å/ø/æ (соседство по фактическим клавишам: å рядом с ø/p/æ).
            const finRaw = foldLight(input);
            const hit = acceptSet.find((a) => {
                const fa = foldLoose(a), faRaw = foldLight(a);
                return (fa.length >= 3 && fin.length >= 3 && withinOneEdit(fa, fin, keysAdjacent))
                    || (faRaw.length >= 3 && finRaw.length >= 3 && withinOneEdit(faRaw, finRaw, keysAdjacent));
            });
            if (hit) { setTypoAsk({ typed: input.trim(), correct: hit }); return; }
        }
        // ввод родного (no2int): карты соседства нет — прежнее поведение (тихий зачёт опечатки на повторе)
        if (!useKbd) {
            const typo = repeat && fin.length >= 4 && acceptSet.some((a) => { const fa = foldLoose(a); return fa.length >= 4 && withinOneEdit(fa, fin); });
            if (typo) { setTypoOk(true); typoRef.current = true; playSound("typo"); answer(true, { hold: true, silent: true }); return; }
        }
        setTypoOk(false); typoRef.current = false; answer(false);
    };
    // После выбора Да/Нет — озвучиваем верное слово ДО КОНЦА, потом короткий хвост и дальше (без тапа).
    // Пейсим по концу аудио (а не фикс. таймером), чтобы слово не обрезалось. Страховка по времени.
    const clearTypoTmr = () => { if (typoTmrRef.current) { clearTimeout(typoTmrRef.current); typoTmrRef.current = null; } };
    const afterTypoAudio = () => {
        clearTypoTmr();
        const go = () => {
            if (!mountedRef.current) return;   // вышли из игры (Esc/×) между confirm/deny и концом озвучки — не трогаем мёртвый стейт
            clearTypoTmr();
            typoTmrRef.current = setTimeout(() => { typoTmrRef.current = null; if (mountedRef.current) advance(); }, TYPO_NEXT_MS);
        };
        typoTmrRef.current = setTimeout(() => {   // пауза 300мс перед озвучкой ответа
            const p = (sound && correctPrimary) ? speakTextEnd(correctPrimary, aLang) : null;
            if (!p) { go(); return; }
            let done = false; const once = () => { if (done) return; done = true; go(); };
            const guard = setTimeout(once, 6000);
            p.then(() => { clearTimeout(guard); once(); }, () => { clearTimeout(guard); once(); });
        }, 300);
    };
    // «Да, опечатка» — засчитываем верно (тег «с опечаткой»).
    const confirmTypo = () => { setTypoAsk(null); setResolving(true); setTypoOk(true); typoRef.current = true; playSound("typo"); answer(true, { hold: true, silent: true }); afterTypoAudio(); };
    // «Нет, ошибся» — обычная ошибка (ответ уже показан панелью, поэтому не заставляем перепечатывать — пауза и дальше).
    const denyTypo = () => { setTypoAsk(null); setResolving(true); setTypoOk(false); typoRef.current = false; answer(false); afterTypoAudio(); };
    useEffect(() => () => { mountedRef.current = false; clearTypoTmr(); }, []);   // размонтирование: пометить + снять таймер
    const dontKnow = () => { if (status === "ASKING") answer(false); };
    // принято с опечаткой: авто-перехода нет — продолжаем тапом по любому месту сцены.
    // «Взвод» (~400мс): иначе тот же тап, что отправил ответ, долетает «ghost click» по сцене
    // (клавиатура исчезла) и мгновенно перескакивает, не дав прочитать верное написание.
    useEffect(() => {
        if (status === "CORRECT" && typoOk) {
            setArmed(false);
            const tm = setTimeout(() => setArmed(true), 400);
            return () => clearTimeout(tm);
        }
        setArmed(false);
    }, [status, typoOk]);
    const onStageClick = () => { if (status === "CORRECT" && typoOk && armed) { clearTypoTmr(); advance(); } };   // тап раньше таймера — отменяем таймер

    if (total === 0 || !current) return <NoWords t={t} onBack={backToSelection} />;

    const posText = posLabel(current.part_of_speech, t);
    const descriptionText = current.description?.description?.[currentLanguage] || "";
    const otherAccepted = accepted.filter((a) => foldLoose(a) !== foldLoose(input));
    // экранный ввод: после ошибки (и при вопросе «опечатка?») показываем ШАБЛОН правильного слова
    // (тусклым) + красным неверные буквы по позициям — это и есть «что мы нашли». До этого — обычный ввод.
    const tplTarget = (typoAsk ? typoAsk.correct : (grammar ? grammarAns : no) || "").trim().toLowerCase();
    const inputSlots = useKbd ? tplSlots([...input], [...tplTarget], { tpl: status === "INCORRECT" || !!typoAsk, caret: canType && !typoAsk }) : null;

    return (
        <div className={"play" + (useKbd ? " play--kbd" : "")} data-state={status.toLowerCase()} style={PLAY_STYLE}>
            <PlayTopBar correctCount={baseCorrect + knownFirstTry} wrongCount={baseWrong + missedIds.size} onExit={backToSelection} t={t} tag={repeat ? <RepeatBadge /> : null} />
            <ProgressSegments segs={segs} status={status} />

            <div className="pstage" onClick={onStageClick}
                style={status === "CORRECT" && typoOk ? { cursor: "pointer" } : undefined}>
                <div className="qcard">
                    <div className="qcount">{t.word} {qIndex} / {qTotal}</div>
                    {/* грамм-упражнение: вопрос о форме (лемма + подпись) без перевода/озвучки/части речи */}
                    {grammar ? (
                        <FormPrompt word={current} lang={currentLanguage} />
                    ) : (
                        <>
                            <div className="qprompt">{t.translateTo} {promptTarget}</div>
                            <h1 className="qword" lang={qLang}>{hyphenate(promptDisp, qLang)}
                                <SpeakButton text={question} lang={qLang} className="qspeak" lg
                                    ariaLabel={t.tts} title={t.tts} titlePreparing={t.ttsPreparing} />
                            </h1>
                            {posText && <span className="qpos"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}</span>}
                        </>
                    )}

                    {useKbd ? (
                        <div className="build-line" lang={aLang}>
                            <span className="build-line__row">{inputSlots && inputSlots.length ? inputSlots : <span className="build-line__ph">_ _ _</span>}</span>
                        </div>
                    ) : (
                        <form className="answer" onSubmit={submit}>
                            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                                placeholder={t.yourAnswer} autoComplete="off" spellCheck="false"
                                disabled={status === "CORRECT"} />
                        </form>
                    )}

                    {status === "CORRECT" && typoOk && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(232,170,72,.18)", color: "#d98a2b" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "#d98a2b" }}>{t.typoOk}</div>
                            <RampCheer word={current} rank={rank} repeat={repeat} gmode="input" />
                            <div className="fb-answer" lang={aLang}>{hyphenate(correctPrimary, aLang)}</div>
                            {!resolving && <div className="pcta"><span className="qhint">{t.tapNext} <Icon n="arrow-right" sm /></span></div>}
                        </div>
                    )}
                    {status === "CORRECT" && !typoOk && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(98,192,131,.16)", color: "var(--game-correct)" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-correct)" }}>{t.correctly}</div>
                            <RampCheer word={current} rank={rank} repeat={repeat} gmode="input" />
                            {/* тихая подсказка: ввели базовую букву вместо å/ø/æ — показать правильное написание (å/ø/æ подсвечены) */}
                            {letterHint && <div className="fb-line">{t.letterHint} <b className="lh-word" lang={aLang}>{[...letterHint].map((ch, i) => /[åøæ]/i.test(ch) ? <span key={i} className="lh-spec">{ch}</span> : ch)}</b></div>}
                            {otherAccepted.length > 0 && <div className="fb-line">{t.alsoAccepted} <b lang={aLang}>{hyphenate(otherAccepted.join(", "), aLang)}</b></div>}
                        </div>
                    )}
                    {status === "INCORRECT" && (
                        <div className="feedback" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(230,122,82,.16)", color: "var(--game-incorrect)" }}><Icon n="x" lg /></div>
                            <div className="fb-title" style={{ color: "var(--game-incorrect)" }}>{t.notQuite}</div>
                            <RampDrop word={current} rank={rank} />
                            <div className="fb-line">{t.mistake}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(answerDisp, aLang)}</div>
                            <div className="fb-line fb-line--cta"><Icon n="edit" sm /> {t.typeRightToGo}</div>
                            {descriptionText && <div className="fb-line muted">{descriptionText}</div>}
                        </div>
                    )}

                    {/* близкая опечатка: показали красным в инпуте, что нашли + верное написание; спрашиваем юзера */}
                    {typoAsk && (
                        <div className="feedback typo-ask" style={{ display: "flex" }}>
                            <div className="fb-icon" style={{ background: "rgba(232,170,72,.18)", color: "#d98a2b" }}><Icon n="check" lg /></div>
                            <div className="fb-title" style={{ color: "#d98a2b" }}>{t.typoAsk}</div>
                            <div className="fb-answer" lang={aLang}>{hyphenate(typoAsk.correct, aLang)}</div>
                            <div className="typo-ask__btns">
                                <button className="gbtn gbtn--accent" onClick={confirmTypo}><Icon n="check" sm /> {t.typoYes}</button>
                                <button className="gbtn" onClick={denyTypo}><Icon n="x" sm /> {t.typoNo}</button>
                            </div>
                        </div>
                    )}

                    {/* наша клавиатура (свободный режим — без подсказок-букв), только для норвежского ответа */}
                    {useKbd && canType && !typoAsk && (
                        <GameKeyboard
                            lang={aLang} extras={["-"]} assistKey={assistKey}
                            canSubmit canBackspace={input.length > 0}
                            onType={(c) => setInput(input + c)} onBackspace={() => setInput((s) => s.slice(0, -1))} onSubmit={() => submit()}
                            onDunno={dontKnow} showDunno={status === "ASKING"} dunnoLabel={DUNNO[currentLanguage]} />
                    )}

                    <div className="pcta">
                        {status !== "CORRECT" && !typoAsk &&
                            <button className="gbtn gbtn--accent" onClick={submit}><Icon n="check" sm /> {t.check}</button>}
                    </div>
                </div>

                {status === "FINISHED" && !onFinish && (
                    <FinishScreen score={score} knownFirstTry={knownFirstTry} missedCount={missedIds.size} total={total}
                        t={t} onRestart={restart} onExit={backToSelection} />
                )}
            </div>

            {/* «Не знаю»: с экранной клавиатурой — её рисует сама GameKeyboard (над панелью, единообразно).
                Без неё (физическая клава / ввод в поле) — неприметная угловая кнопка, прямой ребёнок .play
                (чтобы её не подрезал overflow:hidden у .pstage). */}
            {status === "ASKING" && !useKbd && (
                <button className="dunno-corner" onClick={dontKnow}>{DUNNO[currentLanguage]}</button>
            )}
        </div>
    );
};

export default InputGame;
