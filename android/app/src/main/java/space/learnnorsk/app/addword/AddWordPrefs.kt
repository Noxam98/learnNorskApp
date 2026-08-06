package space.learnnorsk.app.addword

import android.content.Context
import android.content.res.Resources
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Мелкое состояние самой активити: последний набор и кеш списка наборов.
 *
 * Отдельный файл, не `CapacitorStorage`: там живут токены, общие с WebView, и мусорить
 * в чужом пространстве ключей не надо.
 */
object AddWordPrefs {
    private const val FILE = "norsk_addword"
    private const val LAST_SET_ID = "last_set_id"
    private const val SETS_CACHE = "sets_cache"

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    /** Последний выбранный набор — благодаря ему добавление обычно в один тап. */
    fun lastSetId(ctx: Context): Int = prefs(ctx).getInt(LAST_SET_ID, 0)

    fun setLastSetId(ctx: Context, id: Int) {
        prefs(ctx).edit().putInt(LAST_SET_ID, id).apply()
    }

    /**
     * Кеш наборов: спиннер заполняется мгновенно, до ответа `GET /sets`. Шит не имеет права
     * ждать сеть — он открывается поверх чужого приложения.
     */
    fun cachedSets(ctx: Context): List<SetInfo> = try {
        val arr = JSONArray(prefs(ctx).getString(SETS_CACHE, "[]"))
        (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            SetInfo(o.optInt("id"), o.optString("name"), o.optInt("count"))
        }.filter { it.id > 0 }
    } catch (_: Exception) {
        emptyList()
    }

    fun cacheSets(ctx: Context, sets: List<SetInfo>) {
        val arr = JSONArray()
        sets.forEach { arr.put(JSONObject().put("id", it.id).put("name", it.name).put("count", it.count)) }
        prefs(ctx).edit().putString(SETS_CACHE, arr.toString()).apply()
    }

    /**
     * Язык переводов для показа в шите.
     *
     * Язык интерфейса веб-приложение держит в localStorage WebView (`system-storage`), а он
     * из Kotlin не читается. Поэтому берём язык устройства и сводим его к ключам поля
     * `translate` бэкенда; если перевода на него нет — падаем в en/ru.
     */
    fun translationLangs(): List<String> {
        val device = Resources.getSystem().configuration.locales
        val mapped = (0 until device.size()).mapNotNull { mapLocale(device[it]) }
        return (mapped + listOf("en", "ru")).distinct()
    }

    private fun mapLocale(locale: Locale): String? = when (locale.language.lowercase(Locale.ROOT)) {
        "ru" -> "ru"
        "uk" -> "ukr"
        "en" -> "en"
        "pl" -> "pl"
        "lt" -> "lt"
        "lv" -> "lv"
        "ar" -> "ar"
        "no", "nb", "nn" -> "no"
        else -> null
    }
}
