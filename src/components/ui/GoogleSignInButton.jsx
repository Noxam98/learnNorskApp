import { useEffect, useRef } from "react";

// Client ID веб-приложения (Google Cloud Console). Пусто → кнопку не показываем.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GIS_SRC = "https://accounts.google.com/gsi/client";

// Подгружаем скрипт Google Identity Services один раз (без него — динамически, чтобы не
// зависеть от тегов в index.html и грузить только на экранах входа).
function loadGis() {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let s = document.querySelector(`script[src="${GIS_SRC}"]`);
        if (!s) {
            s = document.createElement("script");
            s.src = GIS_SRC; s.async = true; s.defer = true;
            document.head.appendChild(s);
        }
        s.addEventListener("load", () => resolve(), { once: true });
        s.addEventListener("error", reject, { once: true });
        // скрипт мог уже грузиться/загрузиться — подстрахуемся опросом
        const t = setInterval(() => {
            if (window.google?.accounts?.id) { clearInterval(t); resolve(); }
        }, 150);
        setTimeout(() => clearInterval(t), 8000);
    });
}

/**
 * Кнопка «Войти/привязать через Google». onCredential(credential) получает ID-token,
 * который надо отправить на бэкенд (/auth/google или /me/link_google).
 * text: "signin_with" | "signup_with" | "continue_with".
 */
export default function GoogleSignInButton({ onCredential, text = "continue_with" }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;
        loadGis().then(() => {
            const g = window.google?.accounts?.id;
            if (cancelled || !g || !ref.current) return;
            g.initialize({
                client_id: CLIENT_ID,
                callback: (resp) => { if (resp?.credential) onCredential(resp.credential); },
            });
            ref.current.innerHTML = "";
            g.renderButton(ref.current, {
                theme: "outline", size: "large", shape: "pill",
                text, width: ref.current.offsetWidth || 300,
            });
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [onCredential, text]);

    if (!CLIENT_ID) return null;
    return <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 40 }} />;
}
