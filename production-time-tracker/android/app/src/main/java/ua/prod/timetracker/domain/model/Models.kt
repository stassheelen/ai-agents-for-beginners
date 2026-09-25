package ua.prod.timetracker.domain.model

import java.time.Instant

/**
 * Позиція довідника продукції.
 *
 * @property sku    СКЮ / код продукції (унікальний).
 * @property type   Вид / найменування продукції.
 * @property article Артикул (може бути порожнім, якщо у довіднику його немає).
 * @property group  Необов'язкова група (наприклад, «Торгова група»).
 */
data class Product(
    val sku: String,
    val type: String,
    val article: String,
    val group: String? = null,
) {
    /** Головний ідентифікатор для відображення: артикул, а якщо його немає — СКЮ. */
    val headline: String get() = article.ifBlank { sku }
}

/**
 * Поточний виробничий запис: вибрана продукція + кількість + фаза.
 * Усі події, створені під час роботи з цією продукцією, мають однаковий [recordId].
 */
data class ProductionRecord(
    val recordId: String,
    val product: Product,
    val quantityKg: Double?,
    val phase: String?,
    val comment: String?,
    val createdAt: Instant,
) {
    val isSetupComplete: Boolean get() = quantityKg != null && quantityKg > 0 && !phase.isNullOrBlank()
}

data class ProductionEvent(
    val id: Long,
    val eventId: String,
    val recordId: String,
    val sku: String,
    val productName: String,
    val article: String,
    val quantityKg: Double?,
    val phase: String?,
    val eventType: EventType,
    val timestamp: Instant,
    val durationSeconds: Long?,
    val downtimeReason: String?,
    val comment: String?,
    val recordComment: String?,
    val deviceId: String,
    val syncStatus: SyncStatus,
    val createdAt: Instant,
    val lastSyncError: String? = null,
)
