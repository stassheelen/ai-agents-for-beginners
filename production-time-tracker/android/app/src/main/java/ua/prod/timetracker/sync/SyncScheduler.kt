package ua.prod.timetracker.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import java.util.concurrent.TimeUnit

/**
 * Планування синхронізації через WorkManager:
 *  - одразу після кожної події (виконається, щойно з'явиться мережа);
 *  - при появі мережі та за кнопкою «Синхронізувати зараз»;
 *  - кожні 15 хвилин як страховка.
 * WorkManager переживає перезапуск додатка й планшета.
 */
class SyncScheduler(context: Context) {

    private val workManager = WorkManager.getInstance(context)

    private val networkConstraint = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    /** true, поки виконується відправка. */
    val isSyncing: Flow<Boolean> = workManager.getWorkInfosByTagFlow(TAG)
        .map { infos -> infos.any { it.state == WorkInfo.State.RUNNING } }
        .distinctUntilChanged()

    /** Після нової події: ставимо в чергу після поточної відправки (якщо вона є). */
    fun requestSync() = enqueue(ExistingWorkPolicy.APPEND_OR_REPLACE)

    /** Негайна спроба (з'явилась мережа / кнопка). Повтор безпечний завдяки eventId. */
    fun syncNow() = enqueue(ExistingWorkPolicy.REPLACE)

    fun schedulePeriodic() {
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(networkConstraint)
            .addTag(TAG)
            .build()
        workManager.enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    private fun enqueue(policy: ExistingWorkPolicy) {
        val request = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(networkConstraint)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .addTag(TAG)
            .build()
        workManager.enqueueUniqueWork(ONE_TIME_WORK, policy, request)
    }

    private companion object {
        const val TAG = "event-sync"
        const val ONE_TIME_WORK = "event-sync-now"
        const val PERIODIC_WORK = "event-sync-periodic"
    }
}
