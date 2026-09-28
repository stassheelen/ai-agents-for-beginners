package ua.prod.timetracker.domain.logic

import ua.prod.timetracker.domain.model.ActiveRecordState
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord

/** Будує стан кожної активної продукції лише з її власних подій (за recordId). */
object RecordStates {

    data class RecordRow(val record: ProductionRecord, val isCollapsed: Boolean)

    fun build(records: List<RecordRow>, events: List<ProductionEvent>): List<ActiveRecordState> {
        val byRecord = events.groupBy { it.recordId }
        return records.map { row ->
            ActiveRecordState(
                record = row.record,
                workState = WorkStateReducer.reduce(byRecord[row.record.recordId].orEmpty()),
                isCollapsed = row.isCollapsed,
            )
        }
    }
}
