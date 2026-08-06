package space.learnnorsk.app.addword

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Тест на то место, где наивная реализация PROCESS_TEXT ломается: бэкенд отдаёт fuzzy-совпадения
 * ВЫШЕ точного, а `/sets/{id}/words` принимает только лемму. Кейсы взяты с живого прода.
 */
class WordResolverTest {

    private fun item(word: String, pos: String = "noun", inPool: Boolean = true, viaForm: String? = null) =
        SearchItem(word, pos, inPool, viaForm, emptyMap())

    @Test
    fun `normalize strips punctuation and case`() {
        assertEquals("hus", WordResolver.normalize("  «Hus».  "))
        assertEquals("gå av hengslene", WordResolver.normalize("gå\n av  hengslene"))
        assertEquals("e-post", WordResolver.normalize("e-post,"))
        assertEquals("", WordResolver.normalize("   "))
        assertEquals("", WordResolver.normalize(null))
    }

    @Test
    fun `normalize caps length at backend limit`() {
        val long = "a".repeat(200)
        assertEquals(WordResolver.MAX_LEN, WordResolver.normalize(long).length)
    }

    @Test
    fun `exact pool match wins over fuzzy neighbours`() {
        val best = WordResolver.best(
            "hus",
            listOf(item("hushjelp"), item("huse", pos = "verb"), item("hus")),
        )
        assertEquals("hus", best?.word)
    }

    @Test
    fun `inflected form resolves to lemma, not to fuzzy match`() {
        // Реальный ответ прода на q=gikk: лемма gå приходит ТРЕТЬЕЙ.
        val best = WordResolver.best(
            "gikk",
            listOf(
                item("gå av hengslene", pos = "phrase"),
                item("logikk"),
                item("gå", pos = "verb", viaForm = "gikk"),
                item("pikk"),
                item("gikk", pos = "", inPool = false),
            ),
        )
        assertEquals("gå", best?.word)
    }

    @Test
    fun `word known to the bank but missing from the pool is offered for generation`() {
        // q=kvitringen: единственный результат — лемма вне пула, её надо сгенерировать.
        val best = WordResolver.best("kvitringen", listOf(item("kvitring", inPool = false, viaForm = "kvitringen")))
        assertEquals("kvitring", best?.word)
        assertEquals(false, best?.inPool)
    }

    @Test
    fun `pool entry outranks non-pool exact match`() {
        val ranked = WordResolver.rank(
            "spiser",
            listOf(item("inspisere", pos = "verb"), item("spise", pos = "verb", viaForm = "spiser")),
        )
        assertEquals(listOf("spise", "inspisere"), ranked.map { it.word })
    }

    @Test
    fun `empty results give no candidate`() {
        assertNull(WordResolver.best("xyzzyqwe", emptyList()))
    }
}
