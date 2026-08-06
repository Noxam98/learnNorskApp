// Стартовый сплэш (Android). Убираем его сами, как только приложение отрисовалось, —
// иначе пользователь ждёт фиксированные launchShowDuration из capacitor.config.json.
// Тот таймер остаётся страховкой: если JS не поднялся, сплэш всё равно уйдёт.
import { Capacitor } from "@capacitor/core";

/** @returns {Promise<void>} */
export async function hideSplash() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide({ fadeOutDuration: 220 });
    } catch { /* плагина нет / уже скрыт — не мешаем запуску */ }
}
