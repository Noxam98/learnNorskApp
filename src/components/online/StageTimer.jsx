import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Таймер этапа онлайн-игры (напр. одного вопроса): секционная полоса + бегущая вслед за
// фронтом цифра. Сам ведёт отсчёт (requestAnimationFrame). Пул компонентов онлайн-игр.
//   seconds — длительность этапа;
//   runKey  — меняется при новом этапе → таймер перезапускается;
//   paused  — заморозить (напр. на показе результата).
export function StageTimer({ seconds = 15, runKey, paused = false, maxWidth = 600 }) {
    const [left, setLeft] = useState(seconds);

    useEffect(() => {
        if (paused) return;
        const total = seconds;
        const start = performance.now();
        setLeft(total);
        let raf;
        const tick = () => {
            const l = Math.max(0, total - (performance.now() - start) / 1000);
            setLeft(l);
            if (l > 0) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [runKey, seconds, paused]);

    const shown = paused ? 0 : left;
    const pct = seconds ? (shown / seconds) * 100 : 0;
    return (
        <div style={{ position: "relative", width: "100%", maxWidth, margin: "0 auto var(--sp-6)" }}>
            <div style={{ display: "flex", gap: 3, height: 8 }}>
                {Array.from({ length: seconds }).map((_, i) => (
                    <span key={i} style={{
                        flex: 1, borderRadius: 2,
                        background: i < shown ? "var(--ember-600)" : "var(--border)",
                        transition: "background .25s linear",
                    }} />
                ))}
            </div>
            <motion.div animate={{ left: `${pct}%` }} transition={{ ease: "linear", duration: 0.12 }}
                style={{ position: "absolute", top: 11, transform: "translateX(-50%)", fontWeight: 800, fontSize: "var(--fs-14)", color: "var(--ember-600)" }}>
                {Math.ceil(shown)}
            </motion.div>
        </div>
    );
}

export default StageTimer;
