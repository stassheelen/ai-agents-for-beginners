package ua.prod.timetracker.domain.logic

import ua.prod.timetracker.domain.model.ActiveActivity
import ua.prod.timetracker.domain.model.ActivityKind
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.WorkState

/**
 * Обчислює [WorkState] з подій. Джерело правди — таблиця подій у Room,
 * тому стан коректно відновлюється після перезапуску додатка чи планшета.
 */
object WorkStateReducer {

    /** Стан за останньою подією кожного виду процесу. */
    fun fromLatest(
        latestPhase: ProductionEvent?,
        latestChangeover: ProductionEvent?,
        latestDowntime: ProductionEvent?,
    ): WorkState = WorkState(
        phase = latestPhase.toActive(ActivityKind.PHASE),
        changeover = latestChangeover.toActive(ActivityKind.CHANGEOVER),
        downtime = latestDowntime.toActive(ActivityKind.DOWNTIME),
    )

    /** Стан за повним списком подій (у будь-якому порядку). */
    fun reduce(events: List<ProductionEvent>): WorkState {
        val sorted = events.sortedWith(compareBy<ProductionEvent> { it.timestamp }.thenBy { it.id })
        fun latest(kind: ActivityKind) = sorted.lastOrNull { it.eventType.activity == kind }
        return fromLatest(latest(ActivityKind.PHASE), latest(ActivityKind.CHANGEOVER), latest(ActivityKind.DOWNTIME))
    }

    private fun ProductionEvent?.toActive(kind: ActivityKind): ActiveActivity? {
        if (this == null || eventType.activity != kind || !eventType.isStart) return null
        return ActiveActivity(
            kind = kind,
            startedAt = timestamp,
            startEventId = eventId,
            phase = phase,
            reason = downtimeReason,
        )
    }
}
