package ua.prod.timetracker.data.importer

import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction

/**
 * Читає CSV у список рядків.
 *  - кодування: UTF-8 (з BOM або без), UTF-16 з BOM, інакше Windows-1251 (типовий експорт Excel в Україні);
 *  - роздільник визначається автоматично: «;», «,» або табуляція;
 *  - підтримуються лапки, подвоєні лапки та переноси рядків усередині лапок.
 */
object CsvReader {

    fun read(bytes: ByteArray): List<List<String>> = parse(decode(bytes))

    fun decode(bytes: ByteArray): String {
        if (bytes.size >= 3 && bytes[0] == 0xEF.toByte() && bytes[1] == 0xBB.toByte() && bytes[2] == 0xBF.toByte()) {
            return String(bytes, 3, bytes.size - 3, Charsets.UTF_8)
        }
        if (bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xFE.toByte()) {
            return String(bytes, 2, bytes.size - 2, Charsets.UTF_16LE)
        }
        if (bytes.size >= 2 && bytes[0] == 0xFE.toByte() && bytes[1] == 0xFF.toByte()) {
            return String(bytes, 2, bytes.size - 2, Charsets.UTF_16BE)
        }
        return try {
            Charsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes))
                .toString()
        } catch (e: CharacterCodingException) {
            String(bytes, Charset.forName("windows-1251"))
        }
    }

    fun parse(text: String): List<List<String>> {
        val delimiter = detectDelimiter(text)
        val rows = ArrayList<List<String>>()
        var row = ArrayList<String>()
        val field = StringBuilder()
        var inQuotes = false
        var i = 0
        while (i < text.length) {
            val c = text[i]
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < text.length && text[i + 1] == '"') {
                        field.append('"'); i++
                    } else {
                        inQuotes = false
                    }
                } else {
                    field.append(c)
                }
            } else {
                when (c) {
                    '"' -> if (field.isEmpty()) inQuotes = true else field.append(c)
                    delimiter -> { row.add(field.toString()); field.setLength(0) }
                    '\r' -> Unit
                    '\n' -> {
                        row.add(field.toString()); field.setLength(0)
                        rows.add(row); row = ArrayList()
                    }
                    else -> field.append(c)
                }
            }
            i++
        }
        if (field.isNotEmpty() || row.isNotEmpty()) {
            row.add(field.toString())
            rows.add(row)
        }
        return rows
    }

    private fun detectDelimiter(text: String): Char {
        val firstLine = text.lineSequence().firstOrNull { it.isNotBlank() } ?: return ','
        val candidates = listOf(';', ',', '\t')
        var best = ','
        var bestCount = 0
        for (d in candidates) {
            var count = 0
            var inQuotes = false
            for (ch in firstLine) {
                if (ch == '"') inQuotes = !inQuotes
                else if (ch == d && !inQuotes) count++
            }
            if (count > bestCount) {
                best = d; bestCount = count
            }
        }
        return best
    }
}
