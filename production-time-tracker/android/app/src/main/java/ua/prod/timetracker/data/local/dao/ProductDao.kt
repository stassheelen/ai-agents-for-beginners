package ua.prod.timetracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RawQuery
import androidx.room.Transaction
import androidx.sqlite.db.SimpleSQLiteQuery
import androidx.sqlite.db.SupportSQLiteQuery
import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.data.local.entity.ProductEntity

@Dao
abstract class ProductDao {

    @Query("SELECT COUNT(*) FROM products")
    abstract fun observeCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM products")
    abstract suspend fun count(): Int

    @Query("SELECT * FROM products ORDER BY article_key, sku_key LIMIT :limit")
    abstract suspend fun firstProducts(limit: Int): List<ProductEntity>

    @Query("SELECT * FROM products WHERE sku = :sku LIMIT 1")
    abstract suspend fun findBySku(sku: String): ProductEntity?

    @RawQuery
    abstract suspend fun rawSearch(query: SupportSQLiteQuery): List<ProductEntity>

    /**
     * Офлайн-пошук: кожне слово запиту повинно міститися в search_text
     * (search_text = SKU + артикул + артикул без дефісів + вид + група, у нормалізованому вигляді).
     * Тобто фактично: article LIKE %q% OR sku LIKE %q% OR type LIKE %q%.
     */
    suspend fun search(tokens: List<String>, limit: Int): List<ProductEntity> {
        if (tokens.isEmpty()) return firstProducts(limit)
        val where = tokens.joinToString(" AND ") { "search_text LIKE ? ESCAPE '\\'" }
        val args: Array<Any?> = tokens.map { "%" + escapeLike(it) + "%" }.toTypedArray<Any?>()
        val sql = "SELECT * FROM products WHERE $where LIMIT $limit"
        return rawSearch(SimpleSQLiteQuery(sql, args))
    }

    @Query("DELETE FROM products")
    abstract suspend fun deleteAll()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertAll(items: List<ProductEntity>)

    /** Повна заміна довідника в одній транзакції: або новий довідник цілком, або старий без змін. */
    @Transaction
    open suspend fun replaceAll(items: List<ProductEntity>) {
        deleteAll()
        items.chunked(500).forEach { insertAll(it) }
    }

    private fun escapeLike(value: String): String =
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
}
