package ua.prod.timetracker.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ua.prod.timetracker.BuildConfig
import ua.prod.timetracker.domain.model.ProductImportReport
import ua.prod.timetracker.ui.components.AppCard
import ua.prod.timetracker.ui.components.AppDialog
import ua.prod.timetracker.ui.components.AppTopBar
import ua.prod.timetracker.ui.components.Dot
import ua.prod.timetracker.ui.components.PrimaryButton
import ua.prod.timetracker.ui.components.SecondaryButton
import ua.prod.timetracker.ui.components.SectionTitle
import ua.prod.timetracker.ui.components.TextInputDialog
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.theme.Palette
import ua.prod.timetracker.util.NumberFormats
import ua.prod.timetracker.util.TimeFormats

private enum class EditField { DEVICE_ID, API_URL, API_KEY, PHASES }

private val IMPORT_MIME_TYPES = arrayOf(
    "text/csv",
    "text/comma-separated-values",
    "text/plain",
    "application/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
)

@Composable
fun SettingsScreen(viewModel: SettingsViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val importState by viewModel.importState.collectAsStateWithLifecycle()
    val serverState by viewModel.serverState.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf<EditField?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) viewModel.importFile(uri)
    }
    val settings = state.settings

    Column(Modifier.fillMaxSize()) {
        AppTopBar(title = "Налаштування", syncState = state.sync, onBack = onBack)
        if (settings == null) return@Column
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val wide = maxWidth >= 800.dp
            val left = @Composable { m: Modifier ->
                Column(m, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    AppCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Пристрій і сервер")
                        SettingRow("Device ID", settings.deviceId.ifBlank { "—" }) { editing = EditField.DEVICE_ID }
                        HorizontalDivider(color = Palette.Separator)
                        SettingRow("API URL", settings.apiUrl.ifBlank { "Не налаштовано" }) { editing = EditField.API_URL }
                        HorizontalDivider(color = Palette.Separator)
                        SettingRow("Ключ пристрою", if (settings.apiKey.isBlank()) "Не задано" else "••••••••") {
                            editing = EditField.API_KEY
                        }
                    }
                    AppCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Стан зв'язку")
                        val check = serverState
                        when (check) {
                            ServerCheckState.Idle, ServerCheckState.Checking -> {
                                StatusLine("Статус API", null, "Перевірка…")
                                StatusLine("Статус SharePoint", null, "Перевірка…")
                            }
                            is ServerCheckState.Done -> {
                                StatusLine("Статус API", check.status.apiOk, check.status.apiMessage)
                                StatusLine("Статус SharePoint", check.status.sharePointOk, check.status.sharePointMessage)
                            }
                        }
                        StatusLine(
                            "Мережа планшета",
                            state.sync.isOnline,
                            if (state.sync.isOnline) "Онлайн" else "Офлайн",
                        )
                        VSpace(8.dp)
                        SecondaryButton(
                            "Перевірити з'єднання",
                            onClick = viewModel::checkServer,
                            icon = Icons.Filled.NetworkCheck,
                            enabled = check !is ServerCheckState.Checking,
                        )
                    }
                }
            }
            val right = @Composable { m: Modifier ->
                Column(m, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    AppCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Синхронізація")
                        Row {
                            BigNumber("Очікують синхронізації", state.sync.pendingCount, Modifier.weight(1f),
                                if (state.sync.pendingCount > 0) Palette.Orange else Palette.Green)
                            BigNumber("З помилкою відправки", state.sync.failedCount, Modifier.weight(1f),
                                if (state.sync.failedCount > 0) Palette.Red else Palette.TextTertiary)
                        }
                        VSpace(8.dp)
                        Text(
                            "Остання успішна синхронізація: " + (settings.lastSyncAt?.let {
                                runCatching { TimeFormats.localDateTime(TimeFormats.parseIso(it)) }.getOrDefault(it)
                            } ?: "ще не було"),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Palette.TextSecondary,
                        )
                        settings.lastSyncError?.let {
                            Text("Остання помилка: $it", style = MaterialTheme.typography.bodyMedium, color = Palette.Red)
                        }
                        VSpace(12.dp)
                        PrimaryButton(
                            "Синхронізувати зараз",
                            onClick = viewModel::syncNow,
                            icon = Icons.Filled.Sync,
                            enabled = settings.apiUrl.isNotBlank(),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    AppCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Довідник продукції")
                        BigNumber("Позицій у довіднику", state.productCount, Modifier.fillMaxWidth(), Palette.TextPrimary)
                        VSpace(12.dp)
                        PrimaryButton(
                            "Імпорт CSV / XLSX",
                            onClick = { picker.launch(IMPORT_MIME_TYPES) },
                            icon = Icons.Filled.UploadFile,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        VSpace(10.dp)
                        SecondaryButton(
                            "Оновити довідник з сервера",
                            onClick = viewModel::refreshFromServer,
                            icon = Icons.Filled.CloudDownload,
                            enabled = settings.apiUrl.isNotBlank(),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        VSpace(6.dp)
                        Text(
                            "Колонки файлу: SKU (СКЮ), Вид, Артикул. Підтримуються також «Артикул ГП», «Артикул МХП», «Найменування», «Торгова група».",
                            style = MaterialTheme.typography.bodySmall,
                            color = Palette.TextTertiary,
                        )
                    }
                    AppCard(Modifier.fillMaxWidth()) {
                        SectionTitle("Фази виробництва")
                        settings.phases.forEach {
                            Text("• $it", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(vertical = 2.dp))
                        }
                        VSpace(8.dp)
                        SecondaryButton("Змінити список фаз", onClick = { editing = EditField.PHASES })
                    }
                    Text(
                        "Версія ${BuildConfig.VERSION_NAME}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Palette.TextTertiary,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
            }
            if (wide) {
                Row(
                    Modifier.fillMaxSize().padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    left(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(bottom = 24.dp))
                    right(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(bottom = 24.dp))
                }
            } else {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    left(Modifier.fillMaxWidth())
                    right(Modifier.fillMaxWidth().padding(bottom = 24.dp))
                }
            }
        }
    }

    when (editing) {
        EditField.DEVICE_ID -> TextInputDialog(
            title = "Device ID",
            initial = settings?.deviceId.orEmpty(),
            label = "Наприклад: tablet-001",
            allowEmpty = false,
            onDismiss = { editing = null },
            onSave = { viewModel.setDeviceId(it); editing = null },
        )
        EditField.API_URL -> TextInputDialog(
            title = "API URL",
            initial = settings?.apiUrl.orEmpty(),
            label = "Наприклад: https://time-tracker.vercel.app",
            keyboardType = KeyboardType.Uri,
            onDismiss = { editing = null },
            onSave = { viewModel.setApiUrl(it); editing = null },
        )
        EditField.API_KEY -> TextInputDialog(
            title = "Ключ пристрою",
            initial = "",
            label = "Новий ключ (поточний не показується)",
            keyboardType = KeyboardType.Password,
            onDismiss = { editing = null },
            onSave = { viewModel.setApiKey(it); editing = null },
        )
        EditField.PHASES -> TextInputDialog(
            title = "Фази виробництва",
            initial = settings?.phases?.joinToString("\n").orEmpty(),
            label = "Одна фаза в рядку",
            singleLine = false,
            minLines = 5,
            allowEmpty = false,
            onDismiss = { editing = null },
            onSave = { viewModel.setPhases(it); editing = null },
        )
        null -> Unit
    }

    ImportDialogs(
        state = importState,
        currentCount = state.productCount,
        onConfirm = viewModel::confirmImport,
        onDismiss = viewModel::dismissImport,
    )
}

