package ua.prod.timetracker.data.repository

import kotlinx.coroutines.CancellationException
import retrofit2.HttpException
import ua.prod.timetracker.data.remote.api.TimeTrackerApi
import ua.prod.timetracker.domain.model.ServerStatus
import ua.prod.timetracker.domain.repository.SettingsRepository
import java.io.IOException

/** Перевірка GET /api/health: чи доступний бекенд і чи має він доступ до SharePoint. */
class ServerStatusRepository(
    private val api: TimeTrackerApi,
    private val settings: SettingsRepository,
) {
    suspend fun check(): ServerStatus {
        val s = settings.current()
        if (s.apiUrl.isBlank()) {
            return ServerStatus(false, "API URL не налаштовано", null, "Невідомо — API не налаштовано")
        }
        return try {
            val health = api.health(TimeTrackerApi.endpoint(s.apiUrl, "/api/health"), s.apiKey.ifBlank { null })
            val sp = health.sharepoint
            ServerStatus(
                apiOk = health.ok,
                apiMessage = if (health.ok) "Доступний" else "Відповідає з помилкою",
                sharePointOk = sp?.ok,
                sharePointMessage = when {
                    sp == null -> "Невідомо"
                    !sp.configured -> "Не налаштовано на сервері"
                    sp.ok -> "Доступний" + (sp.listName?.let { " · список «$it»" } ?: "")
                    else -> "Помилка: ${sp.error ?: "немає доступу"}"
                },
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            val message = when (e.code()) {
                401, 403 -> "Невірний ключ пристрою (${e.code()})"
                404 -> "Не знайдено — перевірте API URL"
                else -> "Помилка ${e.code()}"
            }
            ServerStatus(false, message, null, "Невідомо")
        } catch (e: IOException) {
            ServerStatus(false, "Немає з'єднання", null, "Невідомо")
        } catch (e: Exception) {
            ServerStatus(false, "Неочікувана відповідь сервера", null, "Невідомо")
        }
    }
}
