package ua.prod.timetracker.data.importer

import org.xml.sax.Attributes
import org.xml.sax.helpers.DefaultHandler
import java.io.ByteArrayInputStream
import java.io.IOException
import java.math.BigDecimal
import java.util.zip.ZipInputStream
import javax.xml.parsers.SAXParserFactory

/**
 * Легкий читач XLSX без сторонніх бібліотек (Apache POI для планшета завеликий).
 * Читає значення клітинок усіх аркушів: спільні рядки, вбудовані рядки, числа, результати формул.
 * Номери рядків збігаються з номерами рядків в Excel (порожні рядки зберігаються).
 */
object XlsxReader {

    data class Sheet(val name: String, val rows: List<List<String>>)

    class XlsxFormatException(message: String) : IOException(message)

    private const val MAX_ENTRY_BYTES = 64L * 1024 * 1024
    private const val MAX_ROWS = 200_000

    fun readSheets(bytes: ByteArray): List<Sheet> {
        val entries = unzip(bytes)
        val sharedStrings = entries["xl/sharedStrings.xml"]?.let(::parseSharedStrings) ?: emptyList()
        val sheetRefs = resolveSheets(entries)
        if (sheetRefs.isEmpty()) throw XlsxFormatException("У файлі XLSX не знайдено аркушів")
        return sheetRefs.mapNotNull { (name, path) ->
            entries[path]?.let { Sheet(name, parseSheet(it, sharedStrings)) }
        }
    }

