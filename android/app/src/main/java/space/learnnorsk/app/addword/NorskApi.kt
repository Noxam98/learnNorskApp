package space.learnnorsk.app.addword

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Ошибка уровня HTTP: сервер ответил, но не 2xx. */
class ApiException(val status: Int, val detail: String) : IOException("HTTP $status: $detail")

/** Сети нет / сервер недоступен — повод положить слово в очередь, а не показывать ошибку. */
class OfflineException(cause: Throwable? = null) : IOException("offline", cause)

/** Набор пользователя: `GET /sets` → `[{id, name, studying, count}]`. */
data class SetInfo(val id: Int, val name: String, val count: Int)

/** Ответ `POST /pool/generate` → `{word, pool_id, generated, translate}`. */
data class GeneratedWord(val poolId: Int, val word: String, val generated: Boolean)

/**
 * Минимальный HTTP-клиент к бэкенду. Без OkHttp/Retrofit — тут пять запросов, и лишние
 * 800 КБ в APK ради них не нужны.
 *
 * ВСЕ методы блокирующие: вызывать только с фонового потока.
 */
class NorskApi(private val ctx: Context) {

    companion object {
        const val BASE = "https://api.learnnorsk.space"
        private const val TAG = "NorskApi"
        private const val CONNECT_MS = 8_000
        private const val READ_MS = 15_000
        /** Генерация идёт через LLM/банк — отвечает заметно дольше обычных ручек. */
        private const val READ_LLM_MS = 60_000
    }

    // ---- Публичные ручки -------------------------------------------------------------

    /** `GET /pool/search?q=…` — разворачивает словоформы через ordbank (`gikk` → `gå`). */
    fun search(q: String, limit: Int = 5): List<SearchItem> {
        val enc = URLEncoder.encode(q, "UTF-8")
        val json = request("GET", "/pool/search?q=$enc&limit=$limit", null) as JSONObject
        val arr = json.optJSONArray("results") ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let(::parseSearchItem) }
    }

    fun sets(): List<SetInfo> {
        val arr = request("GET", "/sets", null) as JSONArray
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            SetInfo(o.optInt("id"), o.optString("name"), o.optInt("count"))
        }.filter { it.id > 0 }
    }

    /**
     * Добавление по лемме. Бэкенд внутри делает `get_pool_id(word)`, и при промахе отвечает
     * 400 «No words» — поэтому слать сюда можно только `item.word` из `/pool/search`.
     */
    fun addWordByLemma(setId: Int, lemma: String) {
        request("POST", "/sets/$setId/words", JSONObject().put("norwegian", lemma))
    }

    /** Добавление по id — доступно только после `/pool/generate`, поиск id не отдаёт. */
    fun addWordById(setId: Int, poolId: Int) {
        request("POST", "/sets/$setId/words", JSONObject().put("pool_ids", JSONArray().put(poolId)))
    }

    /**
     * `POST /pool/generate` — под LLM-rate-limit, 429 штатно возможен.
     * Ретраить в цикле нельзя: это чужая квота Gemini.
     */
    fun generate(word: String): GeneratedWord {
        val json = request("POST", "/pool/generate", JSONObject().put("word", word), READ_LLM_MS) as JSONObject
        return GeneratedWord(
            poolId = json.optInt("pool_id"),
            word = json.optString("word", word),
            generated = json.optBoolean("generated"),
        )
    }

    // ---- Транспорт -------------------------------------------------------------------

    /**
     * Запрос с авторизацией. На 401 один раз дёргает `/refresh` и повторяет — не циклом:
     * протухший refresh даёт бесконечную карусель и мгновенно выжигает батарею.
     */
    private fun request(method: String, path: String, body: JSONObject?, readMs: Int = READ_MS): Any {
        val token = TokenStore.access(ctx) ?: throw ApiException(401, "no token")
        return try {
            raw(method, path, body, token, readMs)
        } catch (e: ApiException) {
            if (e.status != 401) throw e
            val fresh = refreshTokens() ?: throw e
            raw(method, path, body, fresh, readMs)
        }
    }

    /** Обновление пары. Пишет ОБА токена: `/refresh` ротирует refresh тоже. */
    private fun refreshTokens(): String? {
        val refresh = TokenStore.refresh(ctx) ?: return null
        return try {
            val json = raw("POST", "/refresh", JSONObject().put("refresh_token", refresh), null, READ_MS) as JSONObject
            val access = json.optString("access_token").takeIf { it.isNotBlank() } ?: return null
            val newRefresh = json.optString("refresh_token").takeIf { it.isNotBlank() } ?: return null
            TokenStore.save(ctx, access, newRefresh)
            access
        } catch (e: IOException) {
            Log.w(TAG, "refresh failed: ${e.message}")
            null
        }
    }

    private fun raw(method: String, path: String, body: JSONObject?, token: String?, readMs: Int): Any {
        val conn = URL(BASE + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = CONNECT_MS
            conn.readTimeout = readMs
            conn.setRequestProperty("Accept", "application/json")
            if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = try {
                conn.responseCode
            } catch (e: IOException) {
                throw OfflineException(e)   // DNS/коннект не поднялся — это не ответ сервера
            }
            val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw ApiException(code, detailOf(text))
            return parse(text)
        } catch (e: ApiException) {
            throw e
        } catch (e: OfflineException) {
            throw e
        } catch (e: IOException) {
            throw OfflineException(e)
        } finally {
            conn.disconnect()
        }
    }

    private fun parse(text: String): Any {
        val t = text.trim()
        return when {
            t.startsWith("[") -> JSONArray(t)
            t.startsWith("{") -> JSONObject(t)
            else -> JSONObject()
        }
    }

    private fun detailOf(text: String): String = try {
        JSONObject(text).optString("detail", text)
    } catch (_: Exception) {
        text.take(200)
    }

    private fun parseSearchItem(o: JSONObject): SearchItem {
        val translate = mutableMapOf<String, List<String>>()
        o.optJSONObject("translate")?.let { tr ->
            tr.keys().forEach { lang ->
                val v = tr.optJSONArray(lang) ?: return@forEach
                translate[lang] = (0 until v.length()).map { v.optString(it) }.filter { it.isNotBlank() }
            }
        }
        return SearchItem(
            word = o.optString("word"),
            partOfSpeech = o.optString("part_of_speech"),
            inPool = o.optBoolean("inPool"),
            viaForm = o.optString("viaForm").takeIf { it.isNotBlank() },
            translate = translate,
        )
    }
}
