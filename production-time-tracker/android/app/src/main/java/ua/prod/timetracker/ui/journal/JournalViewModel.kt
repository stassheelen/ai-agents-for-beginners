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
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.repository.ProductionRepository
import java.time.LocalDate
import java.time.ZoneId

enum class JournalFilter { ACTIVE_PRODUCTS, TODAY }

data class JournalUiState(
    val filter: JournalFilter = JournalFilter.ACTIVE_PRODUCTS,
    val activeCount: Int = 0,
    val events: List<ProductionEvent> = emptyList(),
    val sync: SyncState = SyncState(),
    val loaded: Boolean = false,
)

@OptIn(ExperimentalCoroutinesApi::class)
class JournalViewModel(
    private val production: ProductionRepository,
    syncState: Flow<SyncState>,
) : ViewModel() {

    private val filter = MutableStateFlow(JournalFilter.ACTIVE_PRODUCTS)

    val state: StateFlow<JournalUiState> = filter
        .flatMapLatest { f ->
            val events = when (f) {
                JournalFilter.ACTIVE_PRODUCTS -> production.eventsForActiveRecords()
                JournalFilter.TODAY -> production.eventsSince(
                    LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant(),
                )
            }
            events.map { JournalUiState(filter = f, events = it, loaded = true) }
        }
        .combine(production.activeRecords) { s, records -> s.copy(activeCount = records.size) }
        .combine(syncState) { s, sync -> s.copy(sync = sync) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), JournalUiState())

    fun setFilter(value: JournalFilter) {
        filter.value = value
    }

    fun updateComment(eventId: String, comment: String) {
        viewModelScope.launch { production.updateEventComment(eventId, comment) }
    }
}
