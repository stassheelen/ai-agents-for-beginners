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
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.model.WorkState
import ua.prod.timetracker.domain.repository.PhaseRepository
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.RecordEventResult
import ua.prod.timetracker.util.TimeFormats

data class HomeUiState(
    val loaded: Boolean = false,
    val record: ProductionRecord? = null,
    val workState: WorkState = WorkState(),
    val sync: SyncState = SyncState(),
    val lastEvent: ProductionEvent? = null,
    val productCount: Int = 0,
    val phases: List<String> = emptyList(),
) {
    val setupComplete: Boolean get() = record?.isSetupComplete == true

    fun isEnabled(type: EventType): Boolean = record != null && workState.isAllowed(type, setupComplete)
}

/** Коротке підтвердження після натискання: «✓ Фаза розпочата 14:32:18». */
data class Feedback(
    val id: Long,
    val title: String,
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

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _feedback = MutableStateFlow<Feedback?>(null)
    val feedback: StateFlow<Feedback?> = _feedback.asStateFlow()
    private var feedbackJob: Job? = null

    val uiState: StateFlow<HomeUiState> = combine(
        production.activeRecord,
        production.workState,
        syncState,
        production.lastEvent,
        combine(products.count, phases.phases) { count, list -> count to list },
    ) { record, work, sync, last, (count, phaseList) ->
        HomeUiState(
            loaded = true,
            record = record,
            workState = work,
            sync = sync,
            lastEvent = last,
            productCount = count,
            phases = phaseList,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    /** Натискання кнопки: одразу записуємо час, без «Ви впевнені?». */
    fun record(type: EventType, downtimeReason: String? = null, comment: String? = null) {
        if (_busy.value) return
        _busy.value = true
        viewModelScope.launch {
            try {
                when (val result = production.recordEvent(type, downtimeReason, comment)) {
                    is RecordEventResult.Recorded -> {
                        val e = result.event
                        val sync = uiState.value.sync
                        showFeedback(
                            Feedback(
                                id = System.nanoTime(),
                                title = e.eventType.feedbackLabel,
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
                _busy.value = false
            }
        }
    }

    fun saveSetup(quantityKg: Double, phase: String, comment: String?) {
        viewModelScope.launch { production.updateSetup(quantityKg, phase, comment) }
    }

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
