package ua.prod.timetracker.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

class FormatsTest {

    @Test
    fun `timestamps are stored as ISO UTC and shown in local time`() {
        val clock = Clock.fixed(Instant.parse("2026-09-25T11:32:18.734Z"), ZoneOffset.UTC)
        val now = TimeFormats.now(clock)
        assertEquals("2026-09-25T11:32:18Z", TimeFormats.toIsoUtc(now))
        val kyiv = ZoneId.of("Europe/Kyiv")
        assertEquals("14:32:18", TimeFormats.localTime(now, kyiv))
        assertEquals("25.09.2026 14:32:18", TimeFormats.localDateTime(now, kyiv))
    }

    @Test
    fun `duration format`() {
        assertEquals("01:52:33", TimeFormats.duration(6753))
        assertEquals("00:00:00", TimeFormats.duration(-5))
        assertEquals("26:00:01", TimeFormats.duration(26 * 3600 + 1))
    }

    @Test
    fun `quantity and counts`() {
        assertEquals("125.50 кг", NumberFormats.quantityKg(125.5))
        assertEquals("1 245", NumberFormats.grouped(1245))
        assertEquals("1 245 позицій", NumberFormats.positions(1245))
        assertEquals("1 позицію", NumberFormats.positions(1))
        assertEquals("3 позиції", NumberFormats.positions(3))
        assertEquals("11 позицій", NumberFormats.positions(11))
        assertEquals("22 позиції", NumberFormats.positions(22))
    }

    @Test
    fun `quantity keypad input`() {
        var q = QuantityInput()
        "125,505".forEach { q = q.append(it) }
        assertEquals("125.50", q.text)
        assertEquals(125.5, q.value!!, 0.0001)
        assertTrue(q.isValid)
        assertEquals("125.5", q.backspace().text)
        assertEquals("0.", QuantityInput().append('.').text)
        assertFalse(QuantityInput("0").isValid)
        assertNull(QuantityInput().value)
        assertEquals("7", QuantityInput("0").append('7').text)
        assertEquals("125.5", QuantityInput.of(125.5).text)
        assertEquals("125", QuantityInput.of(125.0).text)
    }
}
