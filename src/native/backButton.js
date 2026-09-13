// Аппаратная кнопка «назад» (Android). Только натив: в вебе модуль ничего не делает и
// @capacitor/app в бандл не тянется (динамический импорт внутри нативной ветки).
//
// Правило: на корневом экране «назад» закрывает приложение (как ждёт Android),
// на внутреннем — обычный history.back(). Если истории нет (приложение открыли сразу
// на внутреннем маршруте) — уводим на домашний экран, чтобы не выбросить из приложения.
import { Capacitor } from "@capacitor/core";

/** Маршруты, с которых «назад» = выход из приложения. */
export const ROOT_ROUTES = ["/", "/learning", "/authorization"];

/**
 * Текущий путь из hash-роутера (`#/learning?x=1` → `/learning`).
 * @param {string} hash
 * @returns {string}
 */
export function pathFromHash(hash) {
    const raw = String(hash || "").replace(/^#/, "");
    const path = raw.split("?")[0].split("#")[0];
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Решение по нажатию «назад»: выйти / вернуться по истории / уйти на домашний экран.
 * Выделено отдельной чистой функцией — её и покрываем тестами.
 *
 * hasOverlay — сверху открыт оверлей, положивший свою запись в историю (useHistoryClose:
 * модалки, рейтинг, карточка слова, добор слов в набор). Тогда «назад» ЗАКРЫВАЕТ его, а не
 * выходит из приложения: иначе на корневом маршруте (/learning и его вкладки) любая открытая
 * поверх штука схлопывалась вместе со всем приложением.
 * @param {string} path текущий путь роутера
 * @param {boolean} canGoBack есть ли история в WebView (даёт сам плагин)
 * @param {boolean} [hasOverlay] открыт оверлей с записью в истории
 * @returns {"exit"|"back"|"home"}
 */
export function decideBack(path, canGoBack, hasOverlay = false) {
    if (hasOverlay) return "back";
    if (ROOT_ROUTES.includes(path)) return "exit";
    return canGoBack ? "back" : "home";
}

/** Открыт ли оверлей, положивший запись в историю (см. hooks/useHistoryClose). */
export function overlayOpen() {
    try { return !!(window.history.state && window.history.state.__modal); }
    catch { return false; }
}

/**
 * Регистрирует обработчик аппаратной «назад». Возвращает промис с функцией снятия
 * слушателя (в вебе — no-op).
 * @returns {Promise<() => void>}
 */
export async function registerBackButton() {
    if (!Capacitor.isNativePlatform()) return () => {};
    try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
            switch (decideBack(pathFromHash(window.location.hash), canGoBack, overlayOpen())) {
                case "exit":
                    App.exitApp();
                    break;
                case "back":
                    window.history.back();
                    break;
                default:
                    window.location.hash = "#/learning";
            }
        });
        return () => { handle.remove(); };
    } catch {
        return () => {};
    }
}
