// Service worker: нужен только вебу (веб-пуши-напоминания). Внутри APK его быть не должно:
// ассеты там локальные (Capacitor отдаёт их с https://localhost), а SW переживает обновление
// приложения из Play — то есть способен закрепить за собой старый бандл. Пуши на нативе
// уезжают на FCM (задача A6), так что польза от SW внутри APK нулевая.
import { isNative } from "./platform.js";

/** Есть ли вообще Service Worker API в окружении. */
const swAvailable = () =>
    typeof navigator !== "undefined" && "serviceWorker" in navigator;

/**
 * Разовая уборка: снимает SW, который успел зарегистрироваться в ранних debug-сборках APK
 * (до этого гварда). Без неё такой SW остаётся жить на устройстве после обновления —
 * повторной регистрации не будет, а старая никуда не денется сама.
 * @returns {Promise<number>} сколько регистраций снято
 */
export async function unregisterServiceWorkers() {
    if (!swAvailable()) return 0;
    try {
        const regs = await navigator.serviceWorker.getRegistrations();
        let removed = 0;
        for (const reg of regs) {
            try {
                if (await reg.unregister()) removed += 1;
            } catch { /* уже снят — не мешаем запуску */ }
        }
        return removed;
    } catch {
        return 0;
    }
}

/**
 * Веб: регистрируем /sw.js после загрузки страницы (как и раньше, ошибки глушим).
 * Натив: не регистрируем и подчищаем ранее зарегистрированный.
 * @returns {void}
 */
export function setupServiceWorker() {
    if (!swAvailable()) return;
    if (isNative()) {
        unregisterServiceWorkers().catch(() => {});
        return;
    }
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, { once: true });
}
