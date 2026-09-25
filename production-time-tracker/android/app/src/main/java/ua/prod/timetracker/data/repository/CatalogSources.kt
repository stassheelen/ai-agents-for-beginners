package ua.prod.timetracker.data.repository

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import ua.prod.timetracker.data.importer.ProductFileReader
import ua.prod.timetracker.data.importer.ProductTableParser
import ua.prod.timetracker.data.remote.api.TimeTrackerApi
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.repository.ProductCatalogSource
import ua.prod.timetracker.domain.repository.SettingsRepository
import java.io.IOException

/** Довідник із файлу CSV/XLSX, вибраного оператором через системний діалог. */
class FileProductCatalogSource(
    private val contentResolver: ContentResolver,
    private val uri: Uri,
) : ProductCatalogSource {

    override suspend fun load(): ImportParseResult = withContext(Dispatchers.IO) {
        try {
            val name = displayName() ?: uri.lastPathSegment ?: "файл"
            val bytes = contentResolver.openInputStream(uri)?.use { input ->
                val buffer = input.readBytes()
                if (buffer.size > ProductFileReader.MAX_FILE_BYTES) {
                    return@withContext ImportParseResult.Failure("Файл завеликий (максимум 30 МБ)")
                }
                buffer
            } ?: return@withContext ImportParseResult.Failure("Не вдалося відкрити файл")
            ProductFileReader.read(name, bytes)
        } catch (e: IOException) {
            ImportParseResult.Failure("Не вдалося прочитати файл: ${e.message}")
        } catch (e: SecurityException) {
            ImportParseResult.Failure("Немає доступу до файлу")
        }
    }

    private fun displayName(): String? =
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
}

/**
 * Довідник із сервера (GET /api/products). Дані проходять ту саму перевірку, що й файл.
 * Використовується кнопкою «Оновити довідник», коли в налаштуваннях задано API URL.
 */
class RemoteProductCatalogSource(
    private val api: TimeTrackerApi,
    private val settings: SettingsRepository,
) : ProductCatalogSource {

    override suspend fun load(): ImportParseResult = withContext(Dispatchers.IO) {
        val s = settings.current()
        if (s.apiUrl.isBlank()) {
            return@withContext ImportParseResult.Failure("API URL не налаштовано. Використайте імпорт файлу CSV/XLSX.")
        }
        try {
            val response = api.getProducts(TimeTrackerApi.endpoint(s.apiUrl, "/api/products"), s.apiKey.ifBlank { null })
            val rows = buildList {
                add(listOf("SKU", "Вид", "Артикул", "Група"))
                response.products.forEach { add(listOf(it.sku, it.type, it.article.orEmpty(), it.group.orEmpty())) }
            }
            ProductTableParser.parse("Сервер", rows)
        } catch (e: HttpException) {
            if (e.code() == 501) {
                ImportParseResult.Failure("Сервер ще не надає довідник. Використайте імпорт файлу CSV/XLSX.")
            } else {
                ImportParseResult.Failure("Сервер повернув помилку ${e.code()}")
            }
        } catch (e: IOException) {
            ImportParseResult.Failure("Немає з'єднання з сервером")
        } catch (e: SerializationException) {
            ImportParseResult.Failure("Сервер повернув дані в неочікуваному форматі")
        }
    }
}
