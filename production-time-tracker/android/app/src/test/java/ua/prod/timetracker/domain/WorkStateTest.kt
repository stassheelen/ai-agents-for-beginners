package ua.prod.timetracker.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import ua.prod.timetracker.domain.logic.WorkStateReducer
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.SyncStatus
import ua.prod.timetracker.domain.model.TransitionCheck
import ua.prod.timetracker.domain.model.WorkState
import java.time.Instant

class WorkStateTest {

    private var seq = 0L
    private val t0 = Instant.parse("2026-09-25T11:32:18Z")

    private fun event(type: EventType, offsetSec: Long, reason: String? = null) = ProductionEvent(
        id = ++seq, eventId = "e$seq", recordId = "r1", sku = "000123", productName = "Ковбаса варена",
        article = "A-4587", quantityKg = 125.5, phase = "Фаза 10 — Формування", eventType = type,
        timestamp = t0.plusSeconds(offsetSec), durationSeconds = null, downtimeReason = reason, comment = null,
        recordComment = null, deviceId = "tablet-001", syncStatus = SyncStatus.PENDING, createdAt = t0,
    )

    @Test
    fun `idle state allows only phase start, changeover start and downtime`() {
        val s = WorkState()
        assertTrue(s.isAllowed(EventType.PHASE_START, setupComplete = true))
        assertFalse(s.isAllowed(EventType.PHASE_END, true))
        assertTrue(s.isAllowed(EventType.CHANGEOVER_START, true))
        assertFalse(s.isAllowed(EventType.CHANGEOVER_END, true))
        assertTrue(s.isAllowed(EventType.DOWNTIME_START, true))
        assertFalse(s.isAllowed(EventType.DOWNTIME_END, true))
    }

    @Test
    fun `phase start requires quantity and phase`() {
        val check = WorkState().check(EventType.PHASE_START, setupComplete = false)
        assertEquals(TransitionCheck.Denied("Вкажіть кількість і фазу"), check)
    }

    @Test
    fun `running phase disables start and changeover, enables end`() {
        val s = WorkStateReducer.reduce(listOf(event(EventType.PHASE_START, 0)))
        assertNotNull(s.phase)
        assertFalse(s.isAllowed(EventType.PHASE_START, true))
        assertTrue(s.isAllowed(EventType.PHASE_END, true))
        assertFalse(s.isAllowed(EventType.CHANGEOVER_START, true))
        assertTrue(s.isAllowed(EventType.DOWNTIME_START, true))
        assertEquals("Спершу завершіть фазу", s.productChangeBlockReason())
    }

    @Test
    fun `downtime during phase blocks phase end until downtime ends`() {
        val events = mutableListOf(
            event(EventType.PHASE_START, 0),
            event(EventType.DOWNTIME_START, 60, "Відсутність матеріалу"),
        )
        var s = WorkStateReducer.reduce(events)
        assertEquals("Відсутність матеріалу", s.downtime?.reason)
        assertEquals(TransitionCheck.Denied("Спершу завершіть простій"), s.check(EventType.PHASE_END, true))
        assertFalse(s.isAllowed(EventType.DOWNTIME_START, true))
        events += event(EventType.DOWNTIME_END, 120)
        s = WorkStateReducer.reduce(events)
        assertNull(s.downtime)
        assertTrue(s.isAllowed(EventType.PHASE_END, true))
    }

    @Test
    fun `full operator scenario ends idle`() {
        val events = listOf(
            event(EventType.CHANGEOVER_START, 0),
            event(EventType.CHANGEOVER_END, 900),
            event(EventType.PHASE_START, 1000),
            event(EventType.DOWNTIME_START, 2000, "Поломка обладнання"),
            event(EventType.DOWNTIME_END, 2600),
            event(EventType.PHASE_END, 7000),
        )
        val s = WorkStateReducer.reduce(events.shuffled())
        assertTrue(s.isIdle)
        assertNull(s.productChangeBlockReason())
    }

    @Test
    fun `changeover allows product change but not phase start`() {
        val s = WorkStateReducer.reduce(listOf(event(EventType.CHANGEOVER_START, 0)))
        assertNull(s.productChangeBlockReason())
        assertEquals(TransitionCheck.Denied("Спершу завершіть переналадку"), s.check(EventType.PHASE_START, true))
        assertTrue(s.isAllowed(EventType.CHANGEOVER_END, true))
    }

    @Test
    fun `elapsed seconds are computed from start`() {
        val s = WorkStateReducer.reduce(listOf(event(EventType.PHASE_START, 0)))
        assertEquals(6753L, s.phase!!.elapsedSeconds(t0.plusSeconds(6753)))
    }
}
