import { useEffect, useRef } from "react";

// Пока модалка/карточка открыта — кладём запись в историю браузера, и кнопка/жест
// «Назад» закрывает её (а не уводит со страницы). Закрытие крестиком/фоном само
// убирает запись. URL не меняем (совместимо с hash-роутером).
let _seq = 0;
export function useHistoryClose(open, onClose) {
    const cb = useRef(onClose);
    cb.current = onClose;
    useEffect(() => {
        if (!open || typeof window === "undefined") return;
        const id = ++_seq;
        window.history.pushState({ __modal: id }, "");
        const onPop = () => cb.current?.();
        window.addEventListener("popstate", onPop);
        return () => {
            window.removeEventListener("popstate", onPop);
            // закрыли не «Назад» (крестик/фон) → снимаем нашу запись истории
            if (window.history.state && window.history.state.__modal === id) {
                window.history.back();
            }
        };
    }, [open]); // eslint-disable-line
}
