import { useEffect, useState } from 'react';
import { Icon } from "../ui/Icon.jsx";

// Глобальный тост (внизу слева). Расширён: необязательная кнопка-действие (action) и режим
// persist (не гаснет по таймеру — только по кнопке/повторному showToast). type: error|success|warning|info.
const Error = ({ text, setText, type = "error", url = "", action = null, persist = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const success = type === "success";
    const warning = type === "warning";
    const info = type === "info";
    const cls = success ? " alert--success" : warning ? " alert--warning" : info ? " alert--info" : "";
    const icon = success ? "check" : (warning || info) ? "info" : "x";
    // клик по телу ведёт по url ТОЛЬКО если нет кнопки-действия (иначе тело не кликабельно)
    const onClick = (url && !action) ? () => { setText(""); try { window.location.hash = url; } catch { /* */ } } : undefined;
    useEffect(() => {
        if (!text) { setIsVisible(false); return; }
        setIsVisible(true);
        if (persist) return;   // не гаснет сам
        const a = setTimeout(() => setIsVisible(false), 5000);
        const b = setTimeout(() => setText(''), 6000);
        return () => { clearTimeout(a); clearTimeout(b); };
    }, [text, persist]); // eslint-disable-line

    return (
        <div
            className={"alert" + cls}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                position: "fixed", left: "var(--sp-4)", bottom: "var(--sp-4)", zIndex: 120,
                maxWidth: 380, boxShadow: "var(--shadow-lg)",
                transform: isVisible ? "translateY(0)" : "translateY(160%)",
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? "auto" : "none",
                cursor: onClick ? "pointer" : undefined,
                transition: "transform .35s var(--ease), opacity .35s var(--ease)",
                whiteSpace: "pre-wrap",
                display: "flex", alignItems: "center", gap: "10px",
            }}
        >
            <Icon n={icon} sm />
            <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
            {action && (
                <button type="button" className="alert__action"
                    onClick={(e) => { e.stopPropagation(); action.onClick?.(); }}>
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default Error;
