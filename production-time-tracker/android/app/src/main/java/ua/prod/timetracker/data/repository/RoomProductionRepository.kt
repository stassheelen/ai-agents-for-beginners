package ua.prod.timetracker.data.repository

import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import ua.prod.timetracker.data.local.database.AppDatabase
import ua.prod.timetracker.data.local.entity.ProductionEventEntity
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity
import ua.prod.timetracker.data.local.toDomain
import ua.prod.timetracker.domain.logic.WorkStateReducer
import ua.prod.timetracker.domain.model.ActivityKind
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncStatus
import ua.prod.timetracker.domain.model.TransitionCheck
import ua.prod.timetracker.domain.model.WorkState
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.RecordEventResult
import ua.prod.timetracker.domain.repository.SelectProductResult
import ua.prod.timetracker.domain.repository.SettingsRepository
import ua.prod.timetracker.sync.SyncScheduler
import ua.prod.timetracker.util.TimeFormats
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * Серце офлайн-логіки:
 * натискання → timestamp → Room (PENDING) → результат оператору → спроба синхронізації.
 */
class RoomProductionRepository(
    private val db: AppDatabase,
    private val settings: SettingsRepository,
    private val syncScheduler: SyncScheduler,
    private val clock: Clock = Clock.systemUTC(),
) : ProductionRepository {

    private val eventDao = db.eventDao()
    private val recordDao = db.recordDao()

    private val phaseTypes = EventType.ofActivity(ActivityKind.PHASE).map { it.name }
    private val changeoverTypes = EventType.ofActivity(ActivityKind.CHANGEOVER).map { it.name }
    private val downtimeTypes = EventType.ofActivity(ActivityKind.DOWNTIME).map { it.name }

    override val activeRecord: Flow<ProductionRecord?> = recordDao.observeActive().map { it?.toDomain() }

    override val workState: Flow<WorkState> = combine(
        eventDao.observeLatestOfTypes(phaseTypes),
        eventDao.observeLatestOfTypes(changeoverTypes),
        eventDao.observeLatestOfTypes(downtimeTypes),
    ) { phase, changeover, downtime ->
        WorkStateReducer.fromLatest(phase?.toDomain(), changeover?.toDomain(), downtime?.toDomain())
    }

    override val lastEvent: Flow<ProductionEvent?> = eventDao.observeLatest().map { it?.toDomain() }

    override val pendingCount: Flow<Int> = eventDao.observePendingCount()

    override val failedCount: Flow<Int> = eventDao.observeFailedCount()

    override fun recentProducts(limit: Int): Flow<List<Product>> =
        recordDao.observeRecent(limit).map { list -> list.map { it.toDomain().product } }

    override fun eventsForRecord(recordId: String): Flow<List<ProductionEvent>> =
        eventDao.observeForRecord(recordId).map { list -> list.map { it.toDomain() } }

    override fun eventsSince(from: Instant): Flow<List<ProductionEvent>> =
        eventDao.observeSince(from.toEpochMilli()).map { list -> list.map { it.toDomain() } }

    override suspend fun selectProduct(product: Product): SelectProductResult = db.withTransaction {
        currentState().productChangeBlockReason()?.let { return@withTransaction SelectProductResult.Rejected(it) }
        val current = recordDao.active()
        if (current != null && current.sku == product.sku) {
            return@withTransaction SelectProductResult.Selected(current.toDomain())
        }
        val now = TimeFormats.now(clock)
        val entity = ProductionRecordEntity(
            recordId = UUID.randomUUID().toString(),
            sku = product.sku,
            productName = product.type,
            article = product.article,
            group = product.group,
            // Фаза переноситься з попереднього запису — зазвичай лінія працює в тій самій фазі.
            quantityKg = null,
            phase = current?.phase,
            comment = null,
            createdAt = TimeFormats.toIsoUtc(now),
            createdAtMs = now.toEpochMilli(),
            isActive = true,
        )
        recordDao.deactivateAll()
        recordDao.insert(entity)
        SelectProductResult.Selected(entity.toDomain())
    }

    override suspend fun updateSetup(quantityKg: Double, phase: String, comment: String?) {
        db.withTransaction {
            val record = recordDao.active() ?: return@withTransaction
            // Під час фази змінювати саму фазу не можна — лише кількість / коментар.
            val newPhase = if (currentState().canChangePhase) phase else record.phase
            recordDao.updateSetup(record.recordId, quantityKg, newPhase, comment?.trim()?.ifEmpty { null })
        }
    }

    override suspend fun recordEvent(type: EventType, downtimeReason: String?, comment: String?): RecordEventResult {
        val deviceId = settings.ensureDeviceId()
        val result = db.withTransaction {
            val record = recordDao.active()
                ?: return@withTransaction RecordEventResult.Rejected("Спершу виберіть продукцію")
            val state = currentState()
            val domainRecord = record.toDomain()
            val check = state.check(type, domainRecord.isSetupComplete)
            if (check is TransitionCheck.Denied) return@withTransaction RecordEventResult.Rejected(check.reason)

            val now = TimeFormats.now(clock)
            val duration = if (type.isStart) null else state.active(type.activity)?.elapsedSeconds(now)
            val entity = ProductionEventEntity(
                eventId = UUID.randomUUID().toString(),
                recordId = record.recordId,
                sku = record.sku,
                productName = record.productName,
                article = record.article,
                quantityKg = record.quantityKg,
                phase = record.phase,
                eventType = type.name,
                timestamp = TimeFormats.toIsoUtc(now),
                timestampMs = now.toEpochMilli(),
                durationSeconds = duration,
                downtimeReason = when (type) {
                    EventType.DOWNTIME_START -> downtimeReason
                    EventType.DOWNTIME_END -> state.downtime?.reason
                    else -> null
                },
                comment = comment?.trim()?.ifEmpty { null },
                recordComment = record.comment,
                deviceId = deviceId,
                syncStatus = SyncStatus.PENDING.name,
                createdAt = TimeFormats.toIsoUtc(now),
            )
            val id = eventDao.insert(entity)
            RecordEventResult.Recorded(entity.copy(id = id).toDomain())
        }
        // Подія вже збережена локально — тепер можна пробувати відправити.
        if (result is RecordEventResult.Recorded) syncScheduler.requestSync()
        return result
    }

    override suspend fun updateEventComment(eventId: String, comment: String?) {
        eventDao.updateComment(eventId, comment?.trim()?.ifEmpty { null })
        syncScheduler.requestSync()
    }

    private suspend fun currentState(): WorkState = WorkStateReducer.fromLatest(
        eventDao.latestOfTypes(phaseTypes)?.toDomain(),
        eventDao.latestOfTypes(changeoverTypes)?.toDomain(),
        eventDao.latestOfTypes(downtimeTypes)?.toDomain(),
    )
}
