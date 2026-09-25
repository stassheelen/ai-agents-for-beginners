package ua.prod.timetracker.di

import android.app.Application
import android.net.Uri
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import ua.prod.timetracker.BuildConfig
import ua.prod.timetracker.data.local.database.AppDatabase
import ua.prod.timetracker.data.remote.api.TimeTrackerApi
import ua.prod.timetracker.data.repository.BundledProductCatalogSource
import ua.prod.timetracker.data.repository.CatalogBootstrapper
import ua.prod.timetracker.data.repository.DataStoreSettingsRepository
import ua.prod.timetracker.data.repository.FileProductCatalogSource
import ua.prod.timetracker.data.repository.RemoteProductCatalogSource
import ua.prod.timetracker.data.repository.RoomProductRepository
import ua.prod.timetracker.data.repository.RoomProductionRepository
import ua.prod.timetracker.data.repository.ServerStatusRepository
import ua.prod.timetracker.data.repository.SettingsPhaseRepository
import ua.prod.timetracker.data.repository.settingsDataStore
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.repository.PhaseRepository
import ua.prod.timetracker.domain.repository.ProductCatalogSource
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.domain.repository.ProductionRepository
import ua.prod.timetracker.domain.repository.SettingsRepository
import ua.prod.timetracker.sync.EventSyncer
import ua.prod.timetracker.sync.NetworkMonitor
import ua.prod.timetracker.sync.SyncScheduler
import java.util.concurrent.TimeUnit

/**
 * Ручний DI-контейнер: один екземпляр на додаток.
 * Простий і прозорий для MVP; за потреби легко замінюється на Hilt.
 */
class AppContainer(private val app: Application) {

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = true
        encodeDefaults = true
    }

    val database: AppDatabase by lazy { AppDatabase.build(app) }

    val settingsRepository: SettingsRepository by lazy {
        DataStoreSettingsRepository(app.settingsDataStore, BuildConfig.DEFAULT_API_URL)
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BASIC
                            redactHeader(TimeTrackerApi.API_KEY_HEADER)
                        },
                    )
                }
            }
            .build()
    }

    val api: TimeTrackerApi by lazy {
        Retrofit.Builder()
            // Фактична адреса підставляється через @Url з налаштувань.
            .baseUrl("https://localhost/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(TimeTrackerApi::class.java)
    }

    val networkMonitor: NetworkMonitor by lazy { NetworkMonitor(app, appScope) }

    val syncScheduler: SyncScheduler by lazy { SyncScheduler(app) }

    val productRepository: ProductRepository by lazy { RoomProductRepository(database.productDao()) }

    val phaseRepository: PhaseRepository by lazy { SettingsPhaseRepository(settingsRepository) }

    val productionRepository: ProductionRepository by lazy {
        RoomProductionRepository(database, settingsRepository, syncScheduler)
    }

    val eventSyncer: EventSyncer by lazy { EventSyncer(database.eventDao(), api, settingsRepository) }

    val catalogBootstrapper: CatalogBootstrapper by lazy {
        CatalogBootstrapper(productRepository, settingsRepository, BundledProductCatalogSource(app.assets))
    }

    val remoteCatalogSource: ProductCatalogSource by lazy { RemoteProductCatalogSource(api, settingsRepository) }

    val serverStatusRepository: ServerStatusRepository by lazy { ServerStatusRepository(api, settingsRepository) }

    /** Онлайн/офлайн + відправка + кількість подій у черзі — для верхньої панелі всіх екранів. */
    val syncState: Flow<SyncState> by lazy {
        combine(
            networkMonitor.isOnline,
            syncScheduler.isSyncing,
            productionRepository.pendingCount,
            productionRepository.failedCount,
            settingsRepository.settings.map { it.apiUrl.isNotBlank() }.distinctUntilChanged(),
        ) { online, syncing, pending, failed, configured ->
            SyncState(online, syncing, pending, failed, configured)
        }
    }

    fun fileCatalogSource(uri: Uri): ProductCatalogSource = FileProductCatalogSource(app.contentResolver, uri)

    fun start() {
        syncScheduler.schedulePeriodic()
        appScope.launch { settingsRepository.ensureDeviceId() }
        // Вшитий довідник: при першому запуску довідник уже готовий, імпорт не потрібен.
        appScope.launch { catalogBootstrapper.ensureCatalog() }
        // З'явився інтернет → одразу відправляємо накопичені події.
        appScope.launch {
            networkMonitor.isOnline.filter { it }.collect { syncScheduler.syncNow() }
        }
    }
}
