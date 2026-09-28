package ua.prod.timetracker.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ua.prod.timetracker.domain.model.ActiveRecordState
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.repository.PhaseRepository
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.RecordEventResult
import ua.prod.timetracker.util.TimeFormats

data class HomeUiState(
    val loaded: Boolean = false,
    val records: List<ActiveRecordState> = emptyList(),
    val sync: SyncState = SyncState(),
    val lastEvent: ProductionEvent? = null,
    val productCount: Int = 0,
    val phases: List<String> = emptyList(),
) {
    fun record(recordId: String): ActiveRecordState? = records.firstOrNull { it.record.recordId == recordId }
}

/** Коротке підтвердження після натискання: «✓ Фаза розпочата 14:32:18». */
data class Feedback(
    val id: Long,
    val title: String,
    val product: String? = null,
    val time: String? = null,
    val duration: String? = null,
    val savedLocallyNote: Boolean = false,
    val isError: Boolean = false,
)

class HomeViewModel(
    private val production: ProductionRepository,
    products: ProductRepository,
    phases: PhaseRepository,
    syncState: Flow<SyncState>,
) : ViewModel() {

    /** recordId, для якого зараз обробляється натискання (захист від подвійного тапу). */
    private val _busy = MutableStateFlow<String?>(null)
    val busy: StateFlow<String?> = _busy.asStateFlow()

    private val _feedback = MutableStateFlow<Feedback?>(null)
    val feedback: StateFlow<Feedback?> = _feedback.asStateFlow()
    private var feedbackJob: Job? = null

    /** Щойно додана продукція без кг / фази — екран одразу відкриває для неї введення. */
    val newlyAddedRecordId: StateFlow<String?> = production.newlyAddedRecordId

    val uiState: StateFlow<HomeUiState> = combine(
        production.activeRecords,
        syncState,
        production.lastEvent,
        products.count,
        phases.phases,
    ) { records, sync, last, count, phaseList ->
        HomeUiState(
            loaded = true,
            records = records,
            sync = sync,
            lastEvent = last,
            productCount = count,
            phases = phaseList,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    /** Натискання кнопки: одразу записуємо час, без «Ви впевнені?». */
    fun record(recordId: String, type: EventType, downtimeReason: String? = null, comment: String? = null) {
        if (_busy.value != null) return
        _busy.value = recordId
        viewModelScope.launch {
            try {
                when (val result = production.recordEvent(recordId, type, downtimeReason, comment)) {
                    is RecordEventResult.Recorded -> {
                        val e = result.event
                        val sync = uiState.value.sync
                        showFeedback(
                            Feedback(
                                id = System.nanoTime(),
                                title = e.eventType.feedbackLabel,
                                product = e.article.ifBlank { e.sku },
                                time = TimeFormats.localTime(e.timestamp),
                                duration = e.durationSeconds?.let { "Тривалість: ${TimeFormats.duration(it)}" },
                                savedLocallyNote = !sync.isOnline || !sync.apiConfigured,
                            ),
                        )
                    }
                    is RecordEventResult.Rejected ->
                        showFeedback(Feedback(id = System.nanoTime(), title = result.reason, isError = true))
                }
            } finally {
                _busy.value = null
            }
        }
    }

    fun saveSetup(recordId: String, quantityKg: Double, phase: String, comment: String?) {
        viewModelScope.launch { production.updateSetup(recordId, quantityKg, phase, comment) }
    }

    fun toggleCollapsed(recordId: String) {
        val collapsed = uiState.value.record(recordId)?.isCollapsed ?: return
        viewModelScope.launch { production.setCollapsed(recordId, !collapsed) }
    }

    fun closeRecord(recordId: String) {
        viewModelScope.launch {
            production.closeRecord(recordId)?.let {
                showFeedback(Feedback(id = System.nanoTime(), title = it, isError = true))
            }
        }
    }

    fun consumeNewlyAdded() = production.consumeNewlyAdded()

    fun dismissFeedback() {
        feedbackJob?.cancel()
        _feedback.value = null
    }

    private fun showFeedback(feedback: Feedback) {
        feedbackJob?.cancel()
        _feedback.value = feedback
        feedbackJob = viewModelScope.launch {
            delay(if (feedback.savedLocallyNote || feedback.isError) 4_000 else 2_500)
            _feedback.value = null
        }
    }
}
