// Мобильная раскладка «Наборов» в одну высоту экрана: измеряет доступную высоту (standalone-PWA
// quirks — visualViewport + самокоррекция overflow, чтобы панель не схлопывалась), держит активную
// панель (set/search) и перетаскиваемый разделитель со снапом к 2 липким позициям. Вынесено из
// SetsTab.jsx — самая хрупкая DOM-логика страницы, теперь изолирована.
import { useLayoutEffect, useRef, useState } from "react";

// Высоты свёрнутых полосок и разделителя (для расчёта высот панелей + анимации).
const DIVIDER_H = 30, SEARCH_COLLAPSED = 58, SET_COLLAPSED = 58;
// Постоянный зазор контента до нижней панели/края экрана (= верхний sp-2): контент отступает от края
// ровно настолько же, насколько отступает от таб-бара, когда он показан.
const BOTTOM_GAP = 8;

// safe-area снизу (домашний индикатор) — меряем один раз пробником. Нужно, чтобы при скрытом таб-баре
// контент уезжал вниз в освобождённое место, но не залезал под индикатор, сохраняя тот же зазор.
let _sab = null;
function safeAreaBottom() {
    if (_sab != null) return _sab;
    try {
        const p = document.createElement("div");
        p.style.cssText = "position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
        document.body.appendChild(p);
        _sab = Math.round(p.getBoundingClientRect().height) || 0;
        p.remove();
    } catch { _sab = 0; }
    return _sab;
}

export function useMobileSetsLayout(isMobile, activeId, setsLength) {
    const [mob, setMob] = useState("set"); // какая панель активна — "set" | "search"
    const [mobH, setMobH] = useState(0);   // высота мобильной раскладки (под экран, без скролла страницы)
    const [dragH, setDragH] = useState(null); // высота панели поиска во время перетаскивания (null = не тянем)
    const mobRef = useRef(null);
    const dragRef = useRef(null);          // { startY, moved, lastH } — состояние текущего перетаскивания

    // Мобилка: высота раскладки = от её позиции в документе до низа экрана (минус нижний таб-бар) →
    // страница не скроллится, скроллится только активная панель. Считаем по факту (без магических
    // чисел). document-offset (rect.top+scrollY), чтобы не зависеть от текущего скролла.
    useLayoutEffect(() => {
        if (!isMobile) { setMobH(0); return undefined; }
        // visualViewport точнее innerHeight в установленном приложении (standalone): не считает
        // площадь под системными панелями, которых на момент первого кадра ещё может «не быть».
        const vh = () => (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        const estimate = () => {
            const el = mobRef.current; if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;     // позиция панели в документе
            const bar = document.querySelector(".tabbar");                   // нижний таб-бар (рендерится в App, position:fixed)
            const barVisible = bar && !bar.classList.contains("is-hidden") && getComputedStyle(bar).display !== "none";
            // Таб-бар показан → резервируем его высоту (контент кончается над ним). Скрыт (уехал за край)
            // → его место ОСВОБОЖДАЕТСЯ и достаётся контенту, резервируем только safe-area снизу. В обоих
            // случаях добавляем ОДИН и тот же зазор BOTTOM_GAP — отступ контента от края такой же, как был
            // от панели. Так скрытие реально расширяет раскладку, сохраняя единый отступ.
            const reserve = (barVisible ? bar.getBoundingClientRect().height : safeAreaBottom()) + BOTTOM_GAP;
            setMobH(Math.max(240, Math.floor(vh() - top - reserve)));
        };
        estimate();
        // Самокоррекция переполнения. КРИТИЧНО: вычитаем overflow ТОЛЬКО когда прошлая правка УЖЕ
        // применилась к DOM (scrollHeight изменился). Иначе один и тот же overflow вычитается каждый
        // кадр (setMobH асинхронный) и панель схлопывается в разы — в standalone, где вьюпорт «доезжает»
        // медленнее, это и давало обрезку до половины экрана.
        let tries = 0, raf = 0, lastSH = -1;
        const tick = () => {
            const sh = document.documentElement.scrollHeight;
            const over = Math.ceil(sh - vh());
            if (over > 0 && sh !== lastSH) { lastSH = sh; setMobH((h0) => Math.max(200, h0 - over)); }
            if (++tries < 8) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        // standalone-PWA: системные панели стабилизируются уже ПОСЛЕ первого кадра → пересчитать ещё раз
        const t1 = setTimeout(estimate, 120);
        const t2 = setTimeout(estimate, 400);
        window.addEventListener("resize", estimate);
        return () => {
            cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
            window.removeEventListener("resize", estimate);
        };
    }, [isMobile, activeId, setsLength]);

    // высоты панелей: активная тянется, свёрнутая = фикс-полоска (для анимации height).
    // dragH != null → идёт перетаскивание разделителя: высота поиска = dragH (живо, без анимации).
    const innerH = Math.max(0, mobH - DIVIDER_H);
    let searchH, setH;
    if (dragH != null) {
        searchH = dragH;
        setH = Math.max(0, innerH - dragH);
    } else {
        searchH = mob === "search" ? Math.max(120, innerH - SET_COLLAPSED) : SEARCH_COLLAPSED;
        setH = mob === "set" ? Math.max(120, innerH - SEARCH_COLLAPSED) : SET_COLLAPSED;
    }

    // Разделитель: тап = тоггл активной панели; перетаскивание = живой ресайз, но «прилипает» только
    // к 2 позициям (поиск-активен / набор-активен) — отпустили за серединой → туда и снапнулось.
    const dragDown = (e) => {
        dragRef.current = { startY: e.clientY, moved: false, lastH: null };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* нет pointer capture — ок */ }
    };
    const dragMove = (e) => {
        const d = dragRef.current; if (!d) return;
        if (!d.moved && Math.abs(e.clientY - d.startY) < 5) return;   // порог: отличаем тап от тяги
        d.moved = true;
        const cont = mobRef.current; if (!cont) return;
        const top = cont.getBoundingClientRect().top;
        const inner = Math.max(0, mobH - DIVIDER_H);
        let h = e.clientY - top - DIVIDER_H / 2;                       // высота верхней (поиск) панели под указателем
        h = Math.max(SEARCH_COLLAPSED, Math.min(inner - SET_COLLAPSED, h));   // обе панели не меньше свёрнутой полоски
        d.lastH = h; setDragH(h);
    };
    const dragUp = () => {
        const d = dragRef.current; dragRef.current = null;
        if (!d) return;
        if (!d.moved) { setMob((m) => (m === "set" ? "search" : "set")); return; }   // тап → тоггл
        const inner = Math.max(0, mobH - DIVIDER_H);
        setMob((d.lastH ?? 0) >= inner / 2 ? "search" : "set");        // ближайшая из 2 липких позиций
        setDragH(null);
    };

    return { mob, setMob, mobH, dragH, mobRef, searchH, setH, dragDown, dragMove, dragUp };
}
