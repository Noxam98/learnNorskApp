// Презентационный компонент вопроса-ввода: показываемое слово (перевод/лемма) +
// поле ввода + кнопка «Ответить». Чистое отображение, без SRS/игровой логики —
// рисует карточку в стиле игры (классы .qcard/.qcount/.qprompt/.qword/.qpos/.answer + .pcta)
// и зовёт onSubmit(введённыйТекст). Переиспользуется placement/exam (продукция).
// Аналог ChoiceQuestion.jsx, только вместо вариантов — текстовый ввод.
import { useState, useRef, useEffect } from "react";
import { hyphenate } from "../ui/hyphenate.js";
import { Icon } from "../ui/Icon.jsx";
import { langGuard } from "../../interface/i18nGuard.js";

// Локальная подпись кнопки «Ответить» на 5 языках (компонент самодостаточен,
// как и ChoiceQuestion — не тянет общий interfaceTranslate).
const SUBMIT_LABEL = langGuard({
    ru: "Ответить",
    en: "Answer",
    ukr: "Відповісти",
    pl: "Odpowiedz",
    lt: "Atsakyti",
}, "InputQuestion.SUBMIT_LABEL");

// props:
//   prompt        — показываемое слово-вопрос (строка: перевод для no→int или лемма)
//   promptLang    — язык показываемого слова (для lang= и переноса)
//   posText       — подпись части речи (опц.)
//   hint          — узел-подсказка под вопросом (опц., напр. направление перевода)
//   countText     — строка-счётчик «слово N / M» (опц.)
//   onSubmit(text)— отправка введённого текста
//   disabled      — заблокировать ввод и кнопку
//   placeholder   — плейсхолдер поля ввода (опц.)
//   lang          — язык интерфейса для подписи кнопки (ru/en/ukr/pl/lt), по умолч. ru
//   children      — доп. узлы внутри карточки (фидбэк и т.п.)
export const InputQuestion = ({
    prompt, promptLang, posText, hint, countText,
    onSubmit, disabled = false, placeholder = "", lang = "ru", children,
}) => {
    const [value, setValue] = useState("");
    const inputRef = useRef(null);

    // Сброс поля и фокус при смене вопроса.
    useEffect(() => {
        setValue("");
        if (inputRef.current) inputRef.current.focus();
    }, [prompt]);

    const submit = (e) => {
        e?.preventDefault();
        if (disabled) return;
        onSubmit?.(value);
    };

    const submitLabel = SUBMIT_LABEL[lang] || SUBMIT_LABEL.ru;

    return (
        <div className="qcard">
            {countText && <div className="qcount">{countText}</div>}
            {hint && <div className="qprompt">{hint}</div>}
            <h1 className="qword" lang={promptLang}>{hyphenate(prompt, promptLang)}</h1>
            {posText && (
                <span className="qpos">
                    <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} /> {posText}
                </span>
            )}

            <form className="answer" onSubmit={submit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck="false"
                    disabled={disabled}
                />
            </form>

            <div className="pcta">
                <button className="gbtn gbtn--accent" onClick={submit} disabled={disabled}>
                    <Icon n="check" sm /> {submitLabel}
                </button>
            </div>

            {children}
        </div>
    );
};

export default InputQuestion;
