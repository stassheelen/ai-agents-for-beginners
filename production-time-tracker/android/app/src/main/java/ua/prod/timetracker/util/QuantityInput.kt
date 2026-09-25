package ua.prod.timetracker.util

/**
 * Введення кількості з великої цифрової клавіатури (без системної клавіатури).
 * Підтримує крапку або кому, максимум 2 знаки після коми.
 */
data class QuantityInput(val text: String = "") {

    val value: Double? get() = parse(text)

    val isValid: Boolean get() = value?.let { it > 0 && it <= MAX_KG } ?: false

    fun append(ch: Char): QuantityInput {
        val c = if (ch == ',') '.' else ch
        if (c == '.') {
            if (text.contains('.')) return this
            return copy(text = if (text.isEmpty()) "0." else "$text.")
        }
        if (!c.isDigit()) return this
        val dot = text.indexOf('.')
        if (dot >= 0 && text.length - dot - 1 >= 2) return this
        if (dot < 0 && text.length >= MAX_INT_DIGITS) return this
        if (text == "0") return copy(text = c.toString())
        return copy(text = text + c)
    }

    fun backspace(): QuantityInput = copy(text = text.dropLast(1))

    fun clear(): QuantityInput = QuantityInput()

    companion object {
        const val MAX_KG = 100_000.0
        private const val MAX_INT_DIGITS = 6

        fun of(value: Double?): QuantityInput =
            if (value == null) QuantityInput() else QuantityInput(NumberFormats.quantity(value).trimEnd('0').trimEnd('.'))

        fun parse(raw: String): Double? {
            val normalized = raw.trim().replace(',', '.').replace(" ", "")
            if (normalized.isEmpty() || normalized == ".") return null
            return normalized.toDoubleOrNull()
        }
    }
}
