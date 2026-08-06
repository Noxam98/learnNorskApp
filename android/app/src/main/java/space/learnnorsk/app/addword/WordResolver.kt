package space.learnnorsk.app.addword

import java.util.Locale

/**
 * Чистая логика «выделенный текст → слово пула». Без Android и без сети — на неё есть
 * JVM-тест (WordResolverTest), потому что именно тут ломается наивная реализация.
 */

/** Элемент ответа `GET /pool/search`. `pool_id` бэкенд НЕ отдаёт — добавляем по лемме. */
data class SearchItem(
    /** Лемма из пула/банка. Слать в `/sets/{id}/words` надо именно её, не выделенный текст. */
    val word: String,
    val partOfSpeech: String,
    /** true = запись есть в пуле, можно добавлять сразу. false = сначала `/pool/generate`. */
    val inPool: Boolean,
    /** Заполнено, если совпадение нашли через словоформу ordbank: `gikk` → `gå`. */
    val viaForm: String?,
    /** Переводы по языкам: ru/ukr/en/pl/lt/lv/ar/no. */
    val translate: Map<String, List<String>>,
)

object WordResolver {

    /** Бэк режет слово на 80 символах (routers/pool.py) — режем на клиенте, чтобы не ловить 400. */
    const val MAX_LEN = 80

    /**
     * Нормализация выделения: схлопнуть пробелы/переносы, снять обрамляющую пунктуацию
     * («кавычки», точку, скобки), нижний регистр, кап длины.
     *
     * Внутреннюю пунктуацию не трогаем: `e-post`, `gå av hengslene` — валидные записи пула.
     */
    fun normalize(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val collapsed = raw.replace(Regex("\\s+"), " ").trim()
        val trimmed = collapsed.trim { !it.isLetterOrDigit() }
        val lower = trimmed.lowercase(Locale.ROOT)
        return if (lower.length <= MAX_LEN) lower else lower.take(MAX_LEN).trim()
    }

    /**
     * Ранжирование кандидатов. Порядок ответа бэкенда — не наш: fuzzy-совпадения приходят
     * ВЫШЕ точного попадания (`gikk` → `gå av hengslene`, `logikk`, и только третьим `gå`;
     * `spiser` → `inspisere`, потом `spise`). Слепое «берём results[0]» кладёт в набор мусор.
     *
     * Приоритет: точная лемма в пуле → словоформа леммы в пуле → то же вне пула (кандидат
     * на генерацию) → остальное в порядке бэкенда, но записи пула выше.
     */
    fun rank(query: String, items: List<SearchItem>): List<SearchItem> =
        items.withIndex()
            .sortedWith(compareByDescending<IndexedValue<SearchItem>> { score(query, it.value) }
                .thenBy { it.index })
            .map { it.value }

    /** Лучший кандидат или null, если бэкенд вообще ничего не знает про это слово. */
    fun best(query: String, items: List<SearchItem>): SearchItem? = rank(query, items).firstOrNull()

    private fun score(query: String, it: SearchItem): Int {
        val q = query.lowercase(Locale.ROOT)
        val exact = it.word.lowercase(Locale.ROOT) == q
        val viaForm = it.viaForm?.lowercase(Locale.ROOT) == q
        return when {
            exact && it.inPool -> 100
            viaForm && it.inPool -> 90
            exact -> 80          // слово знает банк/лексикон, но записи в пуле нет → /pool/generate
            viaForm -> 70
            it.inPool -> 20      // fuzzy-сосед, но добавить можно
            else -> 10           // fuzzy и не в пуле — почти всегда бесполезно
        }
    }
}
