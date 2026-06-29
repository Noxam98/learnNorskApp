import { useEffect, useRef, useState } from "react";
import { useWindowResize } from "../../hooks/useWindowResize.js";

// Грип возврата скрытой панели навигации. ТАП = показать панель; ПЕРЕТАСКИВАНИЕ = двигать грип
// по горизонтали в пределах экрана (за край не уходит), позиция запоминается в localStorage.
// 12 точек как в разделителе «Наборов» (вместо стрелки).
export function NavGrip({ side, onShow }) {   // side: "top" | "bottom"
    const KEY = `navgrip-x-${side}`;
    const ref = useRef(null);
    const drag = useRef(null);
    const [x, setX] = useState(() => {
        const v = parseFloat(localStorage.getItem(KEY));
        return Number.isFinite(v) ? v : null;   // null → дефолт по центру (через CSS)
    });

    const clamp = (px) => {
        const w = ref.current?.offsetWidth || 64;
        return Math.max(0, Math.min(window.innerWidth - w, px));   // не за край экрана
    };

    const down = (e) => {
        const left = ref.current?.getBoundingClientRect().left ?? 0;
        drag.current = { startX: e.clientX, moved: false, baseLeft: left };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* нет capture — ок */ }
    };
    const move = (e) => {
        const d = drag.current; if (!d) return;
        if (!d.moved && Math.abs(e.clientX - d.startX) < 5) return;   // порог: отличаем тап от тяги
        d.moved = true;
        setX(clamp(d.baseLeft + (e.clientX - d.startX)));
    };
    const up = () => {
        const d = drag.current; drag.current = null;
        if (!d) return;
        if (!d.moved) { onShow?.(); return; }                         // тап (без сдвига) → показать панель
        const left = ref.current?.getBoundingClientRect().left;
        if (left != null) localStorage.setItem(KEY, String(Math.round(left)));
    };

    // вернуть грип в пределы экрана: при монтировании (вдруг сохранённая позиция шире нового экрана)
    // и при ресайзе/повороте (через общий resize-листенер)
    const reclamp = () => setX((px) => (px == null ? px : clamp(px)));
    useEffect(() => { reclamp(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useWindowResize(reclamp);

    const style = x != null ? { left: x, right: "auto", transform: "none" } : undefined;
    return (
        <button ref={ref} className={`navgrip navgrip--${side}`} style={style} aria-label="nav"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <span className="navgrip__dots" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => <i key={i} />)}
            </span>
        </button>
    );
}
