import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon.jsx";

// Лёгкий модал в стиле дизайн-системы.
export const Modal = ({ open, onClose, title, children, footer, headerExtra, cornerClose = false, maxWidth = 460 }) => {
    // Пока модалка открыта — блокируем прокрутку фона (свайп под модалкой).
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    return (
    <AnimatePresence>
        {open && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 100, background: "rgba(16,28,26,.45)",
                    display: "grid", placeItems: "center", padding: "var(--sp-5)",
                    overscrollBehavior: "contain",
                }}
            >
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: "100%", maxWidth, boxShadow: "var(--shadow-lg)",
                        display: "flex", flexDirection: "column", position: "relative",
                        maxHeight: "calc(100dvh - 2 * var(--sp-5))",
                        // cornerClose: крестик «выносится» за угол → не обрезаем
                        overflow: cornerClose ? "visible" : "hidden",
                        borderRadius: "var(--r-lg)",
                    }}
                >
                    {/* Крестик — абсолютно в правом верхнем углу. В режиме cornerClose вынесен за угол transform-ом. */}
                    <button className="iconbtn" onClick={onClose} aria-label="Закрыть"
                        style={cornerClose
                            ? { position: "absolute", top: "var(--sp-5)", right: "var(--sp-5)", transform: "translate(100%, -100%)", zIndex: 3, background: "var(--surface)", boxShadow: "var(--shadow-sm)" }
                            : { position: "absolute", top: "var(--sp-4)", right: "var(--sp-4)", zIndex: 2 }}><Icon n="x" /></button>
                    <div className="modalhead" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)", paddingBottom: 0, paddingLeft: "var(--sp-5)", paddingRight: cornerClose ? "var(--sp-5)" : "calc(var(--sp-5) + 40px)" }}>
                        <span className="panel__title" style={{ fontSize: "var(--fs-18)", fontWeight: 700, minWidth: 0 }}>{title}</span>
                        {headerExtra && <span style={{ flexShrink: 0 }}>{headerExtra}</span>}
                    </div>
                    <div style={{ padding: "var(--sp-5)", overflowY: "auto", overscrollBehavior: "contain", flex: "1 1 auto", minHeight: 0 }}>{children}</div>
                    {footer && (
                        <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: "var(--sp-3)", rowGap: "var(--sp-2)", padding: "0 var(--sp-5) var(--sp-5)" }}>
                            {footer}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
    );
};

export default Modal;
