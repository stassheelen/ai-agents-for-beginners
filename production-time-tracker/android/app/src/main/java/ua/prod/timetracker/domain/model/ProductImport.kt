package ua.prod.timetracker.domain.model

/** Проблема в конкретному рядку файлу (номер рядка — як у Excel / текстовому редакторі). */
data class ImportIssue(val rowNumber: Int, val message: String)

/** Яка колонка файлу відповідає якому полю довідника. */
data class ColumnMapping(
    val headerRow: Int,
    val skuColumn: Int,
    val typeColumn: Int,
    val articleColumn: Int,
    val groupColumn: Int?,
    val headers: List<String>,
) {
    fun describe(): List<Pair<String, String>> = buildList {
        add("SKU" to headers[skuColumn])
        add("Вид" to headers[typeColumn])
        add("Артикул" to headers[articleColumn])
        groupColumn?.let { add("Група" to headers[it]) }
    }
}

/**
 * Результат перевірки файлу довідника.
 * [totalRows] = [products].size + [errors].size (порожні рядки рахуються окремо).
 */
data class ProductImportReport(
    val sourceName: String,
    val sheetName: String?,
    val mapping: ColumnMapping,
    val products: List<Product>,
    val errors: List<ImportIssue>,
    val warnings: List<ImportIssue>,
    val emptyRows: Int,
) {
    val totalRows: Int get() = products.size + errors.size
    val importedCount: Int get() = products.size
    val errorCount: Int get() = errors.size
}

sealed interface ImportParseResult {
    data class Success(val report: ProductImportReport) : ImportParseResult
    data class Failure(val message: String) : ImportParseResult
}
