package ua.prod.timetracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity

@Dao
abstract class RecordDao {

    @Query("SELECT * FROM production_records WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    abstract fun observeActive(): Flow<ProductionRecordEntity?>

    @Query("SELECT * FROM production_records WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    abstract suspend fun active(): ProductionRecordEntity?

    @Query("UPDATE production_records SET is_active = 0 WHERE is_active = 1")
    abstract suspend fun deactivateAll()

    @Insert
    abstract suspend fun insert(record: ProductionRecordEntity): Long

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
