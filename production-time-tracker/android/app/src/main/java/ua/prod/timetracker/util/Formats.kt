package ua.prod.timetracker.util

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/** Час: у базі та на сервері — ISO 8601 UTC, на екрані — локальний час планшета. */
object TimeFormats {
    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")
    private val dateTimeFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")
    private val dateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

    /** Поточний момент, округлений до секунди (як у прикладі 2026-09-25T11:32:18Z). */
    fun now(clock: Clock): Instant = Instant.now(clock).truncatedTo(ChronoUnit.SECONDS)

    fun toIsoUtc(instant: Instant): String = DateTimeFormatter.ISO_INSTANT.format(instant)

    fun parseIso(value: String): Instant = Instant.parse(value)

    fun localTime(instant: Instant, zone: ZoneId = ZoneId.systemDefault()): String =
        timeFormatter.format(instant.atZone(zone))

    fun localDateTime(instant: Instant, zone: ZoneId = ZoneId.systemDefault()): String =
        dateTimeFormatter.format(instant.atZone(zone))

    fun localDate(instant: Instant, zone: ZoneId = ZoneId.systemDefault()): String =
        dateFormatter.format(instant.atZone(zone))

    /** Тривалість у форматі ГГ:ХХ:СС (години можуть перевищувати 24). */
    fun duration(totalSeconds: Long): String {
        val s = totalSeconds.coerceAtLeast(0)
        return "%02d:%02d:%02d".format(s / 3600, (s % 3600) / 60, s % 60)
    }
}

object NumberFormats {
    private const val NBSP = ' '

    /** 125.5 → «125.50 кг». */
    fun quantityKg(value: Double): String = "${quantity(value)} кг"

    fun quantity(value: Double): String =
        BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).toPlainString()

    /** 1245 → «1 245» (нерозривний пробіл між тисячами). */
    fun grouped(value: Int): String {
        val digits = kotlin.math.abs(value.toLong()).toString()
        val grouped = digits.reversed().chunked(3).joinToString(NBSP.toString()).reversed()
        return if (value < 0) "-$grouped" else grouped
    }

    /** Українська множина: 1 позицію, 2 позиції, 5 позицій. */
    fun plural(n: Int, one: String, few: String, many: String): String {
        val mod100 = n % 100
        val mod10 = n % 10
        return when {
            mod100 in 11..14 -> many
            mod10 == 1 -> one
            mod10 in 2..4 -> few
            else -> many
        }
    }

    fun positions(n: Int): String = "${grouped(n)} ${plural(n, "позицію", "позиції", "позицій")}"
}
