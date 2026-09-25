package ua.prod.timetracker.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ua.prod.timetracker.di.AppContainer
import ua.prod.timetracker.ui.home.HomeScreen
import ua.prod.timetracker.ui.home.HomeViewModel
import ua.prod.timetracker.ui.journal.JournalScreen
import ua.prod.timetracker.ui.journal.JournalViewModel
import ua.prod.timetracker.ui.productsearch.ProductSearchScreen
import ua.prod.timetracker.ui.productsearch.ProductSearchViewModel
import ua.prod.timetracker.ui.settings.SettingsScreen
import ua.prod.timetracker.ui.settings.SettingsViewModel
import ua.prod.timetracker.ui.theme.Palette

private object Routes {
    const val HOME = "home"
    const val SEARCH = "search"
    const val JOURNAL = "journal"
    const val SETTINGS = "settings"
}

private fun AppContainer.createViewModelFactory(): ViewModelProvider.Factory = viewModelFactory {
    initializer { HomeViewModel(productionRepository, productRepository, phaseRepository, syncState) }
    initializer { ProductSearchViewModel(productRepository, productionRepository) }
    initializer { JournalViewModel(productionRepository, syncState) }
    initializer {
        SettingsViewModel(
            settingsRepository = settingsRepository,
            productRepository = productRepository,
            serverStatus = serverStatusRepository,
            syncScheduler = syncScheduler,
            remoteCatalog = remoteCatalogSource,
            fileCatalog = { uri -> fileCatalogSource(uri) },
            catalogBootstrapper = catalogBootstrapper,
            syncState = syncState,
        )
    }
}

@Composable
fun AppNavHost(container: AppContainer) {
    val navController = rememberNavController()
    val factory = remember(container) { container.createViewModelFactory() }

    NavHost(
        navController = navController,
        startDestination = Routes.HOME,
        modifier = Modifier
            .fillMaxSize()
            .background(Palette.Background)
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        composable(Routes.HOME) {
            HomeScreen(
                viewModel = viewModel(factory = factory),
                onSelectProduct = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                onOpenJournal = { navController.navigate(Routes.JOURNAL) { launchSingleTop = true } },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
            )
        }
        composable(Routes.SEARCH) {
            ProductSearchScreen(
                viewModel = viewModel(factory = factory),
                onSelected = { navController.popBackStack(Routes.HOME, inclusive = false) },
                onBack = { navController.popBackStack() },
            )
        }
        composable(Routes.JOURNAL) {
            JournalScreen(viewModel = viewModel(factory = factory), onBack = { navController.popBackStack() })
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(viewModel = viewModel(factory = factory), onBack = { navController.popBackStack() })
        }
    }
}
