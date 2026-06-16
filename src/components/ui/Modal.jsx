import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon.jsx";

// Лёгкий модал в стиле дизайн-системы.
export const Modal = ({ open, onClose, title, children, footer, maxWidth = 460 }) => (
    <AnimatePresence>
        {open && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 100, background: "rgba(16,28,26,.45)",
                    display: "grid", placeItems: "center", padding: "var(--sp-5)",
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
                        display: "flex", flexDirection: "column",
                        maxHeight: "calc(100dvh - 2 * var(--sp-5))", overflow: "hidden",
                    }}
                >
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--sp-5) var(--sp-5) 0" }}>
                        <span className="panel__title" style={{ fontSize: "var(--fs-18)", fontWeight: 700 }}>{title}</span>
                        <button className="iconbtn" onClick={onClose} aria-label="Закрыть"><Icon n="x" /></button>
                    </div>
                    <div style={{ padding: "var(--sp-5)", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>{children}</div>
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

export default Modal;
