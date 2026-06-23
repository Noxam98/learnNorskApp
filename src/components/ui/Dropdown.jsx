// Кастомный дропдаун (общий по проекту). Поповер позиционируется fixed —
// не режется overflow родителей (модалки/скролл-контейнеры).
//   <Dropdown value options onChange placeholder />   — выбор значения
//   <ActionMenu label icon items />                    — меню действий
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";
import { BtnSpinner } from "./Spinner.jsx";

// Общая логика позиционирования/закрытия поповера (переиспользуется FilterChipsPopup).
export function usePopup(ref, open, setOpen) {
    const [pop, setPop] = useState(null);
    useEffect(() => {
        if (!open) { setPop(null); return; }
        const place = () => {
            const el = ref.current; if (!el) return;
            const r = el.getBoundingClientRect();
            const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
            const up = below < 220 && above > below;
            setPop({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, maxH: Math.min(280, Math.max(160, up ? above : below)), up });
        };
        place();
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest(".dd__pop")) setOpen(false); };
        const onScroll = (e) => { if (e.target?.closest?.(".dd__pop")) return; place(); };
        const onResize = () => setOpen(false);
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("touchstart", onDoc);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("touchstart", onDoc);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [open]); // eslint-disable-line
    return pop;
}

export function Dropdown({ value, options, onChange, placeholder, disabled = false }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const popRef = useRef(null);
    const pop = usePopup(ref, open, setOpen);
    const sel = options.find((o) => o.value === value);
    const choose = (v) => { onChange(v); setOpen(false); };
    // После рендера: если попап шире, чем место справа, сдвигаем влево (используем
    // пространство слева от триггера); если и так не влезает — перенос делает CSS.
    useLayoutEffect(() => {
        const el = popRef.current;
        if (!open || !pop || !el) return;
        const w = el.offsetWidth, vw = window.innerWidth, m = 8;
        let left = pop.left;
        if (left + w > vw - m) left = vw - m - w;
        if (left < m) left = m;
        el.style.left = Math.round(left) + "px";
    }, [open, pop, value]);
    return (
        <div className={"dd" + (open ? " is-open" : "") + (disabled ? " is-disabled" : "")} ref={ref}>
            <button type="button" className="dd__trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => !disabled && setOpen((o) => !o)}>
                <span className="dd__val">
                    {sel ? <>{sel.emoji && <span className="dd__emoji">{sel.emoji}</span>}<span className="dd__valtxt">{sel.label}</span>{sel.sub && <span className="dd__valsub">{sel.sub}</span>}</>
                        : <span className="dd__placeholder">{placeholder || "—"}</span>}
                </span>
                <span className="dd__chev" aria-hidden="true"><svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </button>
            {open && pop && (
                <div ref={popRef} className={"dd__pop" + (pop.up ? " dd__pop--up" : "")} role="listbox"
                    style={{
                        left: pop.left, top: pop.top,
                        minWidth: pop.width,             // не уже триггера
                        width: "max-content",            // растём по длинной опции
                        maxWidth: "calc(100vw - 16px)",  // максимум — почти вся ширина экрана
                        maxHeight: pop.maxH, transform: pop.up ? "translateY(-100%)" : "none",
                    }}>
                    {options.map((o) => (
                        <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                            className={"dd__opt" + (o.value === value ? " is-sel" : "")} onClick={() => choose(o.value)}>
                            {o.emoji && <span className="dd__optemoji">{o.emoji}</span>}
                            <span className="dd__opttxt">{o.label}</span>
                            {o.sub && <span className="dd__optsub">{o.sub}</span>}
                            {o.value === value && <span className="dd__check" aria-hidden="true">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Меню действий — тот же поповер, что в списках слов (.tool + .actionsmenu).
// items = [{ key, label, icon, onClick, danger, disabled, busy }]. align: "left" | "right".
export function ActionMenu({ label, icon = "dots", items = [], align = "left", iconRight = false, iconLg = false }) {
    const [open, setOpen] = useState(false);
    const ic = <Icon n={icon} sm={!iconLg} lg={iconLg} />;
    return (
        <div style={{ position: "relative" }}>
            <button type="button" className="tool" onClick={() => setOpen((p) => !p)} aria-haspopup="menu" aria-expanded={open}>
                {iconRight ? <>{label} {ic}</> : <>{ic} {label}</>}
            </button>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                    <div className="card actionsmenu" style={align === "left" ? { right: "auto", left: 0 } : undefined}>
                        {items.filter(Boolean).map((it) => (
                            <button key={it.key || it.label} className={`actionsmenu__item${it.danger ? " is-danger" : ""}`}
                                disabled={it.disabled} onClick={() => { setOpen(false); it.onClick?.(); }}>
                                {it.busy ? <BtnSpinner /> : <Icon n={it.icon} sm />} <span>{it.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default Dropdown;
