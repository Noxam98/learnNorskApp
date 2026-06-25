import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { useSystemStore } from "../store/systemStore.jsx";
import { Icon } from "./ui/Icon.jsx";
import api from "./tools/api.js";

const languages = {
    ukr: "Українська",
    ru: "Русский",
    pl: "Polski",
    lt: "Lietuvių",
    en: "English",
};

const LanguageChooser = ({ className = "hide-mobile" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    const [setCurrentLanguage, currentLanguage] = useSystemStore(
        (state) => [state.setCurrentLanguage, state.currentLanguage]
    );

    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    return (
        <div style={{ position: "relative" }} ref={ref}>
            <button className={`select ${className}`} onClick={() => setIsOpen((p) => !p)} aria-label="Язык интерфейса">
                <Icon n="globe" sm />
                <span>{languages[currentLanguage] || currentLanguage}</span>
                <Icon n="chevron-down" sm />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="card"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16 }}
                        style={{
                            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
                            minWidth: 180, padding: 6, boxShadow: "var(--shadow-md)",
                            display: "flex", flexDirection: "column", gap: 2,
                        }}
                    >
                        {Object.entries(languages).map(([code, name]) => (
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageChooser;
