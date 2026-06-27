import { useEffect, useState } from "react";

// Реактивный matchMedia: возвращает true, пока медиа-запрос совпадает (обновляется на изменение).
// SSR/без window — безопасно отдаёт false.
export function useMediaQuery(query) {
    const [match, setMatch] = useState(() => {
        try { return window.matchMedia(query).matches; } catch { return false; }
    });
    useEffect(() => {
        let mq; try { mq = window.matchMedia(query); } catch { return undefined; }
        const on = () => setMatch(mq.matches); on();
        mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
        return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
    }, [query]);
    return match;
}

// Смартфон-раскладка приложения (≤760px) — единый брейкпоинт, чтобы не дублировать matchMedia.
export const useIsMobile = () => useMediaQuery("(max-width: 760px)");
