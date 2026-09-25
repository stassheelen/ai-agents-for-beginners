package ua.prod.timetracker.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import ua.prod.timetracker.appContainer

/** PENDING → batch → POST /api/events → SYNCED. Помилка → події лишаються PENDING, повтор пізніше. */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val syncer = applicationContext.appContainer.eventSyncer
        return when (val outcome = syncer.syncPending()) {
            is SyncOutcome.Success -> if (outcome.failed > 0) Result.retry() else Result.success()
            SyncOutcome.NotConfigured -> Result.success()
            is SyncOutcome.Failure -> Result.retry()
        }
    }
}
