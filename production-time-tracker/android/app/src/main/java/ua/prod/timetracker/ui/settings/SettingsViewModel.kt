package ua.prod.timetracker.ui.settings

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import ua.prod.timetracker.data.repository.ServerStatusRepository
import ua.prod.timetracker.domain.model.ImportParseResult
import ua.prod.timetracker.domain.model.ProductImportReport
import ua.prod.timetracker.domain.model.ServerStatus
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.repository.AppSettings
import ua.prod.timetracker.domain.repository.ProductCatalogSource
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.SettingsRepository
import ua.prod.timetracker.sync.SyncScheduler
import ua.prod.timetracker.util.NumberFormats

sealed interface ImportState {
    data object Idle : ImportState
    data class Loading(val message: String) : ImportState
    data class Preview(val report: ProductImportReport) : ImportState
    data class Done(val message: String, val details: String? = null) : ImportState
    data class Error(val message: String) : ImportState
}

sealed interface ServerCheckState {
    data object Idle : ServerCheckState
    data object Checking : ServerCheckState
    data class Done(val status: ServerStatus) : ServerCheckState
}

data class SettingsUiState(
    val settings: AppSettings? = null,
    val productCount: Int = 0,
    val sync: SyncState = SyncState(),
)

class SettingsViewModel(
    private val settingsRepository: SettingsRepository,
    private val productRepository: ProductRepository,
    private val serverStatus: ServerStatusRepository,
    private val syncScheduler: SyncScheduler,
    private val remoteCatalog: ProductCatalogSource,
    private val fileCatalog: (Uri) -> ProductCatalogSource,
    syncState: Flow<SyncState>,
) : ViewModel() {

    val state: StateFlow<SettingsUiState> = combine(
        settingsRepository.settings,
        productRepository.count,
        syncState,
    ) { settings, count, sync -> SettingsUiState(settings, count, sync) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    private val _import = MutableStateFlow<ImportState>(ImportState.Idle)
    val importState: StateFlow<ImportState> = _import.asStateFlow()

    private val _server = MutableStateFlow<ServerCheckState>(ServerCheckState.Idle)
    val serverState: StateFlow<ServerCheckState> = _server.asStateFlow()

    init {
        checkServer()
    }

    fun setDeviceId(value: String) = launchAndRecheck { settingsRepository.setDeviceId(value) }
    fun setApiUrl(value: String) = launchAndRecheck { settingsRepository.setApiUrl(value) }
    fun setApiKey(value: String) = launchAndRecheck { settingsRepository.setApiKey(value) }

    fun setPhases(text: String) {
        viewModelScope.launch { settingsRepository.setPhases(text.lines()) }
    }

    fun checkServer() {
        viewModelScope.launch {
            _server.value = ServerCheckState.Checking
            _server.value = ServerCheckState.Done(serverStatus.check())
        }
    }

    fun syncNow() {
        syncScheduler.syncNow()
    }

    /** Імпорт CSV/XLSX: прочитати → перевірити → показати звіт → (після підтвердження) зберегти. */
    fun importFile(uri: Uri) = load(fileCatalog(uri), "Читання файлу…")

    /** «Оновити довідник продукції» з сервера (GET /api/products). */
    fun refreshFromServer() = load(remoteCatalog, "Завантаження довідника з сервера…")

    fun confirmImport() {
        val preview = _import.value as? ImportState.Preview ?: return
        val report = preview.report
        val products = report.products
        viewModelScope.launch {
            _import.value = ImportState.Loading("Збереження довідника…")
            _import.value = try {
                productRepository.replaceAll(products)
                ImportState.Done(
                    message = "Довідник оновлено. Завантажено ${NumberFormats.positions(products.size)}.",
                    details = "Усього рядків: ${NumberFormats.grouped(report.totalRows)}\n" +
                        "Імпортовано: ${NumberFormats.grouped(report.importedCount)}\n" +
                        "Помилок: ${NumberFormats.grouped(report.errorCount)}",
                )
            } catch (e: Exception) {
                ImportState.Error("Не вдалося зберегти довідник: ${e.message}")
            }
        }
    }

    fun dismissImport() {
        _import.value = ImportState.Idle
    }

    private fun load(source: ProductCatalogSource, message: String) {
        viewModelScope.launch {
            _import.value = ImportState.Loading(message)
            _import.value = when (val result = source.load()) {
                is ImportParseResult.Success -> ImportState.Preview(result.report)
                is ImportParseResult.Failure -> ImportState.Error(result.message)
            }
        }
    }

    private fun launchAndRecheck(block: suspend () -> Unit) {
        viewModelScope.launch {
            block()
            _server.value = ServerCheckState.Checking
            _server.value = ServerCheckState.Done(serverStatus.check())
            syncScheduler.syncNow()
        }
    }
}
