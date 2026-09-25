package ua.prod.timetracker.data.importer

import ua.prod.timetracker.domain.model.ImportParseResult
import java.util.zip.ZipException

/** Визначає формат файлу за вмістом і розбирає його у звіт імпорту. */
object ProductFileReader {

    const val MAX_FILE_BYTES = 30 * 1024 * 1024

    fun read(fileName: String, bytes: ByteArray): ImportParseResult {
        if (bytes.isEmpty()) return ImportParseResult.Failure("Файл порожній")
        if (bytes.size > MAX_FILE_BYTES) return ImportParseResult.Failure("Файл завеликий (максимум 30 МБ)")
        return try {
            when {
                isZip(bytes) -> ProductTableParser.parseSheets(fileName, XlsxReader.readSheets(bytes))
                isOle(bytes) -> ImportParseResult.Failure(
                    "Старий формат Excel (.xls) не підтримується. Збережіть файл як .xlsx або .csv.",
                )
                else -> ProductTableParser.parse(fileName, CsvReader.read(bytes))
            }
        } catch (e: XlsxReader.XlsxFormatException) {
            ImportParseResult.Failure(e.message ?: "Помилка читання XLSX")
        } catch (e: ZipException) {
            ImportParseResult.Failure("Файл XLSX пошкоджений")
        } catch (e: Exception) {
            ImportParseResult.Failure("Не вдалося прочитати файл: ${e.message ?: e.javaClass.simpleName}")
        }
    }

    private fun isZip(b: ByteArray) = b.size >= 4 && b[0] == 0x50.toByte() && b[1] == 0x4B.toByte() &&
        b[2] == 0x03.toByte() && b[3] == 0x04.toByte()

    private fun isOle(b: ByteArray) = b.size >= 4 && b[0] == 0xD0.toByte() && b[1] == 0xCF.toByte() &&
        b[2] == 0x11.toByte() && b[3] == 0xE0.toByte()
}
