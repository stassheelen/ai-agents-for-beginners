package ua.prod.timetracker.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Довідник продукції. Поля *_key та search_text — нормалізовані значення для швидкого пошуку. */
@Entity(
    tableName = "products",
    indices = [
        Index(value = ["sku"], unique = true),
        Index(value = ["article_key"]),
        Index(value = ["sku_key"]),
    ],
)
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sku: String,
    val type: String,
    val article: String,
    @ColumnInfo(name = "product_group") val group: String?,
    @ColumnInfo(name = "sku_key") val skuKey: String,
    @ColumnInfo(name = "article_key") val articleKey: String,
    @ColumnInfo(name = "search_text") val searchText: String,
)

/**
 * Подія виробництва. Записується в Room ДО будь-якої спроби відправки на сервер.
 * [eventId] (UUID) — ключ ідемпотентності на бекенді.
 * [localRevision] збільшується при редагуванні коментаря, щоб не позначити як SYNCED
 * версію, яку ще не відправили.
 */
@Entity(
    tableName = "production_events",
    indices = [
        Index(value = ["event_id"], unique = true),
        Index(value = ["sync_status"]),
        Index(value = ["record_id"]),
        Index(value = ["event_type", "timestamp_ms"]),
        Index(value = ["timestamp_ms"]),
    ],
)
data class ProductionEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "event_id") val eventId: String,
    @ColumnInfo(name = "record_id") val recordId: String,
    val sku: String,
    @ColumnInfo(name = "product_name") val productName: String,
    val article: String,
    @ColumnInfo(name = "quantity_kg") val quantityKg: Double?,
    val phase: String?,
    @ColumnInfo(name = "event_type") val eventType: String,
    /** ISO 8601 UTC, наприклад 2026-09-25T11:32:18Z. */
    val timestamp: String,
    @ColumnInfo(name = "timestamp_ms") val timestampMs: Long,
    @ColumnInfo(name = "duration_seconds") val durationSeconds: Long?,
    @ColumnInfo(name = "downtime_reason") val downtimeReason: String?,
    val comment: String?,
    @ColumnInfo(name = "record_comment") val recordComment: String?,
    @ColumnInfo(name = "device_id") val deviceId: String,
    @ColumnInfo(name = "sync_status") val syncStatus: String,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "local_revision") val localRevision: Int = 0,
    @ColumnInfo(name = "sync_attempts") val syncAttempts: Int = 0,
    @ColumnInfo(name = "last_sync_error") val lastSyncError: String? = null,
    @ColumnInfo(name = "synced_at") val syncedAt: String? = null,
)

/** Виробничий запис: вибрана продукція, кількість (кг), фаза. Активний лише один. */
@Entity(
    tableName = "production_records",
    indices = [
        Index(value = ["record_id"], unique = true),
        Index(value = ["is_active"]),
        Index(value = ["sku"]),
    ],
)
data class ProductionRecordEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "record_id") val recordId: String,
    val sku: String,
    @ColumnInfo(name = "product_name") val productName: String,
    val article: String,
    @ColumnInfo(name = "product_group") val group: String?,
    @ColumnInfo(name = "quantity_kg") val quantityKg: Double?,
    val phase: String?,
    val comment: String?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "created_at_ms") val createdAtMs: Long,
    @ColumnInfo(name = "is_active") val isActive: Boolean,
)
