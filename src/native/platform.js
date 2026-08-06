// Единая точка ответа на вопрос «мы внутри нативного приложения (APK), а не в браузере?».
// Все нативные гварды по коду ходят через isNative() — чтобы не было россыпи разных
// проверок (Capacitor.isNativePlatform / getPlatform / userAgent) по компонентам.
import { Capacitor } from "@capacitor/core";

/**
 * true — Android/iOS-обёртка Capacitor; false — обычный веб (в т.ч. PWA).
 * Обёрнуто в try/catch: в тестах и в SSR-подобных окружениях плагин может быть не готов,
 * и тогда безопасный ответ — «это веб» (веб-поведение остаётся дефолтом).
 * @returns {boolean}
 */
export function isNative() {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}
