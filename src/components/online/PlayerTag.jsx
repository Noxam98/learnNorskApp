import { motion } from "framer-motion";

// Метка игрока с полным именем (пилюля). dim — серый (ещё не ответил/неактивен).
// Пул компонентов онлайн-игр: ряд «кто ответил», голоса на вариантах и т.п.
export function PlayerTag({ name, dim }) {
    return (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            style={{
                padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, lineHeight: 1.6,
                whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
                background: dim ? "var(--surface-3)" : "var(--ember-600)", color: dim ? "var(--ink-3)" : "#fff",
                border: dim ? "1px solid var(--border)" : "none",
                boxShadow: dim ? "none" : "0 1px 4px rgba(0,0,0,.2)",
            }}>
            {name}
        </motion.div>
    );
}

export default PlayerTag;
