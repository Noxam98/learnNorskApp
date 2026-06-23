// Триггер-чип + анкер-поповер с секциями чипов («Категории», «Часть речи», «Данные»…).
// Сам владеет кнопкой-триггером и позиционируется fixed (как Dropdown/ActionMenu) — это попап,
// а не модалка: открывается у кнопки, закрывается кликом вне. Используется в Базе и Учёбе.
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";
import { usePopup } from "./Dropdown.jsx";

// sections: [{ key, title, multi?, selected (массив для multi | значение для single), options: [{ value, label, count?, disabled? }], onPick(value) }]
export function FilterChipsPopup({ label, icon = "filter", count = 0, sections = [], footer = null, width = 320 }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const popRef = useRef(null);
    const pop = usePopup(ref, open, setOpen);
    // После рендера: если попап выходит за правый край — сдвигаем влево (как в Dropdown).
    useLayoutEffect(() => {
        const el = popRef.current;
        if (!open || !pop || !el) return;
        const w = el.offsetWidth, vw = window.innerWidth, m = 8;
        let left = pop.left;
        if (left + w > vw - m) left = vw - m - w;
        if (left < m) left = m;
        el.style.left = Math.round(left) + "px";
    }, [open, pop, count]);

    return (
        <div className="fpop" ref={ref}>
            <button type="button" className={`fchip fchip--toggle${count > 0 ? " is-on" : ""}${open ? " is-open" : ""}`}
                aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <Icon n={icon} sm /> {label}
                {count > 0 && <span className="fchip__n">{count}</span>}
            </button>
            {open && pop && (
                <div ref={popRef} className={"dd__pop fpop__pop" + (pop.up ? " dd__pop--up" : "")}
                    role="dialog"
                    style={{
                        left: pop.left, top: pop.top,
                        width: `min(${width}px, calc(100vw - 16px))`,
                        maxHeight: pop.maxH, transform: pop.up ? "translateY(-100%)" : "none",
                    }}>
                    {sections.map((s) => (
                        <div key={s.key} className="fpop__sec">
                            {s.title && <div className="fpop__sectitle">{s.title}</div>}
                            <div className="fpop__chips">
                                {s.options.map((o) => {
                                    const on = s.multi ? (s.selected || []).includes(o.value) : s.selected === o.value;
                                    const disabled = !!o.disabled && !on;
                                    return (
                                        <button key={o.value} type="button"
                                            className={`fchip${on ? " is-on" : ""}${disabled ? " is-empty" : ""}`}
                                            disabled={disabled} onClick={() => s.onPick(o.value)}>
                                            {o.label}{o.count != null && <span className="fchip__n">{o.count}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {footer}
                </div>
            )}
        </div>
    );
}

export default FilterChipsPopup;
