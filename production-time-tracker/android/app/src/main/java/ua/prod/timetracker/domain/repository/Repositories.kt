package ua.prod.timetracker.domain.repository

import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.WorkState
import java.time.Instant

interface ProductRepository {
    val count: Flow<Int>
    suspend fun search(query: String, limit: Int = 200): List<Product>
    suspend fun replaceAll(products: List<Product>)
}

/**
 * Джерело довідника продукції. Зараз — файл CSV/XLSX; у майбутньому — сервер (GET /api/products).
 * Обидва повертають однаковий звіт перевірки, тому UI та збереження не залежать від джерела.
 */
interface ProductCatalogSource {
    suspend fun load(): ImportParseResult
}

sealed interface RecordEventResult {
    data class Recorded(val event: ProductionEvent) : RecordEventResult
    data class Rejected(val reason: String) : RecordEventResult
}

sealed interface SelectProductResult {
    data class Selected(val record: ProductionRecord) : SelectProductResult
    data class Rejected(val reason: String) : SelectProductResult
}

interface ProductionRepository {
    val activeRecord: Flow<ProductionRecord?>
    val workState: Flow<WorkState>
    val lastEvent: Flow<ProductionEvent?>
    val pendingCount: Flow<Int>
    val failedCount: Flow<Int>
    fun recentProducts(limit: Int): Flow<List<Product>>
    fun eventsForRecord(recordId: String): Flow<List<ProductionEvent>>
    fun eventsSince(from: Instant): Flow<List<ProductionEvent>>

    suspend fun selectProduct(product: Product): SelectProductResult
    suspend fun updateSetup(quantityKg: Double, phase: String, comment: String?)

    /** Створює подію з поточним часом. Перевіряє допустимість послідовності в транзакції. */
    suspend fun recordEvent(type: EventType, downtimeReason: String? = null, comment: String? = null): RecordEventResult
    suspend fun updateEventComment(eventId: String, comment: String?)
}

/** Довідник фаз. Зараз — список у налаштуваннях планшета; у майбутньому — з сервера. */
interface PhaseRepository {
    val phases: Flow<List<String>>
    suspend fun setPhases(phases: List<String>)
}

data class AppSettings(
    val deviceId: String,
    val apiUrl: String,
    val apiKey: String,
    val phases: List<String>,
    val lastSyncAt: String?,
    val lastSyncError: String?,
    /** Звідки завантажено довідник: bundled | file | server (null — ще не завантажувався). */
    val catalogSource: String? = null,
    /** Відбиток вбудованого довідника, щоб оновлювати його разом з новою версією APK. */
    val catalogVersion: String? = null,
)

interface SettingsRepository {
    val settings: Flow<AppSettings>
    suspend fun current(): AppSettings
    suspend fun ensureDeviceId(): String
    suspend fun setDeviceId(value: String)
    suspend fun setApiUrl(value: String)
    suspend fun setApiKey(value: String)
    suspend fun setPhases(value: List<String>)
    suspend fun setSyncResult(at: String?, error: String?)
    suspend fun setCatalogInfo(source: String, version: String?)
}
