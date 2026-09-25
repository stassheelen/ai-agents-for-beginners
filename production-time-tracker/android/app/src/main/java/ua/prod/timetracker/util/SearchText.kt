package ua.prod.timetracker.util

import java.util.Locale

/**
 * Нормалізація тексту для швидкого офлайн-пошуку.
 *
 *  - регістр не важливий (включно з кирилицею — SQLite LIKE цього сам не вміє);
 *  - кириличні літери, що виглядають як латинські (А/A, С/C, О/O …), зводяться до одного вигляду,
 *    тому «А-4587», набране на українській розкладці, знайде «A-4587»;
 *  - у компактному ключі артикулу прибрано дефіси та пробіли: «a4587» знайде «A-4587».
 */
object SearchText {
    private val ukLocale = Locale.forLanguageTag("uk")

    private val homoglyphs = mapOf(
        'а' to 'a', 'в' to 'b', 'е' to 'e', 'к' to 'k', 'м' to 'm', 'н' to 'h',
        'о' to 'o', 'р' to 'p', 'с' to 'c', 'т' to 't', 'у' to 'y', 'х' to 'x', 'і' to 'i',
    )

    /** Нижній регістр + згортання схожих літер + один пробіл між словами. */
    fun normalize(value: String): String {
        val lower = value.lowercase(ukLocale)
        val sb = StringBuilder(lower.length)
        var lastSpace = true
        for (ch in lower) {
            if (ch.isWhitespace()) {
                if (!lastSpace) sb.append(' ')
                lastSpace = true
            } else {
                sb.append(homoglyphs[ch] ?: ch)
                lastSpace = false
            }
        }
        return sb.toString().trimEnd()
    }

    /** Посимвольне згортання без зміни довжини — для підсвічування збігів у тексті. */
    fun foldPerChar(value: String): String {
        val sb = StringBuilder(value.length)
        for (ch in value) {
            val lower = ch.lowercaseChar()
            sb.append(homoglyphs[lower] ?: lower)
        }
        return sb.toString()
    }

    /** Лише літери та цифри: «A-4587» → «a4587». */
    fun compact(value: String): String = normalize(value).filter { it.isLetterOrDigit() }

    fun tokens(query: String): List<String> = normalize(query).split(' ').filter { it.isNotEmpty() }

    /** Текст, по якому шукає SQL-запит (article LIKE OR sku LIKE OR type LIKE …). */
    fun indexText(sku: String, article: String, type: String, group: String?): String =
        listOf(sku, article, compact(article), type, group.orEmpty())
            .filter { it.isNotBlank() }
            .joinToString(" ") { normalize(it) }
}
