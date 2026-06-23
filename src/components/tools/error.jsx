import { useEffect, useState } from 'react';
import { Icon } from "../ui/Icon.jsx";

const Error = ({ text, setText, type = "error", url = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const success = type === "success";
    const warning = type === "warning";
    const cls = success ? " alert--success" : warning ? " alert--warning" : "";
    const icon = success ? "check" : warning ? "info" : "x";
    const onClick = url ? () => { setIsVisible(false); setText(""); try { window.location.hash = url; } catch { /* */ } } : undefined;
    useEffect(() => {
        if (text) {
            setIsVisible(true);
            const a = setTimeout(() => {
                setIsVisible(false);
                const b = setTimeout(() => setText(''), 1000);
                return () => clearTimeout(b);
            }, 5000);
            return () => clearTimeout(a);
        }
    }, [text]);

    return (
        <div
            className={"alert" + cls}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                position: "fixed", left: "var(--sp-4)", bottom: "var(--sp-4)", zIndex: 120,
                maxWidth: 360, boxShadow: "var(--shadow-lg)",
                transform: isVisible ? "translateY(0)" : "translateY(160%)",
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? "auto" : "none",
                cursor: onClick ? "pointer" : undefined,
                transition: "transform .35s var(--ease), opacity .35s var(--ease)",
                whiteSpace: "pre-wrap",
            }}
        >
            <Icon n={icon} sm /> {text}
        </div>
    );
};

export default Error;
