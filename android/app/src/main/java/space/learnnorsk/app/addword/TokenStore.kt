package space.learnnorsk.app.addword

import android.content.Context

/**
 * Пара токенов, общая с WebView. Хранилище — SharedPreferences-файл `CapacitorStorage`
 * (группа @capacitor/preferences по умолчанию), значения — сырые JWT без обёрток;
 * ключи задаёт `src/native/tokenStore.js` (A2.1).
 *
 * Правило, которое нельзя нарушать: `/refresh` РОТИРУЕТ refresh-токен, поэтому писать
 * всегда ОБА ключа. Запишешь только access — WebView на resume перечитает хранилище,
 * увидит мёртвый refresh и разлогинит пользователя.
 */
object TokenStore {
    private const val GROUP = "CapacitorStorage"
    private const val ACCESS = "access_token"
    private const val REFRESH = "refresh_token"

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(GROUP, Context.MODE_PRIVATE)

    fun access(ctx: Context): String? = prefs(ctx).getString(ACCESS, null)?.takeIf { it.isNotBlank() }

    fun refresh(ctx: Context): String? = prefs(ctx).getString(REFRESH, null)?.takeIf { it.isNotBlank() }

    /** Записать новую пару целиком (после `/refresh`). */
    fun save(ctx: Context, access: String, refresh: String) {
        prefs(ctx).edit().putString(ACCESS, access).putString(REFRESH, refresh).commit()
    }
}
