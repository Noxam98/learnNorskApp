package space.learnnorsk.app.share

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Приём «Поделиться картинкой» (A4): `ACTION_SEND` / `ACTION_SEND_MULTIPLE` с mime `image/…`
 * (звёздочку в комментарии не пишем — блочные комментарии в Kotlin вложенные)
 * прилетает в [space.learnnorsk.app.MainActivity], оттуда — сюда.
 *
 * Задача этого объекта одна: превратить системный `content://`-URI в data-URL, который веб-часть
 * скормит существующему OCR-импорту (`PhotoImportModal` → `/sets/{id}/ocr`). Ужимаем именно тут,
 * а не в JS:
 *
 *  - `/sets/{id}/ocr` режет тело на 8 000 000 символов base64 (routers/sets.py), а скриншот
 *    экрана 1080×2340 PNG в base64 — это единицы мегабайт, то есть впритык;
 *  - тащить исходный блоб через мост Capacitor в JS, чтобы там его пережать канвасом, — лишняя
 *    копия мегабайтов в памяти WebView ради того же результата.
 *
 * Декодирование — на своём однопоточном пуле: `onCreate`/`onNewIntent` обязаны вернуться мгновенно,
 * иначе шаринг из чужого приложения выглядит как зависание.
 *
 * Очередь переживает «приложение было закрыто в момент шаринга»: картинки лежат тут, пока JS их
 * не заберёт через [SharedImagesPlugin] (`consume`). Событие плагина шлётся с retain-флагом —
 * его получит и тот слушатель, который подпишется уже после готовности картинок.
 */
object SharedImages {

    private const val TAG = "NorskShare"

    /** Метка «этот интент уже разобран» (переживает копии интента и восстановление процесса). */
    private const val EXTRA_HANDLED = "space.learnnorsk.app.SHARE_HANDLED"

    /** Столько же страниц, сколько принимает модалка импорта (MAX_PAGES в PhotoImportModal). */
    const val MAX_IMAGES = 5

    /** Длинная сторона после ужатия. Для OCR важнее читаемость мелкого текста, чем вес файла. */
    private const val MAX_SIDE = 2000
    private const val QUALITY = 85
    private const val MIN_QUALITY = 45

    /** Запас к каппу бэка (8 000 000 символов base64): в него мы не должны упираться никогда. */
    private const val MAX_DATA_URL = 5_000_000

    private val io = Executors.newSingleThreadExecutor()
    private val queue = ArrayList<String>()

    /**
     * Разобрать интент шаринга. Возвращает true, если в нём были картинки и работа ушла в фон.
     * Сам метод не блокирует поток — результат появится в очереди позже.
     *
     * Один интент разбираем ровно один раз: помечаем его своим extra. Иначе картинка задваивалась
     * (проверено на телефоне: холодный старт с ACTION_SEND зовёт и onCreate, и onNewIntent),
     * а после восстановления процесса тот же интент прилетел бы снова.
     */
    @JvmStatic
    fun handle(context: Context, intent: Intent?): Boolean {
        if (intent == null || intent.getBooleanExtra(EXTRA_HANDLED, false)) return false
        val uris = extractUris(intent)
        if (uris.isEmpty()) return false
        intent.putExtra(EXTRA_HANDLED, true)
        Log.i(TAG, "интент ${intent.action}: картинок ${uris.size}")
        val app = context.applicationContext
        io.execute {
            val ready = ArrayList<String>()
            for (uri in uris) {
                val dataUrl = try {
                    readAsDataUrl(app, uri)
                } catch (t: Throwable) {           // в т.ч. OutOfMemoryError на гигантских картинках
                    Log.w(TAG, "не смог прочитать $uri", t)
                    null
                }
                if (dataUrl != null) ready.add(dataUrl)
            }
            if (ready.isEmpty()) return@execute
            synchronized(queue) {
                queue.addAll(ready)
                while (queue.size > MAX_IMAGES) queue.removeAt(0)
            }
            Log.i(TAG, "готово ${ready.size}, в очереди ${pending()}")
            SharedImagesPlugin.notifyPending()
        }
        return true
    }

    /** Забрать всё накопленное (и очистить очередь) — вызывает плагин по запросу JS. */
    @JvmStatic
    fun drain(): List<String> = synchronized(queue) {
        val out = ArrayList<String>(queue)
        queue.clear()
        out
    }

    /** Есть ли что отдавать (для тестов и логов). */
    @JvmStatic
    fun pending(): Int = synchronized(queue) { queue.size }

    // ---- разбор интента ----

    @Suppress("DEPRECATION")   // типизированный getParcelableExtra есть только с API 33
    private fun extractUris(intent: Intent?): List<Uri> {
        if (intent == null) return emptyList()
        val type = intent.type
        if (type != null && !type.startsWith("image/")) return emptyList()
        val out = ArrayList<Uri>()
        when (intent.action) {
            Intent.ACTION_SEND ->
                (intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri)?.let(out::add)
            Intent.ACTION_SEND_MULTIPLE ->
                intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                    ?.filterNotNull()?.let(out::addAll)
            else -> return emptyList()
        }
        // Запасной путь: часть приложений кладёт URI только в ClipData (EXTRA_STREAM пуст).
        if (out.isEmpty()) {
            val clip = intent.clipData
            if (clip != null) {
                for (i in 0 until clip.itemCount) clip.getItemAt(i)?.uri?.let(out::add)
            }
        }
        return out.take(MAX_IMAGES)
    }

    // ---- чтение и ужатие ----

    private fun readAsDataUrl(context: Context, uri: Uri): String? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        // ВНИМАНИЕ: `?.use { decodeStream(...) } ?: return` тут не годится — при inJustDecodeBounds
        // decodeStream всегда возвращает null, и elvis съел бы удачное чтение (проверено на телефоне).
        val probe = context.contentResolver.openInputStream(uri) ?: return null
        probe.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        // Два прохода: сначала грубо (степень двойки, чтобы не поднимать в память исходник
        // целиком), потом точно до MAX_SIDE.
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sampleSize(max(bounds.outWidth, bounds.outHeight))
        }
        val decoded = context.contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null
        val bmp = scaleToMaxSide(decoded, MAX_SIDE)

        try {
            var quality = QUALITY
            while (true) {
                val out = ByteArrayOutputStream()
                bmp.compress(Bitmap.CompressFormat.JPEG, quality, out)
                val b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
                if (b64.length <= MAX_DATA_URL || quality <= MIN_QUALITY) {
                    return "data:image/jpeg;base64,$b64"
                }
                quality -= 15
            }
        } finally {
            bmp.recycle()
        }
    }

    private fun sampleSize(longSide: Int): Int {
        var s = 1
        while (longSide / (s * 2) >= MAX_SIDE) s *= 2
        return s
    }

    private fun scaleToMaxSide(src: Bitmap, maxSide: Int): Bitmap {
        val big = max(src.width, src.height)
        if (big <= maxSide) return src
        val k = maxSide.toFloat() / big
        val w = (src.width * k).roundToInt().coerceAtLeast(1)
        val h = (src.height * k).roundToInt().coerceAtLeast(1)
        val out = Bitmap.createScaledBitmap(src, w, h, true)
        if (out !== src) src.recycle()
        return out
    }
}
