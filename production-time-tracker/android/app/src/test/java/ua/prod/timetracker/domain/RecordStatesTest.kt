package ua.prod.timetracker.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import ua.prod.timetracker.domain.logic.RecordStates
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncStatus
import java.time.Instant

/** Кілька SKU одночасно: у кожної продукції власна фаза, переналадка й простій. */
class RecordStatesTest {

    private val t0 = Instant.parse("2026-09-28T06:00:00Z")
    private var seq = 0L

    private fun record(id: String, sku: String) = ProductionRecord(
        recordId = id, product = Product(sku, "Продукція $sku", "A-$sku"),
        quantityKg = 100.0, phase = "Фаза 10 — Формування", comment = null, createdAt = t0,
    )

    private fun event(recordId: String, type: EventType, offset: Long) = ProductionEvent(
        id = ++seq, eventId = "e$seq", recordId = recordId, sku = "x", productName = "x", article = "x",
        quantityKg = 100.0, phase = "Фаза 10 — Формування", eventType = type, timestamp = t0.plusSeconds(offset),
        durationSeconds = null, downtimeReason = null, comment = null, recordComment = null,
        deviceId = "tablet-001", syncStatus = SyncStatus.PENDING, createdAt = t0,
    )

    @Test
    fun `each product has its own independent state`() {
        val records = listOf(
            RecordStates.RecordRow(record("r1", "144"), isCollapsed = false),
            RecordStates.RecordRow(record("r2", "102"), isCollapsed = true),
            RecordStates.RecordRow(record("r3", "318"), isCollapsed = true),
        )
        val events = listOf(
            event("r1", EventType.PHASE_START, 0),
            event("r2", EventType.PHASE_START, 10),
            event("r2", EventType.DOWNTIME_START, 20),
        )
        val states = RecordStates.build(records, events)

        val (a, b, c) = states
        // r1: фаза йде, простою немає — можна завершити фазу.
        assertNotNull(a.workState.phase)
        assertNull(a.workState.downtime)
        assertTrue(a.isEnabled(EventType.PHASE_END))
        // r2: простій блокує завершення фази лише для r2.
        assertNotNull(b.workState.downtime)
        assertFalse(b.isEnabled(EventType.PHASE_END))
        assertTrue(b.isCollapsed)
        // r3: нічого не йде — можна почати фазу й прибрати картку.
        assertTrue(c.workState.isIdle)
        assertTrue(c.isEnabled(EventType.PHASE_START))
        assertTrue(c.canClose)
        assertFalse(a.canClose)
        assertEquals(listOf("r1", "r2", "r3"), states.map { it.record.recordId })
    }
}
