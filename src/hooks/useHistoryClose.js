import { useEffect, useRef } from "react";

// Пока модалка/карточка открыта — кладём запись в историю браузера, и кнопка/жест
// «Назад» закрывает её (а не уводит со страницы). Закрытие крестиком/фоном само
// убирает запись. URL не меняем (совместимо с hash-роутером).
//
// Вложенные окна (профиль поверх рейтинга, поверх панели уведомлений): popstate слышат ВСЕ
// открытые, но закрыться должно только верхнее. Записи нумеруются по возрастанию, поэтому
// если после «Назад» текущей стала наша запись или более поздняя — сняли не нас, остаёмся.
//
// Окно, смонтированное сразу открытым (`if (!open) return null` + <Modal open>), StrictMode в dev
// прогоняет mount → cleanup → mount. Немедленный history.back() из cleanup затирал запись
// повторного mount (асинхронный back срабатывал уже после её pushState), а его popstate
// закрывал новое окно. Поэтому:
//   • снимаем запись на следующем тике и только если она всё ещё текущая — при перемонтаже
//     текущей к тому моменту уже стала запись нового экземпляра, откатывать нечего;
//   • свой откат — не «Назад» пользователя: его popstate игнорируем. Счётчик расходует один
//     постоянный слушатель на КАЖДОМ popstate — даже если слушающих окон не осталось.
let _seq = 0;
let _selfBacks = 0;     // сколько наших собственных history.back() ещё не дошло до popstate
let _selfPop = false;   // текущий popstate — наш собственный откат
let _installed = false;
function installSelfBackFilter() {
    if (_installed) return;
    _installed = true;
    // capture-слушатель на window срабатывает раньше обычных — флаг готов до onPop окон
    window.addEventListener("popstate", () => {
        _selfPop = _selfBacks > 0;
        if (_selfPop) _selfBacks--;
    }, true);
}

export function useHistoryClose(open, onClose) {
    const cb = useRef(onClose);
    cb.current = onClose;
    useEffect(() => {
        if (!open || typeof window === "undefined") return;
        installSelfBackFilter();
        const id = ++_seq;
        window.history.pushState({ __modal: id }, "");
        const onPop = (/** @type {PopStateEvent} */ e) => {
            if (_selfPop) return;
            const top = e?.state?.__modal;
            if (typeof top === "number" && top >= id) return;
            cb.current?.();
        };
        window.addEventListener("popstate", onPop);
        return () => {
            window.removeEventListener("popstate", onPop);
            // закрыли не «Назад» (крестик/фон) → снимаем нашу запись истории (см. шапку: на тике)
            setTimeout(() => {
                if (window.history.state && window.history.state.__modal === id) {
                    _selfBacks++;
                    window.history.back();
                }
            }, 0);
        };
    }, [open]);
}
