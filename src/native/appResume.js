// Возврат в приложение (Android): @capacitor/app → appStateChange { isActive: true }.
// Зачем: нативная активити PROCESS_TEXT (A3) ходит на бэк теми же токенами и умеет дёргать
// /refresh, а /refresh РОТИРУЕТ refresh-токен. Пока WebView висел в фоне, пара в хранилище
// могла смениться — со старым refresh в памяти первый же 401 привёл бы к разлогину.
// Поэтому на возврате мы перечитываем хранилище (см. api.rehydrateTokens).
//
// В вебе — no-op, @capacitor/app в бандл не тянется (динамический импорт внутри нативной ветки).
import { isNative } from "./platform.js";

/**
 * Подписаться на возврат приложения на передний план.
 * @param {() => void} handler
 * @returns {Promise<() => void>} снятие слушателя (в вебе — no-op)
 */
export async function onAppResume(handler) {
    if (!isNative()) return () => {};
    try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) handler();
        });
        return () => { listener.remove(); };
    } catch {
        return () => {};
    }
}
