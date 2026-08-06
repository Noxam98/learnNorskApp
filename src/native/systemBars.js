// Иконки системных панелей (A10). Красить сами панели на Android 15+ уже нельзя — можно только
// сказать, светлые или тёмные на них рисовать значки. А фон под ними у нас разный:
//
//   • статус-бар лежит на фирменной тёмной полосе (её красит нативная сторона, см.
//     SystemInsets.java + colors_chrome.xml) → значки ВСЕГДА светлые;
//   • жестовая полоса/навбар остаётся прозрачной, под ней рисует само приложение (таб-бар,
//     грипы) → значки зависят от ТЕМЫ ПРИЛОЖЕНИЯ, а не от системной: тема хранится у нас
//     (systemStore/сервер) и с системной может не совпадать.
//
// Поэтому дефолт Capacitor (стиль обеих панелей по uiMode системы) не годится: при светлой теме
// приложения и тёмной системной жестовая «пилюля» становится белой на белом таб-баре.
import { isNative } from "./platform.js";

/**
 * Согласует значки системных панелей с темой приложения. В вебе — no-op.
 * @param {"light"|"dark"|string} theme тема приложения
 * @returns {Promise<void>}
 */
export async function applySystemBarsTheme(theme) {
    if (!isNative()) return;
    try {
        const { SystemBars, SystemBarType, SystemBarsStyle } = await import("@capacitor/core");
        // DARK = «фон тёмный, значки светлые», LIGHT = наоборот.
        await SystemBars.setStyle({ bar: SystemBarType.StatusBar, style: SystemBarsStyle.Dark });
        await SystemBars.setStyle({
            bar: SystemBarType.NavigationBar,
            style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        });
    } catch { /* плагина нет / окно ещё не готово — вид панелей не повод падать */ }
}
