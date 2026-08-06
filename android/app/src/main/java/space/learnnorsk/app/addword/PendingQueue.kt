package space.learnnorsk.app.addword

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Одно отложенное добавление: то, что юзер подтвердил, но сеть не дала отправить.
 *
 * `lemma` может быть null: если поиск не успел/не смог отработать (авиарежим), мы храним
 * сам выделенный текст и разрешаем его в лемму уже при синхронизации.
 */
data class PendingWord(
    val text: String,
    val lemma: String?,
    val setId: Int,
    val setName: String,
    val ts: Long = System.currentTimeMillis(),
    val attempts: Int = 0,
)

/**
 * Очередь отложенных слов в `filesDir/pending_words.json`.
 *
 * Почему файл, а не Room: одна плоская таблица на десяток записей, зато ноль зависимостей,
 * ноль миграций и ноль работы в фоне при старте активити. Запись через atomic-replace, так что
 * очередь переживает убийство процесса даже посреди сохранения.
 */
object PendingQueue {
    private const val FILE = "pending_words.json"
    private const val MAX_ITEMS = 200
    /** Сколько раз пытаемся отправить, прежде чем признать запись мёртвой. */
    const val MAX_ATTEMPTS = 5
    private const val TAG = "NorskQueue"

    private val lock = Any()

    fun read(ctx: Context): List<PendingWord> = synchronized(lock) { readUnlocked(ctx) }

    fun size(ctx: Context): Int = read(ctx).size

    /** Поставить слово в очередь. Дубли (то же слово в тот же набор) не копим. */
    fun add(ctx: Context, item: PendingWord) = synchronized(lock) {
        val cur = readUnlocked(ctx).toMutableList()
        val dup = cur.any { it.setId == item.setId && (it.lemma ?: it.text) == (item.lemma ?: item.text) }
        if (!dup) {
            cur.add(item)
            // Переполнение возможно только при очень долгом офлайне — режем самое старое.
            while (cur.size > MAX_ITEMS) cur.removeAt(0)
            writeUnlocked(ctx, cur)
        }
    }

    fun replaceAll(ctx: Context, items: List<PendingWord>) = synchronized(lock) {
        writeUnlocked(ctx, items)
    }

    fun clear(ctx: Context) = replaceAll(ctx, emptyList())

    // ---- Хранилище ------------------------------------------------------------------

    private fun file(ctx: Context) = File(ctx.filesDir, FILE)

    private fun readUnlocked(ctx: Context): List<PendingWord> {
        val f = file(ctx)
        if (!f.exists()) return emptyList()
        return try {
            val arr = JSONArray(f.readText(Charsets.UTF_8))
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                val text = o.optString("text").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                PendingWord(
                    text = text,
                    lemma = o.optString("lemma").takeIf { it.isNotBlank() },
                    setId = o.optInt("setId"),
                    setName = o.optString("setName"),
                    ts = o.optLong("ts"),
                    attempts = o.optInt("attempts"),
                )
            }.filter { it.setId > 0 }
        } catch (e: Exception) {
            Log.w(TAG, "queue unreadable, dropping: ${e.message}")
            emptyList()   // битый файл не должен блокировать фичу навсегда
        }
    }

    private fun writeUnlocked(ctx: Context, items: List<PendingWord>) {
        val arr = JSONArray()
        items.forEach {
            arr.put(
                JSONObject()
                    .put("text", it.text)
                    .put("lemma", it.lemma ?: JSONObject.NULL)
                    .put("setId", it.setId)
                    .put("setName", it.setName)
                    .put("ts", it.ts)
                    .put("attempts", it.attempts)
            )
        }
        try {
            val tmp = File(ctx.filesDir, "$FILE.tmp")
            tmp.writeText(arr.toString(), Charsets.UTF_8)
            if (!tmp.renameTo(file(ctx))) {          // rename в пределах filesDir атомарен
                file(ctx).writeText(arr.toString(), Charsets.UTF_8)
                tmp.delete()
            }
        } catch (e: Exception) {
            Log.w(TAG, "queue write failed: ${e.message}")
        }
    }
}
