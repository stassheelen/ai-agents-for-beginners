package ua.prod.timetracker.data.local

import ua.prod.timetracker.data.local.entity.ProductEntity
import ua.prod.timetracker.data.local.entity.ProductionEventEntity
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncStatus
import ua.prod.timetracker.util.SearchText
import java.time.Instant

fun Product.toEntity(): ProductEntity = ProductEntity(
    sku = sku,
    type = type,
    article = article,
    group = group,
    skuKey = SearchText.compact(sku),
    articleKey = SearchText.compact(article),
    searchText = SearchText.indexText(sku, article, type, group),
)

fun ProductEntity.toDomain(): Product = Product(sku = sku, type = type, article = article, group = group)

fun ProductionRecordEntity.toDomain(): ProductionRecord = ProductionRecord(
    recordId = recordId,
    product = Product(sku = sku, type = productName, article = article, group = group),
    quantityKg = quantityKg,
    phase = phase,
    comment = comment,
    createdAt = Instant.ofEpochMilli(createdAtMs),
)

fun ProductionEventEntity.toDomain(): ProductionEvent = ProductionEvent(
    id = id,
    eventId = eventId,
    recordId = recordId,
    sku = sku,
    productName = productName,
    article = article,
    quantityKg = quantityKg,
    phase = phase,
    eventType = EventType.fromCode(eventType) ?: EventType.PHASE_START,
    timestamp = Instant.ofEpochMilli(timestampMs),
    durationSeconds = durationSeconds,
    downtimeReason = downtimeReason,
    comment = comment,
    recordComment = recordComment,
    deviceId = deviceId,
    syncStatus = if (syncStatus == SyncStatus.SYNCED.name) SyncStatus.SYNCED else SyncStatus.PENDING,
    createdAt = runCatching { Instant.parse(createdAt) }.getOrDefault(Instant.ofEpochMilli(timestampMs)),
    lastSyncError = lastSyncError,
)
