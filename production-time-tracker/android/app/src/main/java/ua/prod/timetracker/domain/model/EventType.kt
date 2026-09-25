package ua.prod.timetracker.domain.model

/** Вид процесу, який може бути активним: фаза, переналадка або простій. */
enum class ActivityKind { PHASE, CHANGEOVER, DOWNTIME }

/** Типи подій. Назви констант збігаються з кодами, що відправляються на сервер. */
enum class EventType(
    val activity: ActivityKind,
    val isStart: Boolean,
    /** Підпис у журналі. */
    val journalLabel: String,
    /** Коротке підтвердження після натискання кнопки. */
    val feedbackLabel: String,
) {
    PHASE_START(ActivityKind.PHASE, true, "Фаза — початок", "Фаза розпочата"),
    PHASE_END(ActivityKind.PHASE, false, "Фаза — кінець", "Фаза завершена"),
    CHANGEOVER_START(ActivityKind.CHANGEOVER, true, "Переналадка — початок", "Переналадку розпочато"),
    CHANGEOVER_END(ActivityKind.CHANGEOVER, false, "Переналадка — кінець", "Переналадку завершено"),
    DOWNTIME_START(ActivityKind.DOWNTIME, true, "Простій — початок", "Простій розпочато"),
    DOWNTIME_END(ActivityKind.DOWNTIME, false, "Простій — кінець", "Простій завершено");

    companion object {
        fun ofActivity(kind: ActivityKind): List<EventType> = entries.filter { it.activity == kind }

        fun fromCode(code: String): EventType? = entries.firstOrNull { it.name == code }
    }
}

enum class SyncStatus { PENDING, SYNCED }

/** Причини простою. У подію та SharePoint записується зрозумілий підпис. */
enum class DowntimeReason(val label: String) {
    NO_MATERIAL("Відсутність матеріалу"),
    EQUIPMENT_FAILURE("Поломка обладнання"),
    SETUP("Налаштування"),
    NO_OPERATOR("Відсутність оператора"),
    WAITING("Очікування"),
    SANITATION("Санітарія"),
    OTHER("Інше"),
}
