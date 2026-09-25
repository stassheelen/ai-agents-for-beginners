package ua.prod.timetracker.data.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import ua.prod.timetracker.domain.repository.PhaseRepository
import ua.prod.timetracker.domain.repository.SettingsRepository

/**
 * Довідник фаз з налаштувань планшета.
 * Щоб отримувати фази з сервера, достатньо додати іншу реалізацію [PhaseRepository].
 */
class SettingsPhaseRepository(private val settings: SettingsRepository) : PhaseRepository {
    override val phases: Flow<List<String>> = settings.settings.map { it.phases }.distinctUntilChanged()

    override suspend fun setPhases(phases: List<String>) = settings.setPhases(phases)
}
