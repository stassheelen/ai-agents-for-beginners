package ua.prod.timetracker.data.repository

import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import ua.prod.timetracker.data.local.database.AppDatabase
import ua.prod.timetracker.data.local.entity.ProductionEventEntity
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity
import ua.prod.timetracker.data.local.toDomain
import ua.prod.timetracker.domain.logic.RecordStates
import ua.prod.timetracker.domain.logic.WorkStateReducer
import ua.prod.timetracker.domain.model.ActiveRecordState
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncStatus
import ua.prod.timetracker.domain.model.TransitionCheck
import ua.prod.timetracker.domain.model.WorkState
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.RecordEventResult
import ua.prod.timetracker.domain.repository.SettingsRepository
import ua.prod.timetracker.sync.SyncScheduler
import ua.prod.timetracker.util.TimeFormats
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * Серце офлайн-логіки:
 * натискання → timestamp → Room (PENDING) → результат оператору → спроба синхронізації.
 *
 * На екрані може бути кілька продукцій (SKU) одночасно; стан кнопок кожної обчислюється
 * лише з її власних подій (recordId), тож фази, переналадки й простої різних SKU незалежні.
 */
class RoomProductionRepository(
    private val db: AppDatabase,
    private val settings: SettingsRepository,
    private val syncScheduler: SyncScheduler,
    private val clock: Clock = Clock.systemUTC(),
) : ProductionRepository {

    private val eventDao = db.eventDao()
    private val recordDao = db.recordDao()

    override val activeRecords: Flow<List<ActiveRecordState>> = combine(
        recordDao.observeActiveList(),
        eventDao.observeForActiveRecords(),
    ) { records, events ->
        RecordStates.build(
            records.map { RecordStates.RecordRow(it.toDomain(), it.isCollapsed) },
            events.map { it.toDomain() },
        )
    }

    override val lastEvent: Flow<ProductionEvent?> = eventDao.observeLatest().map { it?.toDomain() }

    override val pendingCount: Flow<Int> = eventDao.observePendingCount()

    override val failedCount: Flow<Int> = eventDao.observeFailedCount()

    private val _newlyAdded = MutableStateFlow<String?>(null)
    override val newlyAddedRecordId: StateFlow<String?> = _newlyAdded.asStateFlow()

    override fun consumeNewlyAdded() {
        _newlyAdded.value = null
    }

    override fun recentProducts(limit: Int): Flow<List<Product>> =
        recordDao.observeRecent(limit).map { list -> list.map { it.toDomain().product } }

    override fun eventsForActiveRecords(): Flow<List<ProductionEvent>> =
        eventDao.observeForActiveRecords().map { list -> list.map { it.toDomain() }.reversed() }

    override fun eventsSince(from: Instant): Flow<List<ProductionEvent>> =
        eventDao.observeSince(from.toEpochMilli()).map { list -> list.map { it.toDomain() } }

    override suspend fun addProduct(product: Product): ProductionRecord {
        val record = db.withTransaction {
            recordDao.activeBySku(product.sku)?.let { existing ->
                recordDao.focus(existing.recordId)
                return@withTransaction existing.toDomain()
            }
            val now = TimeFormats.now(clock)
            // Фаза підставляється з останньої доданої продукції — зазвичай лінія працює в тій самій фазі.
            val previous = recordDao.latestActive()
            val entity = ProductionRecordEntity(
                recordId = UUID.randomUUID().toString(),
                sku = product.sku,
                productName = product.type,
                article = product.article,
                group = product.group,
                quantityKg = null,
                phase = previous?.phase,
                comment = null,
                createdAt = TimeFormats.toIsoUtc(now),
                createdAtMs = now.toEpochMilli(),
                isActive = true,
                isCollapsed = false,
            )
            recordDao.insert(entity)
            recordDao.focus(entity.recordId)
            entity.toDomain()
        }
        if (!record.isSetupComplete) _newlyAdded.value = record.recordId
        return record
    }

    override suspend fun updateSetup(recordId: String, quantityKg: Double, phase: String, comment: String?) {
        db.withTransaction {
            val record = recordDao.byRecordId(recordId) ?: return@withTransaction
            // Під час фази змінювати саму фазу не можна — лише кількість / коментар.
            val newPhase = if (stateOf(recordId).canChangePhase) phase else record.phase
            recordDao.updateSetup(recordId, quantityKg, newPhase, comment?.trim()?.ifEmpty { null })
        }
    }

    override suspend fun setCollapsed(recordId: String, collapsed: Boolean) {
        recordDao.setCollapsed(recordId, collapsed)
    }

    override suspend fun closeRecord(recordId: String): String? = db.withTransaction {
        val state = stateOf(recordId)
        when {
            state.phase != null -> "Спершу завершіть фазу"
            state.downtime != null -> "Спершу завершіть простій"
            state.changeover != null -> "Спершу завершіть переналадку"
            else -> {
                recordDao.deactivate(recordId)
                null
            }
        }
    }

    override suspend fun recordEvent(
        recordId: String,
        type: EventType,
        downtimeReason: String?,
        comment: String?,
    ): RecordEventResult {
        val deviceId = settings.ensureDeviceId()
        val result = db.withTransaction {
            val record = recordDao.byRecordId(recordId)?.takeIf { it.isActive }
                ?: return@withTransaction RecordEventResult.Rejected("Продукцію не знайдено")
            val state = stateOf(recordId)
            val check = state.check(type, record.toDomain().isSetupComplete)
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

    private suspend fun stateOf(recordId: String): WorkState =
        WorkStateReducer.reduce(eventDao.eventsForRecord(recordId).map { it.toDomain() })
}
