// Персистенс пары токенов (access/refresh). Единственное место, которое знает, ГДЕ они лежат:
//   веб   → localStorage, синхронно, ровно как было до Capacitor;
//   натив → @capacitor/preferences, асинхронно. На Android это SharedPreferences-файл
//           `CapacitorStorage` (группа плагина по умолчанию), ключи кладутся как есть.
//
// Ключи специально простые и стабильные: их читает/пишет нативная активити PROCESS_TEXT (A3):
//   context.getSharedPreferences("CapacitorStorage", MODE_PRIVATE).getString("access_token", null)
// Значение — сырая строка JWT, без обёрток и без шифрования (шифровать на клиенте смысла нет:
// ключ всё равно в бандле; в APK файл и так приватный для приложения).
//
// Владелец токенов в памяти — ApiService; тут только чтение/запись хранилища.
import { isNative } from "./platform.js";

export const ACCESS_KEY = "access_token";
export const REFRESH_KEY = "refresh_token";
/** Имя SharedPreferences-файла на Android (группа @capacitor/preferences по умолчанию). */
export const NATIVE_GROUP = "CapacitorStorage";

/**
 * @typedef {{ access: string|null, refresh: string|null }} TokenPair
 */

const EMPTY = { access: null, refresh: null };

function webRead() {
    try {
        return { access: localStorage.getItem(ACCESS_KEY), refresh: localStorage.getItem(REFRESH_KEY) };
    } catch {
        return { ...EMPTY };   // приватный режим/заблокированное хранилище — считаем, что пусто
    }
}

function webWrite(access, refresh) {
    try {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* хранилище недоступно — токены останутся только в памяти сессии */ }
}

function webClear() {
    try {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    } catch { /* см. выше */ }
}

// Плагин тянем динамически: в веб-бандл @capacitor/preferences так не попадает.
//
// ВОЗВРАЩАЕМ ОБЁРТКУ {api}, А НЕ САМ Preferences. Прокси плагина Capacitor отвечает на ЛЮБОЕ
// обращение к свойству, включая `then` — то есть выглядит как thenable. Если отдать его из
// async-функции, движок при разрешении промиса дёрнет `Preferences.then(resolve, reject)`,
// получит "not implemented on android", и промис не разрешится НИКОГДА: await повисает,
// api.ready() не резолвится, приложение показывает белый экран. Проверено на устройстве.
async function prefs() {
    const { Preferences } = await import("@capacitor/preferences");
    return { api: Preferences };
}

export const tokenStore = {
    /**
     * Синхронный снимок хранилища — есть только в вебе. На нативе `null`: Preferences
     * асинхронный, синхронного ответа не существует, и вызывающий обязан ждать read().
     * @returns {TokenPair|null}
     */
    readSync() {
        return isNative() ? null : webRead();
    },

    /**
     * Прочитать пару токенов.
     * @returns {Promise<TokenPair>}
     */
    async read() {
        if (!isNative()) return webRead();
        try {
            const { api: P } = await prefs();
            const [a, r] = await Promise.all([P.get({ key: ACCESS_KEY }), P.get({ key: REFRESH_KEY })]);
            const pair = { access: a?.value ?? null, refresh: r?.value ?? null };
            if (pair.access || pair.refresh) return pair;
            // Разовая миграция: сборки до этого моста логинились в localStorage WebView.
            // Переносим пару в Preferences (её ждёт нативная активити) и чистим localStorage,
            // чтобы юзеру не пришлось перелогиниваться после обновления приложения.
            const legacy = webRead();
            if (legacy.access && legacy.refresh) {
                await this.write(legacy.access, legacy.refresh);
                webClear();
                return legacy;
            }
            webClear();
            return pair;
        } catch {
            return { ...EMPTY };   // плагин недоступен — не роняем старт приложения
        }
    },

    /**
     * Записать пару токенов (перезаписывает обе — /refresh ротирует refresh тоже).
     * @param {string} access
     * @param {string} refresh
     * @returns {Promise<void>}
     */
    async write(access, refresh) {
        if (!isNative()) { webWrite(access, refresh); return; }
        try {
            const { api: P } = await prefs();
            await Promise.all([
                P.set({ key: ACCESS_KEY, value: String(access) }),
                P.set({ key: REFRESH_KEY, value: String(refresh) }),
            ]);
        } catch { /* не смогли сохранить — сессия живёт в памяти до перезапуска */ }
    },

    /**
     * Стереть пару токенов (logout / битые значения из прошлых версий).
     * @returns {Promise<void>}
     */
    async clear() {
        if (!isNative()) { webClear(); return; }
        try {
            const { api: P } = await prefs();
            await Promise.all([P.remove({ key: ACCESS_KEY }), P.remove({ key: REFRESH_KEY })]);
        } catch { /* см. выше */ }
    },
};
