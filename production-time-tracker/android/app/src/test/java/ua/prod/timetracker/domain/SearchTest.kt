package ua.prod.timetracker.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import ua.prod.timetracker.domain.logic.SearchRanker
import ua.prod.timetracker.domain.model.Product

class SearchTest {

    private val products = listOf(
        Product("000123", "Ковбаса варена", "A-4587"),
        Product("000124", "Ковбаса копчена", "A-4588"),
        Product("000125", "Сосиски", "A-4589"),
        Product("144", "УБ Сос Філейні 1с п/а", "УБ14400", "Сосиски"),
        Product("4587", "Сардельки", ""),
    )

    private fun search(q: String) = SearchRanker.rank(products.filter { SearchRanker.matches(it, q) }, q)

    @Test
    fun `partial article finds all matches`() {
        assertEquals(listOf("A-4587", "A-4588", "A-4589"), search("458").filter { it.article.isNotEmpty() }.map { it.article })
    }

    @Test
    fun `exact article match ranks first`() {
        val result = search("4587")
        assertEquals("4587", result.first().sku) // точний збіг SKU
        assertTrue(result.any { it.article == "A-4587" })
    }

    @Test
    fun `sku, type, case-insensitive and cyrillic look-alike letters`() {
        assertEquals("A-4587", search("000123").single().article)
        assertEquals(2, search("ковбаса").size)
        assertEquals(2, search("КОВБАСА").size)
        assertEquals("A-4587", search("а-4587").first().article) // кирилична «а»
        assertEquals("A-4587", search("a4587").first().article)  // без дефісу
        assertEquals("УБ14400", search("уб144").first().article)
    }

    @Test
    fun `multiple words must all match`() {
        assertEquals("144", search("сос філ").single().sku)
        assertFalse(SearchRanker.matches(products[0], "ковбаса сосиски"))
    }
}
