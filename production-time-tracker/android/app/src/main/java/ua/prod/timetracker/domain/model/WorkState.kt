package ua.prod.timetracker.domain.model

import java.time.Duration
import java.time.Instant

/** Активний (розпочатий, але не завершений) процес. */
data class ActiveActivity(
    val kind: ActivityKind,
    val startedAt: Instant,
    val startEventId: String,
    val phase: String? = null,
    val reason: String? = null,
) {
    fun elapsedSeconds(now: Instant): Long = Duration.between(startedAt, now).seconds.coerceAtLeast(0)
}

/** Результат перевірки, чи можна зараз створити подію певного типу. */
sealed interface TransitionCheck {
    data object Allowed : TransitionCheck
    data class Denied(val reason: String) : TransitionCheck
}

/**
 * Стан лінії (планшета), обчислений з останніх подій.
 * Саме тут закладена логіка доступності кнопок — UI лише відображає результат.
 */
data class WorkState(
    val phase: ActiveActivity? = null,
    val changeover: ActiveActivity? = null,
    val downtime: ActiveActivity? = null,
) {
    val isIdle: Boolean get() = phase == null && changeover == null && downtime == null

    fun active(kind: ActivityKind): ActiveActivity? = when (kind) {
        ActivityKind.PHASE -> phase
        ActivityKind.CHANGEOVER -> changeover
        ActivityKind.DOWNTIME -> downtime
    }

    /**
     * Правила послідовностей:
     *  - фазу можна почати, якщо задано кількість і фазу та немає фази / переналадки / простою;
     *  - фазу можна завершити, якщо вона йде і простій не активний;
     *  - переналадка — лише коли фаза не йде;
     *  - простій можна почати будь-коли (під час фази, переналадки або очікування), але не двічі.
     */
    fun check(type: EventType, setupComplete: Boolean): TransitionCheck = when (type) {
        EventType.PHASE_START -> when {
            phase != null -> TransitionCheck.Denied("Фаза вже йде")
            downtime != null -> TransitionCheck.Denied("Спершу завершіть простій")
            changeover != null -> TransitionCheck.Denied("Спершу завершіть переналадку")
            !setupComplete -> TransitionCheck.Denied("Вкажіть кількість і фазу")
            else -> TransitionCheck.Allowed
        }
        EventType.PHASE_END -> when {
            phase == null -> TransitionCheck.Denied("Фаза не розпочата")
            downtime != null -> TransitionCheck.Denied("Спершу завершіть простій")
            else -> TransitionCheck.Allowed
        }
        EventType.CHANGEOVER_START -> when {
            changeover != null -> TransitionCheck.Denied("Переналадка вже йде")
            phase != null -> TransitionCheck.Denied("Спершу завершіть фазу")
            downtime != null -> TransitionCheck.Denied("Спершу завершіть простій")
            else -> TransitionCheck.Allowed
        }
        EventType.CHANGEOVER_END -> when {
            changeover == null -> TransitionCheck.Denied("Переналадка не розпочата")
            downtime != null -> TransitionCheck.Denied("Спершу завершіть простій")
            else -> TransitionCheck.Allowed
        }
        EventType.DOWNTIME_START -> when {
            downtime != null -> TransitionCheck.Denied("Простій уже йде")
            else -> TransitionCheck.Allowed
        }
        EventType.DOWNTIME_END -> when {
            downtime == null -> TransitionCheck.Denied("Простій не активний")
            else -> TransitionCheck.Allowed
        }
    }

    fun isAllowed(type: EventType, setupComplete: Boolean): Boolean =
        check(type, setupComplete) is TransitionCheck.Allowed

    /** Продукцію можна змінити, якщо не йде фаза і немає простою (під час переналадки — можна). */
    fun productChangeBlockReason(): String? = when {
        phase != null -> "Спершу завершіть фазу"
        downtime != null -> "Спершу завершіть простій"
        else -> null
    }

    /** Фазу (довідник фаз) можна змінити лише коли фаза не йде. */
    val canChangePhase: Boolean get() = phase == null
}
