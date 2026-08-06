import { useEffect, useRef, useState } from "react";
import { useSystemStore } from "../../store/systemStore.jsx";
import { bcpOf } from "../../interface/languages.js";
import { googleNativeAvailable, signInWithGoogleNative } from "../../native/googleAuth.js";
import { T } from "./GoogleSignInButton.i18n.js";
import { BtnSpinner } from "./Spinner.jsx";

// Client ID веб-приложения (Google Cloud Console). Пусто → кнопку не показываем.
// Читаем при вызове, а не в модульной константе: так значение подменяемо в тестах.
const clientId = () => import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
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

/** Веб-кнопка: рисует сам Google Identity Services (как и раньше). */
function WebGoogleButton({ onCredential, text }) {
    const ref = useRef(null);
    // Локаль кнопки = язык интерфейса (иначе GSI рендерит на языке браузера/по умолчанию).
    const locale = useSystemStore((s) => bcpOf(s.currentLanguage));

    useEffect(() => {
        if (!clientId()) return;
        let cancelled = false;
        loadGis().then(() => {
            const g = window.google?.accounts?.id;
            if (cancelled || !g || !ref.current) return;
            g.initialize({
                client_id: clientId(),
                callback: (resp) => { if (resp?.credential) onCredential(resp.credential); },
            });
            ref.current.innerHTML = "";
            g.renderButton(ref.current, {
                theme: "outline", size: "large", shape: "pill",
                text, locale, width: ref.current.offsetWidth || 300,
            });
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [onCredential, text, locale]);

    return <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 40 }} />;
}

/** Логотип Google (инлайн — внешние ресурсы в APK недоступны). */
function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 13.7 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.2z" />
            <path fill="#FBBC05" d="M10.4 28.2c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.8-6.1C1 16.3 0 20 0 23.7s1 7.4 2.6 10.6l7.8-6.1z" />
            <path fill="#34A853" d="M24 47c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.3 0-11.7-4.2-13.6-9.9l-7.8 6.1C6.5 41.9 14.6 47 24 47z" />
        </svg>
    );
}

/**
 * Нативная кнопка: веб-флоу Google в WebView запрещён (`disallowed_useragent`), поэтому
 * тап вызывает системный плагин и отдаёт тот же id_token, что и GIS.
 */
function NativeGoogleButton({ onCredential, text }) {
    const lang = useSystemStore((s) => s.currentLanguage);
    const t = T[lang] || T.en;
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const onClick = async () => {
        if (busy) return;
        setBusy(true);
        setFailed(false);
        try {
            const idToken = await signInWithGoogleNative();
            onCredential(idToken);
        } catch (e) {
            // Отмена пользователем — не ошибка, молчим. Всё остальное (нет Android-клиента с
            // SHA-1 в Cloud Console, нет Play Services, сеть) показываем текстом, а не тишиной.
            const msg = String(/** @type {any} */(e)?.message || "");
            if (!/cancel|отмен|dismiss/i.test(msg)) setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="btn btn--outline btn--lg btn--block" onClick={onClick} disabled={busy}>
                {busy ? <BtnSpinner /> : <GoogleMark />} {t[text] || t.continue_with}
            </button>
            {failed && <span className="alert">{t.failed}</span>}
        </div>
    );
}

/**
 * Кнопка «Войти/привязать через Google». onCredential(credential) получает ID-token,
 * который надо отправить на бэкенд (/auth/google или /me/link_google).
 * text: "signin_with" | "signup_with" | "continue_with".
 * Ветвление веб/натив живёт здесь — api.js о платформе ничего не знает.
 */
export default function GoogleSignInButton({ onCredential, text = "continue_with" }) {
    if (!clientId()) return null;
    return googleNativeAvailable()
        ? <NativeGoogleButton onCredential={onCredential} text={text} />
        : <WebGoogleButton onCredential={onCredential} text={text} />;
}
