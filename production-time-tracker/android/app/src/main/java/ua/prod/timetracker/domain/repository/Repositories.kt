package ua.prod.timetracker.domain.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import ua.prod.timetracker.domain.model.ActiveRecordState
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
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

interface ProductionRepository {
    /** Уся продукція на екрані зі станом кнопок кожної. */
    val activeRecords: Flow<List<ActiveRecordState>>
    val lastEvent: Flow<ProductionEvent?>
    val pendingCount: Flow<Int>
    val failedCount: Flow<Int>

    /** recordId щойно доданої продукції — щоб одразу відкрити введення кг і фази. */
    val newlyAddedRecordId: StateFlow<String?>
    fun consumeNewlyAdded()

    fun recentProducts(limit: Int): Flow<List<Product>>
    fun eventsForActiveRecords(): Flow<List<ProductionEvent>>
    fun eventsSince(from: Instant): Flow<List<ProductionEvent>>

    /** Додає продукцію на екран (якщо вона вже там — просто розгортає її картку). */
    suspend fun addProduct(product: Product): ProductionRecord
    suspend fun updateSetup(recordId: String, quantityKg: Double, phase: String, comment: String?)
    suspend fun setCollapsed(recordId: String, collapsed: Boolean)

    /** Прибирає картку з екрана (дані зберігаються). Можна лише коли по продукції нічого не йде. */
    suspend fun closeRecord(recordId: String): String?

    /** Створює подію з поточним часом для конкретної продукції. Перевіряє послідовність у транзакції. */
    suspend fun recordEvent(
        recordId: String,
        type: EventType,
        downtimeReason: String? = null,
        comment: String? = null,
    ): RecordEventResult

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