    private fun unzip(bytes: ByteArray): Map<String, ByteArray> {
        val result = HashMap<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                val name = entry.name.trimStart('/')
                val wanted = name == "xl/workbook.xml" || name == "xl/_rels/workbook.xml.rels" ||
                    name == "xl/sharedStrings.xml" || (name.startsWith("xl/worksheets/") && name.endsWith(".xml"))
                if (wanted && !entry.isDirectory) {
                    val data = zip.readBytes()
                    if (data.size > MAX_ENTRY_BYTES) throw XlsxFormatException("Файл XLSX завеликий")
                    result[name] = data
                }
            }
        }
        if (result.isEmpty()) throw XlsxFormatException("Файл не є коректним XLSX")
        return result
    }

    /** Аркуші у порядку книги: ім'я → шлях до XML. */
    private fun resolveSheets(entries: Map<String, ByteArray>): List<Pair<String, String>> {
        val workbook = entries["xl/workbook.xml"]
        val rels = entries["xl/_rels/workbook.xml.rels"]
        if (workbook != null && rels != null) {
            val targets = HashMap<String, String>()
            parseXml(rels, object : DefaultHandler() {
                override fun startElement(uri: String?, localName: String?, qName: String?, attributes: Attributes) {
                    if (name(localName, qName) == "Relationship") {
                        val id = attributes.getValue("Id") ?: return
                        val target = attributes.getValue("Target") ?: return
                        targets[id] = if (target.startsWith("/")) target.trimStart('/') else "xl/$target"
                    }
                }
            })
            val sheets = ArrayList<Pair<String, String>>()
            parseXml(workbook, object : DefaultHandler() {
                override fun startElement(uri: String?, localName: String?, qName: String?, attributes: Attributes) {
                    if (name(localName, qName) == "sheet") {
                        val sheetName = attributes.getValue("name") ?: "Аркуш"
                        val relId = findAttr(attributes, "id")
                        val path = relId?.let { targets[it] }
                        if (path != null) sheets.add(sheetName to path)
                    }
                }
            })
            if (sheets.isNotEmpty()) return sheets
        }
        return entries.keys.filter { it.startsWith("xl/worksheets/sheet") }
            .sortedBy { it.filter(Char::isDigit).toIntOrNull() ?: 0 }
            .map { it.substringAfterLast('/').removeSuffix(".xml") to it }
    }

    private fun parseSharedStrings(xml: ByteArray): List<String> {
        val strings = ArrayList<String>()
        parseXml(xml, object : DefaultHandler() {
            private val current = StringBuilder()
            private var inText = false
            private var inPhonetic = false

            override fun startElement(uri: String?, localName: String?, qName: String?, attributes: Attributes) {
                when (name(localName, qName)) {
                    "si" -> current.setLength(0)
                    "rPh" -> inPhonetic = true
                    "t" -> if (!inPhonetic) inText = true
                }
            }

            override fun endElement(uri: String?, localName: String?, qName: String?) {
                when (name(localName, qName)) {
                    "si" -> strings.add(current.toString())
                    "rPh" -> inPhonetic = false
                    "t" -> inText = false
                }
            }

            override fun characters(ch: CharArray, start: Int, length: Int) {
                if (inText) current.appendRange(ch, start, start + length)
            }
        })
        return strings
    }

    private fun parseSheet(xml: ByteArray, shared: List<String>): List<List<String>> {
        val rows = ArrayList<List<String>>()
        parseXml(xml, object : DefaultHandler() {
            private var row: MutableList<String>? = null
            private var rowNumber = 0
            private var cellType: String? = null
            private var cellColumn = 0
            private var nextColumn = 0
            private val value = StringBuilder()
            private var inValue = false
            private var inInlineText = false

            override fun startElement(uri: String?, localName: String?, qName: String?, attributes: Attributes) {
                when (name(localName, qName)) {
                    "row" -> {
                        val r = attributes.getValue("r")?.toIntOrNull() ?: (rowNumber + 1)
                        // Порожні рядки між заповненими зберігаємо, щоб номери збігалися з Excel.
                        while (rows.size < r - 1 && rows.size < MAX_ROWS) rows.add(emptyList())
                        rowNumber = r
                        row = ArrayList()
                        nextColumn = 0
                    }
                    "c" -> {
                        cellType = attributes.getValue("t")
                        cellColumn = attributes.getValue("r")?.let(::columnIndex) ?: nextColumn
                        nextColumn = cellColumn + 1
                        value.setLength(0)
                    }
                    "v" -> inValue = true
                    "t" -> inInlineText = true
                }
            }

            override fun endElement(uri: String?, localName: String?, qName: String?) {
                when (name(localName, qName)) {
                    "v" -> inValue = false
                    "t" -> inInlineText = false
                    "c" -> {
                        val text = cellText(cellType, value.toString(), shared)
                        val r = row ?: return
                        if (cellColumn in 0..1000) {
                            while (r.size < cellColumn) r.add("")
                            if (r.size == cellColumn) r.add(text) else r[cellColumn] = text
                        }
                    }
                    "row" -> {
                        row?.let { if (rows.size < MAX_ROWS) rows.add(it) }
                        row = null
                    }
                }
            }

            override fun characters(ch: CharArray, start: Int, length: Int) {
                if (inValue || inInlineText) value.appendRange(ch, start, start + length)
            }
        })
        return rows
    }

    private fun cellText(type: String?, raw: String, shared: List<String>): String = when (type) {
        "s" -> raw.trim().toIntOrNull()?.let { shared.getOrNull(it) } ?: ""
        "inlineStr", "str" -> raw
        "b" -> if (raw.trim() == "1") "TRUE" else "FALSE"
        "e" -> ""
        else -> formatNumber(raw.trim())
    }

    /** 144.0 → «144», 1.5E3 → «1500». Нечислові значення повертаються як є. */
    private fun formatNumber(raw: String): String {
        if (raw.isEmpty()) return raw
        return try {
            BigDecimal(raw).stripTrailingZeros().toPlainString()
        } catch (e: NumberFormatException) {
            raw
        }
    }

    /** «AB12» → 27. */
    internal fun columnIndex(ref: String): Int {
        var result = 0
        for (ch in ref) {
            if (!ch.isLetter()) break
            result = result * 26 + (ch.uppercaseChar() - 'A' + 1)
        }
        return result - 1
    }

    private fun name(localName: String?, qName: String?): String =
        localName?.takeIf { it.isNotEmpty() } ?: qName.orEmpty().substringAfter(':')

    private fun findAttr(attributes: Attributes, local: String): String? {
        for (i in 0 until attributes.length) {
            val ln = attributes.getLocalName(i)?.takeIf { it.isNotEmpty() } ?: attributes.getQName(i).substringAfter(':')
            if (ln == local && attributes.getQName(i) != local) return attributes.getValue(i)
        }
        for (i in 0 until attributes.length) {
            if (attributes.getQName(i).endsWith(":$local")) return attributes.getValue(i)
        }
        return null
    }

    private fun parseXml(xml: ByteArray, handler: DefaultHandler) {
        val factory = SAXParserFactory.newInstance()
        factory.isNamespaceAware = true
        runCatching { factory.setFeature("http://xml.org/sax/features/external-general-entities", false) }
        runCatching { factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false) }
        runCatching { factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true) }
        factory.newSAXParser().parse(ByteArrayInputStream(xml), handler)
    }
}
