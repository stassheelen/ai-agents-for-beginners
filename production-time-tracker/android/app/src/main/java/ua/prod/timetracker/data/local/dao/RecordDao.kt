package ua.prod.timetracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity

@Dao
abstract class RecordDao {

    /** Уся продукція, з якою зараз працює лінія (кілька SKU одночасно). */
    @Query("SELECT * FROM production_records WHERE is_active = 1 ORDER BY id ASC")
    abstract fun observeActiveList(): Flow<List<ProductionRecordEntity>>

    @Query("SELECT * FROM production_records WHERE record_id = :recordId LIMIT 1")
    abstract suspend fun byRecordId(recordId: String): ProductionRecordEntity?

    @Query("SELECT * FROM production_records WHERE is_active = 1 AND sku = :sku ORDER BY id DESC LIMIT 1")
    abstract suspend fun activeBySku(sku: String): ProductionRecordEntity?

    @Query("SELECT * FROM production_records WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    abstract suspend fun latestActive(): ProductionRecordEntity?

    @Insert
    abstract suspend fun insert(record: ProductionRecordEntity): Long

    @Query("UPDATE production_records SET is_active = 0 WHERE record_id = :recordId")
    abstract suspend fun deactivate(recordId: String)

    @Query("UPDATE production_records SET is_collapsed = :collapsed WHERE record_id = :recordId")
    abstract suspend fun setCollapsed(recordId: String, collapsed: Boolean)

    @Query("UPDATE production_records SET is_collapsed = 1 WHERE is_active = 1 AND record_id != :recordId")
    abstract suspend fun collapseAllExcept(recordId: String)

    /** Розгорнути одну картку, решту згорнути. */
    @Transaction
    open suspend fun focus(recordId: String) {
        collapseAllExcept(recordId)
        setCollapsed(recordId, false)
    }

    @Query(
        "UPDATE production_records SET quantity_kg = :quantityKg, phase = :phase, comment = :comment " +
            "WHERE record_id = :recordId",
    )
    abstract suspend fun updateSetup(recordId: String, quantityKg: Double?, phase: String?, comment: String?)

    /** Нещодавно вибрана продукція (остання поява кожного SKU). */
    @Query(
        "SELECT * FROM production_records WHERE id IN " +
            "(SELECT MAX(id) FROM production_records GROUP BY sku) ORDER BY id DESC LIMIT :limit",
    )
    abstract fun observeRecent(limit: Int): Flow<List<ProductionRecordEntity>>
}
