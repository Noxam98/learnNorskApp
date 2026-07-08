// Прогон экзамена/аудита поверх ОБЩЕГО игрового цикла (useGameLoop) в нейтральном режиме
// (reveal=false): без раскрытия правильного, нейтральная подсветка выбора, пауза и переход —
// всё из цикла. Стратегия: копим выборы и грейдим пачкой на сервере (онлайн-авторитетно).
// Общий для ворот и аудита (kind). Вынесено из ExamTab.jsx.
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon.jsx";
import { ChoiceQuestion } from "../../components/gameComponents/ChoiceQuestion.jsx";
import { GameKeyboard } from "../../components/gameComponents/GameKeyboard.jsx";
import { PLAY_STYLE, PlayTopBar, ProgressSegments, ENDONYM } from "../../components/gameComponents/gameShared.jsx";
import { useGameLoop } from "../../components/gameComponents/useGameLoop.js";
import { playSound } from "../../components/tools/sound.js";
import { speakText } from "../../components/ui/tts.js";
import { hyLang } from "../../components/ui/hyphenate.js";
import { useSystemStore } from "../../store/systemStore.jsx";

export default function ExamRun({ questions, lang, t, onExit, onGrade }) {
    const soundOn = useSystemStore((s) => s.soundOn);
    const vibration = useSystemStore((s) => s.vibration);
    const answersRef = useRef([]);
    const loop = useGameLoop({
        gmode: "exam", words: questions, reveal: false, autoAdvanceMs: 900,
        onResult: (w, _ok, _g, choice) => { answersRef.current.push({ pool_id: w.pool_id, answer: choice || "", type: w.type }); },
        onFinish: () => onGrade(answersRef.current),
        onExit,
    });
    const { current, picked, answer, qIndex, qTotal, backToSelection } = loop;
    const [typed, setTyped] = useState("");   // для типа input

    // свуш + озвучка норв. слова при появлении вопроса (по настройке звука)
    useEffect(() => {
        if (!current) return;
        setTyped("");
        playSound("question");
        // озвучка вопроса: no2int — норвежское слово; int2no/input — родной (рус.) промпт.
        // cloze не озвучиваем (в предложении пропуск). Норвежский ОТВЕТ нигде не произносим.
        if (soundOn) {
            const ty = current.type || "no2int";
            if (ty === "no2int" && current.no) speakText(current.no, hyLang(lang, true)).catch(() => {});
            else if ((ty === "int2no" || ty === "input") && current.prompt) speakText(current.prompt, hyLang(lang, false)).catch(() => {});
        }
    }, [current]); // eslint-disable-line

    if (!current) return null;
    const pick = (v) => { if (vibration) { try { navigator.vibrate?.(10); } catch { /* нет вибро — ок */ } } answer(v); };
    // тип вопроса: no2int (норв.→перевод) | int2no (перевод→норв.) | cloze (пропуск) | input (ввод)
    const type = current.type || "no2int";
    const isInt2no = type === "int2no", isCloze = type === "cloze", isInput = type === "input";
    const prompt = isInt2no ? current.prompt : isCloze ? (current.blank || "").replace("___", "＿＿＿") : current.no;
    const promptLang = isInt2no ? lang : "no";
    const optionLang = (isInt2no || isCloze) ? "no" : lang;
    const hint = isInt2no ? t.hintInt2no : isCloze ? t.hintCloze : `${t.dir}${ENDONYM[lang] || lang}`;
    const onInputSubmit = () => { if (picked == null && typed.trim()) pick(typed.trim()); };
    const useKbd = true;   // всегда наша экранная клавиатура (как в игре «Ввод»)
    // ЕДИНЫЙ СКЕЛЕТ с играми: .play + PlayTopBar + ProgressSegments + .pstage. Поведение СВОЁ —
    // нейтрально (без ✓/✗ по ходу), счётчик «N/30» вместо них, прогресс нейтральный (is-done),
    // грейд пачкой на сервере. Клавиатура хостится как у игр (.play--kbd) → одинаково везде.
    const segs = Array.from({ length: qTotal }, (_, i) => (i < qIndex - 1 ? "done" : i === qIndex - 1 ? "now" : ""));
    const count = <span className="stat"><Icon n="layers" sm /> {qIndex} / {qTotal}</span>;
    return (
        <div className={"play" + (isInput && useKbd ? " play--kbd" : "")} data-state="asking" style={PLAY_STYLE}>
            <PlayTopBar correctCount={0} wrongCount={0} onExit={backToSelection} t={t} centerNode={count} />
            <ProgressSegments segs={segs} />
            <div className="pstage">
                {isInput ? (
                    <div className="qcard">
                        <div className="qprompt">{t.hintInput}</div>
                        <h1 className="qword" lang={lang}>{current.prompt}</h1>
                        {useKbd ? (
                            <div className="build-line" lang="no">{typed || <span className="build-line__ph">_ _ _</span>}</div>
                        ) : (
                            <form className="answer" onSubmit={(e) => { e.preventDefault(); onInputSubmit(); }}>
                                <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={picked != null}
                                    autoComplete="off" spellCheck="false" lang="no" placeholder="Norsk…" autoFocus />
                            </form>
                        )}
                        {useKbd && picked == null && (
                            <GameKeyboard lang="no" extras={["-"]} leftFiller
                                canSubmit={typed.length > 0} canBackspace={typed.length > 0}
                                onType={(c) => setTyped(typed + c)} onBackspace={() => setTyped(typed.slice(0, -1))}
                                onSubmit={onInputSubmit} />
                        )}
                        {!useKbd && (
                            <div className="pcta">
                                <button className="gbtn gbtn--accent" onClick={onInputSubmit} disabled={picked != null || !typed.trim()}>
                                    <Icon n="check" sm /> {t.inputSubmit}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <ChoiceQuestion
                        prompt={prompt}
                        promptLang={promptLang}
                        options={current.options || []}
                        optionLang={optionLang}
                        onPick={pick}
                        picked={picked}
                        reveal={false}
                        disabled={picked != null}
                        hint={hint}
                    />
                )}
            </div>
        </div>
    );
}
