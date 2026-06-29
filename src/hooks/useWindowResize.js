import { useEffect, useRef } from "react";

// Один общий window-resize-листенер на всё приложение вместо отдельного в каждом компоненте
// (client-event-listeners). Подписчики вызываются через ref — колбэк всегда актуальный, без
// переподписки на каждый рендер. Слушатель навешивается лениво (на первого подписчика) и
// снимается, когда подписчиков не осталось.
const subs = new Set();
let attached = false;
const fire = () => { for (const f of subs) { try { f(); } catch { /* подписчик не должен ронять остальных */ } } };

/** @param {() => void} handler — вызывается на каждый resize (и не на маунте — initial делайте сами) */
export function useWindowResize(handler) {
    const ref = useRef(handler);
    ref.current = handler;
    useEffect(() => {
        const sub = () => ref.current && ref.current();
        subs.add(sub);
        if (!attached) { window.addEventListener("resize", fire, { passive: true }); attached = true; }
        return () => {
            subs.delete(sub);
            if (attached && subs.size === 0) { window.removeEventListener("resize", fire); attached = false; }
        };
    }, []);
}
