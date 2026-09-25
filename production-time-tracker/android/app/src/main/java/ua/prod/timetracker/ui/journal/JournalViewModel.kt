package ua.prod.timetracker.ui.journal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.repository.ProductionRepository
import java.time.LocalDate
import java.time.ZoneId

enum class JournalFilter { CURRENT_PRODUCT, TODAY }

data class JournalUiState(
    val filter: JournalFilter = JournalFilter.CURRENT_PRODUCT,
    val record: ProductionRecord? = null,
    val events: List<ProductionEvent> = emptyList(),
    val sync: SyncState = SyncState(),
    val loaded: Boolean = false,
)

@OptIn(ExperimentalCoroutinesApi::class)
class JournalViewModel(
    private val production: ProductionRepository,
    syncState: Flow<SyncState>,
) : ViewModel() {

    private val filter = MutableStateFlow(JournalFilter.CURRENT_PRODUCT)

    val state: StateFlow<JournalUiState> = combine(filter, production.activeRecord) { f, record -> f to record }
        .flatMapLatest { (f, record) ->
            val events = when (f) {
                JournalFilter.CURRENT_PRODUCT ->
                    record?.let { production.eventsForRecord(it.recordId) } ?: flowOf(emptyList())
                JournalFilter.TODAY -> production.eventsSince(
                    LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                )
            }
            events.map { JournalUiState(filter = f, record = record, events = it, loaded = true) }
        }
        .combine(syncState) { s, sync -> s.copy(sync = sync) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), JournalUiState())

    fun setFilter(value: JournalFilter) {
        filter.value = value
    }

    fun updateComment(eventId: String, comment: String) {
        viewModelScope.launch { production.updateEventComment(eventId, comment) }
    }
}
