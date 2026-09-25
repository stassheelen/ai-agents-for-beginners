package ua.prod.timetracker.sync

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import ua.prod.timetracker.data.local.dao.EventDao
import ua.prod.timetracker.data.local.entity.ProductionEventEntity
import ua.prod.timetracker.data.remote.api.TimeTrackerApi
import ua.prod.timetracker.data.remote.dto.EventBatchRequestDto
import ua.prod.timetracker.data.remote.dto.EventDto
import ua.prod.timetracker.domain.repository.SettingsRepository
import ua.prod.timetracker.util.TimeFormats
import java.io.IOException
import java.time.Clock

sealed interface SyncOutcome {
    data class Success(val sent: Int, val failed: Int) : SyncOutcome
    data object NotConfigured : SyncOutcome
    data class Failure(val message: String) : SyncOutcome
}

/**
 * Відправляє PENDING-події пакетами до [BATCH_SIZE] штук.
 * Сервер використовує eventId як ключ ідемпотентності, тому повторна відправка
 * (наприклад, якщо відповідь загубилась) не створює дублів.
 */
class EventSyncer(
    private val eventDao: EventDao,
    private val api: TimeTrackerApi,
    private val settings: SettingsRepository,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val mutex = Mutex()

    suspend fun syncPending(): SyncOutcome = mutex.withLock {
        val s = settings.current()
        if (s.apiUrl.isBlank()) return SyncOutcome.NotConfigured
        val url = TimeTrackerApi.endpoint(s.apiUrl, "/api/events")
        val apiKey = s.apiKey.ifBlank { null }

        var afterId = 0L
        var sent = 0
        var failed = 0
        while (true) {
            val batch = eventDao.pendingBatch(afterId, BATCH_SIZE)
            if (batch.isEmpty()) break
            afterId = batch.last().id

            val response = try {
                api.postEvents(url, apiKey, EventBatchRequestDto(batch.map { it.toDto() }))
            } catch (e: HttpException) {
                return fail(batch, httpMessage(e.code()))
            } catch (e: IOException) {
                return fail(batch, "Немає з'єднання з сервером")
            } catch (e: SerializationException) {
                return fail(batch, "Неочікувана відповідь сервера")
            }

            val byId = response.results.associateBy { it.eventId }
            val ok = batch.filter { byId[it.eventId]?.status in SUCCESS_STATUSES }
            val notOk = batch - ok.toSet()
            if (ok.isNotEmpty()) {
                eventDao.markSynced(ok.map { it.eventId to it.localRevision }, TimeFormats.toIsoUtc(TimeFormats.now(clock)))
                sent += ok.size
            }
            if (notOk.isNotEmpty()) {
                notOk.groupBy { byId[it.eventId]?.error ?: "Сервер не підтвердив подію" }
                    .forEach { (error, events) -> eventDao.markFailed(events.map { it.eventId }, error) }
                failed += notOk.size
            }
        }
        val error = if (failed > 0) "Не відправлено подій: $failed" else null
        settings.setSyncResult(TimeFormats.toIsoUtc(TimeFormats.now(clock)), error)
        SyncOutcome.Success(sent, failed)
    }

    private suspend fun fail(batch: List<ProductionEventEntity>, message: String): SyncOutcome {
        eventDao.markFailed(batch.map { it.eventId }, message)
        settings.setSyncResult(at = null, error = message)
        return SyncOutcome.Failure(message)
    }

    private fun httpMessage(code: Int): String = when (code) {
        401, 403 -> "Сервер відхилив ключ пристрою ($code)"
        404 -> "API не знайдено — перевірте API URL"
        in 500..599 -> "Сервер або SharePoint недоступний ($code)"
        else -> "Помилка сервера ($code)"
    }

    private companion object {
        const val BATCH_SIZE = 100
        val SUCCESS_STATUSES = setOf("created", "duplicate", "updated")
    }
}

fun ProductionEventEntity.toDto(): EventDto = EventDto(
    eventId = eventId,
    recordId = recordId,
    sku = sku,
    productName = productName,
    article = article,
    quantityKg = quantityKg,
    phase = phase,
    eventType = eventType,
    timestamp = timestamp,
    durationSeconds = durationSeconds,
    downtimeReason = downtimeReason,
    comment = comment,
    recordComment = recordComment,
    deviceId = deviceId,
    createdAt = createdAt,
)
