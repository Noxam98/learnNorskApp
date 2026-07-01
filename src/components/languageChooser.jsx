import { useState, useRef, useEffect } from 'react';
import { useSystemStore } from "../store/systemStore.jsx";
import { Icon } from "./ui/Icon.jsx";
import api from "./tools/api.js";
import { LANGUAGES, LANG_BY } from "../interface/languages.js";

const LanguageChooser = ({ className = "hide-mobile" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [shown, setShown] = useState(false);   // появление через CSS-переход (без framer в шелле)
    const ref = useRef(null);
    const [setCurrentLanguage, currentLanguage] = useSystemStore(
        (state) => [state.setCurrentLanguage, state.currentLanguage]
    );

    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    useEffect(() => {   // кадр после монтирования → запускаем transition из opacity:0/translateY(6px)
        if (!isOpen) { setShown(false); return; }
        const id = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(id);
    }, [isOpen]);

    return (
        <div style={{ position: "relative" }} ref={ref}>
            <button className={`select ${className}`} onClick={() => setIsOpen((p) => !p)} aria-label="Язык интерфейса">
                <Icon n="globe" sm />
                <span>{LANG_BY[currentLanguage]?.name || currentLanguage}</span>
                <Icon n="chevron-down" sm />
            </button>
            {isOpen && (
                    <div
                        className="card"
                        style={{
                            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
                            minWidth: 180, padding: 6, boxShadow: "var(--shadow-md)",
                            display: "flex", flexDirection: "column", gap: 2,
                            opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(6px)",
                            transition: "opacity .16s ease, transform .16s ease",
                        }}
                    >
                        {LANGUAGES.map(({ code, name }) => (
                            <button
                                key={code}
                                className="nav__link"
                                style={{
                                    justifyContent: "flex-start", width: "100%", border: "none",
                                    background: code === currentLanguage ? "var(--fjord-50)" : "transparent",
                                    color: code === currentLanguage ? "var(--fjord-600)" : "var(--ink-2)",
                                }}
                                onClick={() => { setCurrentLanguage(code); setIsOpen(false); if (api.accessToken) api.setGamePrefs({ lang: code }).catch(() => {}); }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
            )}
        </div>
    );
};

export default LanguageChooser;
