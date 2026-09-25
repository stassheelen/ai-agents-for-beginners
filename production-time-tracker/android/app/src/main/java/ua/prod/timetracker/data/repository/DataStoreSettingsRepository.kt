package ua.prod.timetracker.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import ua.prod.timetracker.domain.repository.AppSettings
import ua.prod.timetracker.domain.repository.SettingsRepository
import java.util.UUID

val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class DataStoreSettingsRepository(
    private val dataStore: DataStore<Preferences>,
    private val defaultApiUrl: String,
) : SettingsRepository {

    override val settings: Flow<AppSettings> = dataStore.data.map { p ->
        AppSettings(
            deviceId = p[DEVICE_ID].orEmpty(),
            apiUrl = p[API_URL] ?: defaultApiUrl,
            apiKey = p[API_KEY].orEmpty(),
            phases = p[PHASES]?.split('\n')?.map { it.trim() }?.filter { it.isNotEmpty() } ?: DEFAULT_PHASES,
            lastSyncAt = p[LAST_SYNC_AT],
            lastSyncError = p[LAST_SYNC_ERROR],
        )
    }

    override suspend fun current(): AppSettings = settings.first()

    override suspend fun ensureDeviceId(): String {
        val existing = current().deviceId
        if (existing.isNotBlank()) return existing
        val generated = "tablet-" + UUID.randomUUID().toString().take(6)
        dataStore.edit { p -> if (p[DEVICE_ID].isNullOrBlank()) p[DEVICE_ID] = generated }
        return current().deviceId
    }

    override suspend fun setDeviceId(value: String) {
        dataStore.edit { it[DEVICE_ID] = value.trim() }
    }

    override suspend fun setApiUrl(value: String) {
        dataStore.edit { it[API_URL] = value.trim().trimEnd('/') }
    }

    override suspend fun setApiKey(value: String) {
        dataStore.edit { it[API_KEY] = value.trim() }
    }

    override suspend fun setPhases(value: List<String>) {
        dataStore.edit { it[PHASES] = value.map { p -> p.trim() }.filter { p -> p.isNotEmpty() }.joinToString("\n") }
    }

    override suspend fun setSyncResult(at: String?, error: String?) {
        dataStore.edit { p ->
            if (at != null) p[LAST_SYNC_AT] = at
            if (error == null) p.remove(LAST_SYNC_ERROR) else p[LAST_SYNC_ERROR] = error
        }
    }

    companion object {
        private val DEVICE_ID = stringPreferencesKey("device_id")
        private val API_URL = stringPreferencesKey("api_url")
        private val API_KEY = stringPreferencesKey("api_key")
        private val PHASES = stringPreferencesKey("phases")
        private val LAST_SYNC_AT = stringPreferencesKey("last_sync_at")
        private val LAST_SYNC_ERROR = stringPreferencesKey("last_sync_error")

        val DEFAULT_PHASES = listOf(
            "Фаза 10 — Формування",
            "Фаза 20 — Термообробка",
            "Фаза 30 — Охолодження",
            "Фаза 40 — Пакування",
        )
    }
}
