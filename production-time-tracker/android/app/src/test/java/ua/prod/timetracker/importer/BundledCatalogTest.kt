package ua.prod.timetracker.importer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import ua.prod.timetracker.data.importer.ProductFileReader
import ua.prod.timetracker.domain.logic.SearchRanker
import ua.prod.timetracker.domain.model.ImportParseResult
import java.io.File

/** Вшитий довідник (assets/catalog/products.xlsx) має імпортуватися без помилок. */
class BundledCatalogTest {

    private val file = listOf(
        File("src/main/assets/catalog/products.xlsx"),
        File("app/src/main/assets/catalog/products.xlsx"),
    ).first { it.exists() }

    @Test
    fun `bundled catalog imports cleanly and is searchable`() {
        val result = ProductFileReader.read(file.name, file.readBytes())
        assertTrue("$result", result is ImportParseResult.Success)
        val report = (result as ImportParseResult.Success).report
        assertEquals(688, report.importedCount)
        assertEquals(0, report.errorCount)

        val products = report.products
        val found = SearchRanker.rank(products.filter { SearchRanker.matches(it, "144") }, "144")
        assertEquals("144", found.first().sku)
        assertEquals("УБ14400", found.first().article)
    }
}
