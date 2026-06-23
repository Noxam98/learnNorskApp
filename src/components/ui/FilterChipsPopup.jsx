// Переиспользуемый попап-фильтр с чипами. Несколько секций (напр. «Категории», «Часть речи»,
// «Данные»). Каждая секция — мульти- или одиночный выбор. Используется в Базе и Учёбе.
import { Modal } from "./Modal.jsx";

// sections: [{ key, title, multi?, selected (массив для multi | значение для single), options: [{ value, label, count?, disabled? }], onPick(value) }]
export function FilterChipsPopup({ open, onClose, title, sections = [], footer = null }) {
    return (
        <Modal open={open} onClose={onClose} title={title} maxWidth={560}>
            {sections.map((s) => (
                <div key={s.key} style={{ marginBottom: "var(--sp-4)" }}>
                    {s.title && <div style={{ fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>{s.title}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
        </Modal>
    );
}

export default FilterChipsPopup;
