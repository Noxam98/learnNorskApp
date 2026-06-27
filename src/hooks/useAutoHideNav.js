import { useState, useRef, useEffect, useCallback } from "react";
import { useSystemStore } from "../store/systemStore.jsx";
import { useIsMobile } from "./useMediaQuery.js";

// Авто-скрытие панели навигации на смартфонах: спустя `delay` мс «неиспользования» панель уезжает
// за край экрана (даёт место контенту), остаётся только грип. Возвращает:
//   hidden — скрыта ли сейчас (всегда false на десктопе),
//   show() — снова показать панель и перезапустить таймер (клик по грипу),
//   ping() — продлить показ (сбросить таймер) — дёргаем при действии С ПАНЕЛЬЮ.
// flag — необязательный атрибут на <html> (для глобального CSS «ужать отступы»); при смене состояния
// шлём 'resize', чтобы JS-раскладки (напр. «Наборы») пересчитали высоту под освободившееся место.
export function useAutoHideNav({ delay = 4000, flag = null, active = true } = {}) {
    const setting = useSystemStore((s) => s.autoHideNav);   // тоггл из настроек (вкл/выкл фичу)
    const mobile = useIsMobile();
    const enabled = mobile && setting !== false && active;   // смартфон + фича вкл + контекст активен (напр. «Учёба»)

    const [hidden, setHidden] = useState(false);
    const timer = useRef(0);
    const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = 0; } };
    const arm = useCallback(() => {
        clear();
        if (enabled) timer.current = setTimeout(() => setHidden(true), delay);
    }, [enabled, delay]);
    const show = useCallback(() => { setHidden(false); arm(); }, [arm]);
    const ping = useCallback(() => { arm(); }, [arm]);

    useEffect(() => {
        if (!enabled) { setHidden(false); clear(); return undefined; }
        arm();
        return clear;
    }, [enabled, arm]);

    const off = hidden && enabled;
    useEffect(() => {
        const el = document.documentElement;
        if (flag) { if (off) el.setAttribute(flag, ""); else el.removeAttribute(flag); }
        // Шлём resize, чтобы JS-раскладки (напр. «Наборы») пересчитали высоту под освободившееся место.
        // Верхняя панель схлопывается АНИМИРОВАННО (~.28с margin), поэтому помимо мгновенного пересчёта
        // повторяем после завершения перехода — иначе высота меряется до реального освобождения места.
        const fire = () => { try { window.dispatchEvent(new Event("resize")); } catch { /* */ } };
        fire();
        const t1 = setTimeout(fire, 180);
        const t2 = setTimeout(fire, 340);
        return () => { clearTimeout(t1); clearTimeout(t2); if (flag) el.removeAttribute(flag); };
    }, [off, flag]);

    return { hidden: off, show, ping };
}
