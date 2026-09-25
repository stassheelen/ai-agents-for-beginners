package ua.prod.timetracker.domain.model

/** Стан зв'язку та синхронізації для індикатора у верхній панелі. */
data class SyncState(
    val isOnline: Boolean = false,
    val isSyncing: Boolean = false,
    val pendingCount: Int = 0,
    val failedCount: Int = 0,
    val apiConfigured: Boolean = true,
)

/** Результат перевірки бекенду та SharePoint (Налаштування). */
data class ServerStatus(
    val apiOk: Boolean,
    val apiMessage: String,
    val sharePointOk: Boolean?,
    val sharePointMessage: String,
)