@Composable
private fun SettingRow(label: String, value: String, onClick: () -> Unit) {
    Surface(onClick = onClick, color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.heightIn(min = 64.dp).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.bodyMedium, color = Palette.TextSecondary)
                Text(value, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = "Змінити", tint = Palette.TextTertiary)
        }
    }
}

@Composable
private fun StatusLine(label: String, ok: Boolean?, text: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        when (ok) {
            null -> Dot(Palette.TextTertiary)
            true -> Dot(Palette.Green)
            false -> Dot(Palette.Red)
        }
        Spacer(Modifier.width(8.dp))
        Text(
            text,
            style = MaterialTheme.typography.bodyLarge,
            color = Palette.TextSecondary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1.2f),
        )
    }
}

@Composable
private fun BigNumber(label: String, value: Int, modifier: Modifier, color: Color) {
    Column(modifier) {
        Text(NumberFormats.grouped(value), fontSize = 40.sp, fontWeight = FontWeight.SemiBold, color = color)
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Palette.TextSecondary)
    }
}

@Composable
private fun ImportDialogs(
    state: ImportState,
    currentCount: Int,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    when (state) {
        ImportState.Idle -> Unit
        is ImportState.Loading -> AppDialog(onDismiss = {}, title = state.message) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(36.dp))
                Spacer(Modifier.width(16.dp))
                Text("Зачекайте…", style = MaterialTheme.typography.bodyLarge)
            }
        }
        is ImportState.Preview -> ImportPreviewDialog(state.report, currentCount, onConfirm, onDismiss)
        is ImportState.Done -> AppDialog(onDismiss = onDismiss, title = "Готово") {
            Text(state.message, style = MaterialTheme.typography.titleLarge)
            state.details?.let {
                VSpace(8.dp)
                Text(it, style = MaterialTheme.typography.bodyLarge, color = Palette.TextSecondary)
            }
            VSpace(20.dp)
            PrimaryButton("OK", onClick = onDismiss, modifier = Modifier.align(Alignment.End))
        }
        is ImportState.Error -> AppDialog(onDismiss = onDismiss, title = "Не вдалося імпортувати") {
            Text(state.message, style = MaterialTheme.typography.bodyLarge)
            VSpace(20.dp)
            PrimaryButton("Зрозуміло", onClick = onDismiss, modifier = Modifier.align(Alignment.End))
        }
    }
}

