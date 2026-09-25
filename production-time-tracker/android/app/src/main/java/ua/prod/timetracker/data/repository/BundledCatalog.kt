package ua.prod.timetracker.data.repository

import android.content.res.AssetManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import ua.prod.timetracker.data.importer.ProductFileReader
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.repository.ProductCatalogSource
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.SettingsRepository
import java.io.IOException
import java.security.MessageDigest

/** Довідник продукції, вшитий в APK (assets/catalog/products.xlsx). */
class BundledProductCatalogSource(private val assets: AssetManager) : ProductCatalogSource {

    override suspend fun load(): ImportParseResult = withContext(Dispatchers.IO) {
        val bytes = readBytes() ?: return@withContext ImportParseResult.Failure("Вбудований довідник не знайдено")
        ProductFileReader.read("Вбудований довідник", bytes)
    }

    /** SHA-1 вмісту файлу: змінюється, коли в новій версії APK оновлено довідник. */
    suspend fun fingerprint(): String? = withContext(Dispatchers.IO) {
        readBytes()?.let { bytes ->
            MessageDigest.getInstance("SHA-1").digest(bytes).joinToString("") { "%02x".format(it) }
        }
    }

    private fun readBytes(): ByteArray? = try {
        assets.open(ASSET_PATH).use { it.readBytes() }
    } catch (e: IOException) {
        null
    }

    companion object {
        const val ASSET_PATH = "catalog/products.xlsx"
    }
}

/**
 * Завантажує вшитий довідник:
 *  - при першому запуску (довідник порожній);
 *  - після оновлення APK з новою версією довідника — але лише якщо оператор
 *    не імпортував власний файл і не завантажував довідник з сервера.
 */
class CatalogBootstrapper(
    private val products: ProductRepository,
    private val settings: SettingsRepository,
    private val bundled: BundledProductCatalogSource,
) {
    suspend fun ensureCatalog() {
        val fingerprint = bundled.fingerprint() ?: return
        val s = settings.current()
        val empty = products.count.first() == 0
        val bundledOutdated = s.catalogSource == SOURCE_BUNDLED && s.catalogVersion != fingerprint
        if (empty || bundledOutdated) reloadBundled()
    }

    /** Повертає кількість завантажених позицій або null, якщо довідник недоступний. */
    suspend fun reloadBundled(): Int? {
        val fingerprint = bundled.fingerprint() ?: return null
        val result = bundled.load() as? ImportParseResult.Success ?: return null
        val items = result.report.products
        if (items.isEmpty()) return null
        products.replaceAll(items)
        settings.setCatalogInfo(SOURCE_BUNDLED, fingerprint)
        return items.size
    }

    companion object {
        const val SOURCE_BUNDLED = "bundled"
        const val SOURCE_FILE = "file"
        const val SOURCE_SERVER = "server"
    }
}
