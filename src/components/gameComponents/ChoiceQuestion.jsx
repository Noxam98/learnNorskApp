// Презентационный компонент вопроса-выбора: слово + 4 варианта + подсветка.
// Чистое отображение, без SRS/игровой логики — только рисует карточку в стиле игры
// (классы .qcard/.qcount/.qprompt/.qword/.qpos/.choices/.choice + .is-correct/.is-wrong)
// и зовёт onPick(opt) по клику. Переиспользуется игрой «Выбор» (и далее placement/exam).
import { hyphenate } from "../ui/hyphenate.js";
import { BrandLoader } from "../ui/Spinner.jsx";

// props:
//   prompt      — слово-вопрос (строка)
//   promptLang  — язык вопроса (для lang= и переноса)
//   options     — string[] вариантов
//   optionLang  — язык вариантов
//   picked      — выбранный вариант или null
//   correct     — правильный вариант или null (для подсветки)
//   reveal      — bool: показывать верно/неверно
//   onPick(opt) — клик по варианту
//   posText     — подпись части речи (опц.)
//   hint        — узел-подсказка под вопросом (опц., напр. направление перевода)
//   countText   — строка-счётчик «слово N / M» (опц.)
//   disabled    — заблокировать выбор
//   loading     — bool: показать лоадер вместо вариантов (когда options ещё грузятся)
//   children    — доп. узлы под вариантами внутри карточки (фидбэк, подсказка «дальше»)
/**
 * @param {{
 *   prompt?: string, promptLang?: string, options?: string[] | null, optionLang?: string,
 *   optionSub?: Record<string, string>, optionSubLang?: string, picked?: string | null, correct?: string | null,
 *   reveal?: boolean, allowRetry?: boolean, onPick?: (opt: string) => void,
 *   posText?: string, hint?: any, countText?: any, disabled?: boolean, loading?: boolean, numbered?: boolean,
 *   listenSlot?: any, showWord?: boolean, inline?: boolean, children?: any,
 * }} props
 */
export const ChoiceQuestion = ({
    prompt, promptLang, options, optionLang, optionSub = {}, optionSubLang,
    picked = null, correct = null, reveal = false, allowRetry = false,
    onPick, posText, hint, countText, disabled = false, loading = false, numbered = false,
    listenSlot = null, showWord = true, inline = false, children,
}) => (
    <div className="qcard">
        {countText && <div className="qcount">{countText}</div>}
        {hint && !listenSlot && <div className="qprompt">{hint}</div>}
        {/* режим «на слух»: вместо слова — аудио-плеер; само слово показываем только когда showWord
            (после ответа или по «показать текст»). Обычный режим — listenSlot нет, слово как раньше. */}
        {listenSlot}
        {(!listenSlot || showWord) && <h1 className="qword" lang={promptLang}>{hyphenate(prompt, promptLang)}</h1>}
        {posText && (
            <span className="qpos">
                <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}
            </span>
        )}

        <div className={`choices${inline ? " choices--inline" : ""}`}>
            {(options || []).map((opt, i) => {
                const cls = reveal
                    ? (opt === correct ? " is-correct" : (opt === picked ? " is-wrong" : ""))
                    : (opt === picked ? " is-picked" : "");   // нейтральная подсветка выбора (без раскрытия)
                const sub = optionSub?.[opt];
                // повтор после ошибки: правильный вариант остаётся кликабельным (выбрать его → дальше)
                const btnDisabled = disabled && !(allowRetry && opt === correct);
                return (
                    <button
                        key={opt}
                        className={`choice${cls}${sub ? " choice--2line" : ""}${allowRetry && opt === correct ? " choice--retry" : ""}${numbered ? " choice--num" : ""}`}
                        lang={optionLang}
                        disabled={btnDisabled}
                        onClick={() => onPick?.(opt)}
                    >
                        {numbered && i < 9 && <span className="choice__num" aria-hidden="true">{i + 1}</span>}
                        <span className="choice__main">{hyphenate(opt, optionLang)}</span>
                        {sub && <span className="choice__sub" lang={optionSubLang || optionLang}>{hyphenate(sub, optionSubLang || optionLang)}</span>}
                    </button>
                );
            })}
            {loading && <div style={{ gridColumn: "1 / -1" }}><BrandLoader dark /></div>}
        </div>

        {children}
    </div>
);

export default ChoiceQuestion;
