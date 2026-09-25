package ua.prod.timetracker.data.importer

import ua.prod.timetracker.domain.model.ColumnMapping
import ua.prod.timetracker.domain.model.ImportIssue
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductImportReport

/**
 * Знаходить рядок заголовків, зіставляє колонки та перевіряє кожен рядок.
 * Один неправильний рядок не зупиняє імпорт — він потрапляє у список помилок.
 */
object ProductTableParser {

    private const val HEADER_SEARCH_ROWS = 15
    private const val MAX_SKU_LENGTH = 64
    private const val MAX_TEXT_LENGTH = 300

    // Ключі — нормалізовані назви колонок (нижній регістр, без пробілів і розділових знаків).
    private val skuAliases = setOf("sku", "скю", "ску", "код sku", "артикул гп", "код гп", "код", "код продукції")
        .map(::normalizeHeader).toSet()
    private val typeAliases = setOf("вид", "type", "найменування", "назва", "name", "продукція", "номенклатура")
        .map(::normalizeHeader).toSet()
    private val articleAliases = setOf("артикул", "article", "артикул мхп", "арт", "art")
        .map(::normalizeHeader).toSet()
    private val groupAliases = setOf("торгова група", "група", "group", "категорія", "category")
        .map(::normalizeHeader).toSet()

    fun normalizeHeader(value: String): String =
        value.lowercase().filter { it.isLetterOrDigit() }

    /** Перебирає аркуші та повертає перший, у якому знайдено потрібні колонки. */
    fun parseSheets(sourceName: String, sheets: List<XlsxReader.Sheet>): ImportParseResult {
        var firstFailure: ImportParseResult.Failure? = null
        for (sheet in sheets) {
            when (val result = parse(sourceName, sheet.rows, sheet.name)) {
                is ImportParseResult.Success -> return result
                is ImportParseResult.Failure -> if (firstFailure == null) firstFailure = result
            }
        }
        return firstFailure ?: ImportParseResult.Failure("Файл порожній")
    }

    fun parse(sourceName: String, rows: List<List<String>>, sheetName: String? = null): ImportParseResult {
        if (rows.all { r -> r.all { it.isBlank() } }) return ImportParseResult.Failure("Файл порожній")
        val mapping = findMapping(rows) ?: return ImportParseResult.Failure(missingColumnsMessage(rows))

        val products = ArrayList<Product>()
        val errors = ArrayList<ImportIssue>()
        val warnings = ArrayList<ImportIssue>()
        val firstRowBySku = HashMap<String, Int>()
        var emptyRows = 0

        for (index in (mapping.headerRow + 1) until rows.size) {
            val row = rows[index]
            val rowNumber = index + 1
            val sku = clean(row.getOrNull(mapping.skuColumn))
            val type = clean(row.getOrNull(mapping.typeColumn))
            val article = clean(row.getOrNull(mapping.articleColumn))
            val group = mapping.groupColumn?.let { clean(row.getOrNull(it)) }?.takeIf { it.isNotEmpty() }

            if (sku.isEmpty() && type.isEmpty() && article.isEmpty()) {
                emptyRows++
                continue
            }
            val problem = when {
                sku.isEmpty() -> "немає SKU"
                type.isEmpty() -> "немає виду (назви продукції)"
                sku.length > MAX_SKU_LENGTH -> "занадто довгий SKU (${sku.length} символів)"
                sku.any { it.isISOControl() } -> "неправильний формат SKU"
                type.length > MAX_TEXT_LENGTH || article.length > MAX_TEXT_LENGTH -> "занадто довге значення"
                firstRowBySku.containsKey(sku) -> "дублікат SKU $sku (вже є в рядку ${firstRowBySku[sku]})"
                else -> null
            }
            if (problem != null) {
                errors.add(ImportIssue(rowNumber, problem))
                continue
            }
            if (article.isEmpty()) warnings.add(ImportIssue(rowNumber, "немає артикулу (SKU $sku) — пошук за SKU та видом"))
            firstRowBySku[sku] = rowNumber
            products.add(Product(sku = sku, type = type, article = article, group = group))
        }

        if (products.isEmpty() && errors.isEmpty()) {
            return ImportParseResult.Failure("У файлі є заголовки, але немає жодної позиції")
        }
        return ImportParseResult.Success(
            ProductImportReport(sourceName, sheetName, mapping, products, errors, warnings, emptyRows),
        )
    }

    private fun findMapping(rows: List<List<String>>): ColumnMapping? {
        for (rowIndex in 0 until minOf(rows.size, HEADER_SEARCH_ROWS)) {
            val headers = rows[rowIndex].map { it.trim() }
            val normalized = headers.map(::normalizeHeader)
            val used = HashSet<Int>()
            fun pick(aliases: Set<String>): Int? {
                val i = normalized.indices.firstOrNull { it !in used && normalized[it] in aliases } ?: return null
                used.add(i)
                return i
            }
            val sku = pick(skuAliases) ?: continue
            val article = pick(articleAliases) ?: continue
            val type = pick(typeAliases) ?: continue
            val group = pick(groupAliases)
            return ColumnMapping(rowIndex, sku, type, article, group, headers)
        }
        return null
    }

    private fun missingColumnsMessage(rows: List<List<String>>): String {
        val candidates = rows.take(HEADER_SEARCH_ROWS).map { r -> r.map(::normalizeHeader).toSet() }
        val best = candidates.maxByOrNull { set ->
            listOf(skuAliases, typeAliases, articleAliases).count { aliases -> set.any { it in aliases } }
        } ?: emptySet()
        val missing = buildList {
            if (best.none { it in skuAliases }) add("SKU (СКЮ)")
            if (best.none { it in typeAliases }) add("Вид")
            if (best.none { it in articleAliases }) add("Артикул")
        }
        return "Не знайдено колонки: ${missing.joinToString(", ")}. " +
            "Перший рядок файлу повинен містити заголовки SKU, Вид, Артикул."
    }

    private fun clean(value: String?): String =
        value.orEmpty().replace(' ', ' ').trim().replace(Regex("\\s+"), " ")
}