@Composable
private fun ImportPreviewDialog(
    report: ProductImportReport,
    currentCount: Int,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AppDialog(onDismiss = onDismiss, title = "Перевірка довідника", maxWidth = 760.dp) {
        Column(
            Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                "Файл: ${report.sourceName}" + (report.sheetName?.let { " · аркуш «$it»" } ?: ""),
                style = MaterialTheme.typography.bodyLarge,
                color = Palette.TextSecondary,
            )
            Text(
                "Колонки: " + report.mapping.describe().joinToString(" · ") { (field, header) -> "$field ← «$header»" },
                style = MaterialTheme.typography.bodyMedium,
                color = Palette.TextSecondary,
            )
            Row(Modifier.padding(vertical = 8.dp)) {
                BigNumber("Усього рядків", report.totalRows, Modifier.weight(1f), Palette.TextPrimary)
                BigNumber("Буде імпортовано", report.importedCount, Modifier.weight(1f), Palette.Green)
                BigNumber("Помилок", report.errorCount, Modifier.weight(1f), if (report.errorCount > 0) Palette.Red else Palette.TextTertiary)
            }
            if (report.warnings.isNotEmpty()) {
                Text(
                    "Без артикулу: ${NumberFormats.grouped(report.warnings.size)} (імпортуються; пошук — за SKU та видом)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Palette.Orange,
                )
            }
            if (report.emptyRows > 0) {
                Text(
                    "Порожніх рядків пропущено: ${report.emptyRows}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Palette.TextSecondary,
                )
            }
            if (report.errors.isNotEmpty()) {
                VSpace(4.dp)
                Text("Помилки у файлі:", style = MaterialTheme.typography.titleSmall)
                report.errors.take(50).forEach {
                    Text("Рядок ${it.rowNumber}: ${it.message}", style = MaterialTheme.typography.bodyMedium, color = Palette.Red)
                }
                if (report.errors.size > 50) {
                    Text("…та ще ${report.errors.size - 50}", style = MaterialTheme.typography.bodyMedium, color = Palette.TextSecondary)
                }
            }
            if (currentCount > 0 && report.importedCount > 0) {
                VSpace(4.dp)
                Text(
                    "Поточний довідник (${NumberFormats.positions(currentCount)}) буде замінено.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Palette.TextSecondary,
                )
            }
        }
        VSpace(20.dp)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onDismiss) { Text("Скасувати", style = MaterialTheme.typography.titleSmall) }
            Spacer(Modifier.width(12.dp))
            PrimaryButton(
                text = if (report.importedCount > 0) "Імпортувати ${NumberFormats.positions(report.importedCount)}" else "Немає що імпортувати",
                enabled = report.importedCount > 0,
                onClick = onConfirm,
            )
        }
    }
}
