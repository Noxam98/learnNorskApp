// Вход через Google на нативе.
//
// Почему не веб-кнопка: Google Identity Services блокирует OAuth-флоу внутри WebView
// (`disallowed_useragent`), а origin приложения — `https://localhost` — в веб-клиенте не
// авторизован, поэтому GIS в APK просто молча ничего не рисует. Нужен системный флоу.
//
// Плагин: @capgo/capacitor-social-login (Capacitor 8, Android Credential Manager).
// serverClientId = ВЕБ-клиент (VITE_GOOGLE_CLIENT_ID) — тогда `aud` полученного id_token равен
// GOOGLE_CLIENT_ID бэкенда, и `_verify_google` в auth.py править не нужно.
//
// В вебе модуль ничего не делает, плагин тянется динамическим импортом и в веб-бандл не попадает.
import { isNative } from "./platform.js";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/** Идти ли нативным путём: только в APK и только если веб-клиент сконфигурен. */
export function googleNativeAvailable() {
    return isNative() && !!CLIENT_ID;
}

/** @type {Promise<any>|null} initialize() один раз на процесс */
let _init = null;

async function socialLogin() {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    if (!_init) {
        _init = Promise.resolve(SocialLogin.initialize({ google: { webClientId: CLIENT_ID } }))
            .catch((e) => { _init = null; throw e; });   // дать следующему тапу шанс переинициализировать
    }
    await _init;
    return SocialLogin;
}

/**
 * Системный вход через Google. Возвращает id_token для POST /auth/google.
 * Бросает при отмене пользователем и при неготовой конфигурации (нет Android-клиента с SHA-1
 * в Google Cloud Console — задача H2): вызывающий показывает это сообщение, а не белый экран.
 * @returns {Promise<string>} id_token (JWT)
 */
export async function signInWithGoogleNative() {
    if (!CLIENT_ID) throw new Error("Google client id is not configured");
    const SocialLogin = await socialLogin();
    // БЕЗ options.scopes. Запрос скоупов переводит плагин в режим авторизации с возвратом через
    // активити и падает с «You CANNOT use scopes without modifying the main activity» (поймано на
    // устройстве). Нам скоупы и не нужны: email/profile и так лежат в ID-токене, а всё, что нужно
    // бэкенду, — сам id_token с нашим aud.
    const res = await SocialLogin.login({ provider: "google", options: {} });
    const idToken = /** @type {any} */ (res)?.result?.idToken;
    if (!idToken) throw new Error("Google sign-in returned no id_token");
    return idToken;
}
