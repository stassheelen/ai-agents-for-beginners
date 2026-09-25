package ua.prod.timetracker.data.local.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import ua.prod.timetracker.data.local.dao.EventDao
import ua.prod.timetracker.data.local.dao.ProductDao
import ua.prod.timetracker.data.local.dao.RecordDao
import ua.prod.timetracker.data.local.entity.ProductEntity
import ua.prod.timetracker.data.local.entity.ProductionEventEntity
import ua.prod.timetracker.data.local.entity.ProductionRecordEntity

@Database(
    entities = [ProductEntity::class, ProductionEventEntity::class, ProductionRecordEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun eventDao(): EventDao
    abstract fun recordDao(): RecordDao

    companion object {
        /**
         * Навмисно БЕЗ fallbackToDestructiveMigration: події виробництва не можна втрачати.
         * Зміни схеми в майбутніх версіях — лише через явні Migration.
         */
        fun build(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "time_tracker.db").build()
    }
}
