import { motion } from "framer-motion";

// Стартовый обратный отсчёт онлайн-игры: пульсирующее кольцо + крупная цифра, которая
// болтается по сторонам при смене секунды. Без exit/AnimatePresence → цифра всегда видима
// (нет мерцания). Пул компонентов онлайн-игр.
//   sec   — текущая секунда (5,4,3,…);
//   label — подпись над цифрой («Старт через»).
export function Countdown({ sec, label }) {
    return (
        <div style={{ textAlign: "center" }}>
            {label && <div className="muted" style={{ marginBottom: "var(--sp-3)" }}>{label}</div>}
            <div style={{ position: "relative", display: "inline-grid", placeItems: "center" }}>
                <motion.span key={`ring${sec}`}
                    initial={{ scale: 0.5, opacity: 0.7 }} animate={{ scale: 2.3, opacity: 0 }}
                    transition={{ duration: 0.85, ease: "easeOut" }}
                    style={{ position: "absolute", width: 170, height: 170, borderRadius: "50%", border: "4px solid var(--ember-600)" }} />
                <motion.div key={sec}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate: [-14, 11, -7, 4, 0] }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, color: "var(--ember-600)" }}>
                    {sec}
                </motion.div>
            </div>
        </div>
    );
}

export default Countdown;
