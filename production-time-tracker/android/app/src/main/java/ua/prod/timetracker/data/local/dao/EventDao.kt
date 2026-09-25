package ua.prod.timetracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.data.local.entity.ProductionEventEntity

@Dao
abstract class EventDao {

    @Insert(onConflict = OnConflictStrategy.ABORT)
    abstract suspend fun insert(event: ProductionEventEntity): Long

    @Query("SELECT * FROM production_events WHERE event_type IN (:types) ORDER BY timestamp_ms DESC, id DESC LIMIT 1")
    abstract fun observeLatestOfTypes(types: List<String>): Flow<ProductionEventEntity?>

    @Query("SELECT * FROM production_events WHERE event_type IN (:types) ORDER BY timestamp_ms DESC, id DESC LIMIT 1")
    abstract suspend fun latestOfTypes(types: List<String>): ProductionEventEntity?

    @Query("SELECT * FROM production_events ORDER BY timestamp_ms DESC, id DESC LIMIT 1")
    abstract fun observeLatest(): Flow<ProductionEventEntity?>

    @Query("SELECT * FROM production_events WHERE record_id = :recordId ORDER BY timestamp_ms DESC, id DESC")
    abstract fun observeForRecord(recordId: String): Flow<List<ProductionEventEntity>>

    @Query("SELECT * FROM production_events WHERE timestamp_ms >= :fromMs ORDER BY timestamp_ms DESC, id DESC")
    abstract fun observeSince(fromMs: Long): Flow<List<ProductionEventEntity>>

    @Query("SELECT COUNT(*) FROM production_events WHERE sync_status = 'PENDING'")
    abstract fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM production_events WHERE sync_status = 'PENDING' AND last_sync_error IS NOT NULL")
    abstract fun observeFailedCount(): Flow<Int>

    @Query("SELECT * FROM production_events WHERE sync_status = 'PENDING' AND id > :afterId ORDER BY id ASC LIMIT :limit")
    abstract suspend fun pendingBatch(afterId: Long, limit: Int): List<ProductionEventEntity>

    @Query(
        "UPDATE production_events SET sync_status = 'SYNCED', synced_at = :syncedAt, last_sync_error = NULL " +
            "WHERE event_id = :eventId AND local_revision = :revision",
    )
    abstract suspend fun markSyncedOne(eventId: String, revision: Int, syncedAt: String)

    /** Позначає відправлені події як SYNCED (лише якщо їх не змінили під час відправки). */
    @Transaction
    open suspend fun markSynced(sent: List<Pair<String, Int>>, syncedAt: String) {
        sent.forEach { (eventId, revision) -> markSyncedOne(eventId, revision, syncedAt) }
    }

    @Query(
        "UPDATE production_events SET sync_attempts = sync_attempts + 1, last_sync_error = :error " +
            "WHERE event_id IN (:eventIds)",
    )
    abstract suspend fun markFailed(eventIds: List<String>, error: String)

    @Query(
        "UPDATE production_events SET comment = :comment, sync_status = 'PENDING', " +
            "local_revision = local_revision + 1 WHERE event_id = :eventId",
    )
    abstract suspend fun updateComment(eventId: String, comment: String?)
}
