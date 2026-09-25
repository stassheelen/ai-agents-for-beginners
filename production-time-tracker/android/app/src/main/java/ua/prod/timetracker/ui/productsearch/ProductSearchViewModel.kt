package ua.prod.timetracker.ui.productsearch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.SelectProductResult

data class SearchUiState(
    val query: String = "",
    val results: List<Product> = emptyList(),
    val totalProducts: Int = 0,
    val loaded: Boolean = false,
)

sealed interface SearchEvent {
    data object Selected : SearchEvent
    data class Error(val message: String) : SearchEvent
}

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class ProductSearchViewModel(
    private val products: ProductRepository,
    private val production: ProductionRepository,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _events = MutableSharedFlow<SearchEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<SearchEvent> = _events.asSharedFlow()

    /** Пошук без перезавантаження екрана: кожна зміна тексту → локальний запит у Room. */
    val state: StateFlow<SearchUiState> = combine(_query.debounce(120), products.count) { q, count -> q to count }
        .mapLatest { (q, count) ->
            SearchUiState(query = q, results = products.search(q, RESULT_LIMIT), totalProducts = count, loaded = true)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SearchUiState())

    val recent: StateFlow<List<Product>> = production.recentProducts(6)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun onQueryChange(value: String) {
        _query.value = value
    }

    fun select(product: Product) {
        viewModelScope.launch {
            when (val result = production.selectProduct(product)) {
                is SelectProductResult.Selected -> _events.emit(SearchEvent.Selected)
                is SelectProductResult.Rejected -> _events.emit(SearchEvent.Error(result.reason))
            }
        }
    }

    private companion object {
        const val RESULT_LIMIT = 200
    }
}
