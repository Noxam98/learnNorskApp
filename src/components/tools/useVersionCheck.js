/* global __BUILD_ID__ */
// Проверка новой версии фронта: сравнивает вшитый в сборку __BUILD_ID__ с тем, что лежит
// в /version.json на сервере (обновляется при каждом деплое). При расхождении → true.
import { useEffect, useState, useRef } from "react";

const POLL_MS = 90_000; // как часто опрашивать (мс)
const BAKED = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : null;

export function useVersionCheck() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const done = useRef(false);

    useEffect(() => {
        if (!BAKED) return; // в dev/без сборки — не мешаем
        let stopped = false;
        const check = async () => {
            if (stopped || done.current) return;
            try {
                const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
                if (!r.ok) return;
                const data = await r.json();
                if (data?.build && data.build !== BAKED) { done.current = true; setUpdateAvailable(true); }
            } catch { /* офлайн/недоступно — игнорируем */ }
        };
        const id = setInterval(check, POLL_MS);
        const onWake = () => { if (document.visibilityState !== "hidden") check(); };
        window.addEventListener("focus", onWake);
        document.addEventListener("visibilitychange", onWake);
        const first = setTimeout(check, 5000); // первый чек — спустя 5с после загрузки
        return () => {
            stopped = true; clearInterval(id); clearTimeout(first);
            window.removeEventListener("focus", onWake);
            document.removeEventListener("visibilitychange", onWake);
        };
    }, []);

    return updateAvailable;
}
