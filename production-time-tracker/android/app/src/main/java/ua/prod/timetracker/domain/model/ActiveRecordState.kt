package ua.prod.timetracker.domain.model

/**
 * Одна продукція на екрані: запис (SKU, кг, фаза), її власний стан кнопок і чи згорнута картка.
 * Кожна продукція має незалежні фазу, переналадку, простій і таймери.
 */
data class ActiveRecordState(
    val record: ProductionRecord,
    val workState: WorkState,
    val isCollapsed: Boolean,
) {
    val setupComplete: Boolean get() = record.isSetupComplete

    fun isEnabled(type: EventType): Boolean = workState.isAllowed(type, setupComplete)

    /** Картку можна прибрати з екрана, коли по ній нічого не йде. */
    val canClose: Boolean get() = workState.isIdle
}
