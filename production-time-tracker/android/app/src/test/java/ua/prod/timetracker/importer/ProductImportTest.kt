package ua.prod.timetracker.importer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import ua.prod.timetracker.data.importer.CsvReader
import ua.prod.timetracker.data.importer.ProductFileReader
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductImportReport

class ProductImportTest {

    private fun success(result: ImportParseResult): ProductImportReport {
        assertTrue("Очікувався успіх, отримано $result", result is ImportParseResult.Success)
        return (result as ImportParseResult.Success).report
    }

    @Test
    fun `csv with semicolon and spec headers`() {
        val csv = """
            SKU;Вид;Артикул
            000123;Ковбаса варена;A-4587
            000124;Ковбаса копчена;A-4588
            000125;Сосиски;A-4589
        """.trimIndent()
        val report = success(ProductFileReader.read("products.csv", csv.toByteArray()))
        assertEquals(3, report.importedCount)
        assertEquals(0, report.errorCount)
        assertEquals(Product("000123", "Ковбаса варена", "A-4587"), report.products[0])
    }

    @Test
    fun `csv in windows-1251 with quotes and comma delimiter`() {
        val csv = "СКЮ,Вид,Артикул\r\n000123,\"Ковбаса \"\"Лікарська\"\", варена\",A-4587\r\n"
        val report = success(ProductFileReader.read("p.csv", csv.toByteArray(charset("windows-1251"))))
        assertEquals("Ковбаса \"Лікарська\", варена", report.products.single().type)
    }

    @Test
    fun `utf8 bom is stripped`() {
        val bytes = byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte()) + "SKU;Вид;Артикул\n1;Сосиски;A-1".toByteArray()
        assertEquals("1", success(ProductFileReader.read("p.csv", bytes)).products.single().sku)
    }

    @Test
    fun `validation counts errors, duplicates and empty rows without failing import`() {
        val csv = """
            SKU;Вид;Артикул
            000123;Ковбаса варена;A-4587
            ;Сосиски;A-4589
            000124;;A-4588
            ;;
            000123;Дублікат;A-9999
            000126;Сардельки;
            000127;Шинка;A-4600
        """.trimIndent()
        val report = success(ProductFileReader.read("p.csv", csv.toByteArray()))
        assertEquals(6, report.totalRows)
        assertEquals(3, report.importedCount)
        assertEquals(3, report.errorCount)
        assertEquals(1, report.emptyRows)
        assertEquals(1, report.warnings.size)
        assertEquals(3, report.errors[0].rowNumber)
        assertTrue(report.errors[2].message.startsWith("дублікат SKU 000123"))
    }

    @Test
    fun `missing columns give a clear message`() {
        val result = ProductFileReader.read("p.csv", "Код;Назва\n1;Сосиски".toByteArray())
        assertTrue(result is ImportParseResult.Failure)
        assertTrue((result as ImportParseResult.Failure).message.contains("Артикул"))
    }

    @Test
    fun `xlsx with user's real column layout`() {
        val bytes = TestXlsx.build(
            listOf(
                listOf("Артикул ГП", "Артикул МХП", "Найменування", "Торгова група"),
                listOf("144", "УБ14400", "УБ Сос Філейні 1с п/а", "Сосиски"),
                listOf(107005, null, "УБ Сос МІНІ з курячим філе 1с цел ФОРМ", "Сосиски"),
                listOf(318.0, "УБ14566", "УБ Теляча з вершками в/с (0,500)", "Варені ковбаси"),
            ),
        )
        val report = success(ProductFileReader.read("products.xlsx", bytes))
        assertEquals("Лист1", report.sheetName)
        assertEquals(listOf("SKU" to "Артикул ГП", "Вид" to "Найменування", "Артикул" to "Артикул МХП", "Група" to "Торгова група"), report.mapping.describe())
        assertEquals(3, report.importedCount)
        assertEquals(Product("107005", "УБ Сос МІНІ з курячим філе 1с цел ФОРМ", "", "Сосиски"), report.products[1])
        assertEquals("318", report.products[2].sku)
        assertEquals(1, report.warnings.size)
    }

    @Test
    fun `header row may be below a title row`() {
        val bytes = TestXlsx.build(
            listOf(
                listOf("Довідник продукції"),
                listOf(),
                listOf("SKU", "Вид", "Артикул"),
                listOf("000123", "Ковбаса варена", "A-4587"),
            ),
        )
        val report = success(ProductFileReader.read("p.xlsx", bytes))
        assertEquals(2, report.mapping.headerRow)
        assertEquals(1, report.importedCount)
    }

    @Test
    fun `old xls is rejected with explanation`() {
        val ole = byteArrayOf(0xD0.toByte(), 0xCF.toByte(), 0x11, 0xE0.toByte(), 0, 0)
        val result = ProductFileReader.read("p.xls", ole)
        assertTrue((result as ImportParseResult.Failure).message.contains(".xlsx"))
    }

    @Test
    fun `csv parser handles newline inside quotes`() {
        val rows = CsvReader.parse("a;b\n\"x\ny\";z\n")
        assertEquals(listOf(listOf("a", "b"), listOf("x\ny", "z")), rows)
    }
}
