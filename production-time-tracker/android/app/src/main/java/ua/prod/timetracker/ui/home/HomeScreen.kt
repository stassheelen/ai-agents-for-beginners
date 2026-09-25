package ua.prod.timetracker.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ua.prod.timetracker.domain.model.ActiveActivity
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.model.TransitionCheck
import ua.prod.timetracker.ui.components.AppCard
import ua.prod.timetracker.ui.components.AppTopBar
import ua.prod.timetracker.ui.components.BigActionButton
import ua.prod.timetracker.ui.components.Dot
import ua.prod.timetracker.ui.components.FieldLabel
import ua.prod.timetracker.ui.components.PrimaryButton
import ua.prod.timetracker.ui.components.SecondaryButton
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.components.rememberNow
import ua.prod.timetracker.ui.downtime.DowntimeDialog
import ua.prod.timetracker.ui.theme.Palette
import ua.prod.timetracker.util.NumberFormats
import ua.prod.timetracker.util.TimeFormats
import java.time.Instant

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onSelectProduct: () -> Unit,
    onOpenJournal: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val busy by viewModel.busy.collectAsStateWithLifecycle()
    val feedback by viewModel.feedback.collectAsStateWithLifecycle()
    var showSetup by rememberSaveable { mutableStateOf(false) }
    var showDowntime by rememberSaveable { mutableStateOf(false) }

    // Щойно вибрали нову продукцію — одразу пропонуємо ввести кількість і фазу.
    val record = state.record
    LaunchedEffect(record?.recordId) {
        if (record != null && !record.isSetupComplete) showSetup = true
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppTopBar(
                title = "ВИРОБНИЦТВО",
                subtitle = "Фіксатор часу",
                syncState = state.sync,
                actions = {
                    IconButton(onClick = onOpenSettings, modifier = Modifier.size(56.dp)) {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = "Налаштування",
                            tint = Palette.TextSecondary,
                            modifier = Modifier.size(30.dp),
                        )
                    }
                },
            )
            when {
                !state.loaded -> Spacer(Modifier.weight(1f))
                record == null -> EmptyHome(
                    productCount = state.productCount,
                    onSelectProduct = onSelectProduct,
                    onOpenSettings = onOpenSettings,
                    modifier = Modifier.weight(1f),
                )
                else -> BoxWithConstraints(
                    Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                ) {
                    val wide = maxWidth >= 800.dp && maxWidth > maxHeight
                    val info = @Composable { m: Modifier ->
                        InfoPane(
                            state = state,
                            record = record,
                            onChangeProduct = onSelectProduct,
                            onEditSetup = { showSetup = true },
                            modifier = m,
                        )
                    }
                    val actions = @Composable { m: Modifier ->
                        ActionGrid(
                            state = state,
                            busy = busy,
                            onAction = { type ->
                                if (type == EventType.DOWNTIME_START) showDowntime = true else viewModel.record(type)
                            },
                            onOpenJournal = onOpenJournal,
                            modifier = m,
                        )
                    }
                    if (wide) {
                        Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            info(Modifier.weight(0.42f).fillMaxHeight())
                            actions(Modifier.weight(0.58f).fillMaxHeight().padding(bottom = 8.dp))
                        }
                    } else {
                        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            info(Modifier.fillMaxWidth())
                            actions(Modifier.weight(1f).fillMaxWidth().padding(bottom = 8.dp))
                        }
                    }
                }
            }
            BottomStatusBar(state)
        }

        AnimatedVisibility(
            visible = feedback != null,
            enter = fadeIn() + slideInVertically { it / 2 },
            exit = fadeOut() + slideOutVertically { it / 2 },
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 72.dp),
        ) {
            feedback?.let { FeedbackToast(it, onClick = viewModel::dismissFeedback) }
        }
    }

    if (showSetup && record != null) {
        SetupDialog(
            record = record,
            phases = state.phases,
            canChangePhase = state.workState.canChangePhase,
            onDismiss = { showSetup = false },
            onConfirm = { quantity, phase, comment ->
                viewModel.saveSetup(quantity, phase, comment)
                showSetup = false
            },
        )
    }
    if (showDowntime) {
        DowntimeDialog(
            onDismiss = { showDowntime = false },
            onConfirm = { reason, comment ->
                showDowntime = false
                viewModel.record(EventType.DOWNTIME_START, reason, comment)
            },
        )
    }
}

@Composable
private fun EmptyHome(
    productCount: Int,
    onSelectProduct: () -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Palette.Blue, modifier = Modifier.size(72.dp))
        VSpace(16.dp)
        Text("Виберіть продукцію, щоб почати", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        VSpace(8.dp)
        Text(
            "Знайдіть артикул, СКЮ або вид — і фіксуйте час великими кнопками.",
            style = MaterialTheme.typography.bodyLarge,
            color = Palette.TextSecondary,
            textAlign = TextAlign.Center,
        )
        VSpace(32.dp)
        PrimaryButton(
            text = "ВИБРАТИ ПРОДУКЦІЮ",
            onClick = onSelectProduct,
            icon = Icons.Filled.Search,
            modifier = Modifier.widthIn(min = 420.dp).height(88.dp),
        )
        if (productCount == 0) {
            VSpace(28.dp)
            AppCard(modifier = Modifier.widthIn(max = 560.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Warning, contentDescription = null, tint = Palette.Orange, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Text("Довідник продукції порожній", style = MaterialTheme.typography.titleMedium)
                }
                VSpace(8.dp)
                Text(
                    "Імпортуйте список продукції (CSV або XLSX) у налаштуваннях.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Palette.TextSecondary,
                )
                VSpace(12.dp)
                SecondaryButton("Імпортувати довідник", onClick = onOpenSettings, icon = Icons.Filled.UploadFile)
            }
        }
    }
}

@Composable
private fun InfoPane(
    state: HomeUiState,
    record: ProductionRecord,
    onChangeProduct: () -> Unit,
    onEditSetup: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val blockReason = state.workState.productChangeBlockReason()
    Column(
        modifier = modifier.verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    FieldLabel("SKU")
                    Text(record.product.sku, style = MaterialTheme.typography.titleLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Column(Modifier.weight(1.3f)) {
                    FieldLabel("Артикул")
                    Text(
                        record.product.article.ifBlank { "—" },
                        style = MaterialTheme.typography.titleLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                TextButton(onClick = onChangeProduct, enabled = blockReason == null) {
                    Text("Змінити", style = MaterialTheme.typography.titleSmall)
                }
            }
            VSpace(10.dp)
            FieldLabel("Вид")
            Text(
                record.product.type,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Normal,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            record.product.group?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = Palette.TextSecondary, maxLines = 1)
            }
            if (blockReason != null) {
                Text(
                    "Змінити продукцію: ${blockReason.lowercase()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Palette.TextTertiary,
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AppCard(modifier = Modifier.weight(1f), onClick = onEditSetup, contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp)) {
                FieldLabel("Кількість")
                val q = record.quantityKg
                if (q != null) {
                    Text(NumberFormats.quantityKg(q), fontSize = 30.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                } else {
                    Text("Вказати", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = Palette.Blue)
                }
            }
            AppCard(modifier = Modifier.weight(1.4f), onClick = onEditSetup, contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp)) {
                FieldLabel("Фаза виробництва")
                val phase = record.phase
                if (!phase.isNullOrBlank()) {
                    Text(phase, style = MaterialTheme.typography.titleLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
                } else {
                    Text("Вибрати", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = Palette.Blue)
                }
            }
        }

        StatusCard(state)
    }
}

@Composable
private fun StatusCard(state: HomeUiState) {
    val now by rememberNow()
    val work = state.workState
    val (color, title, detail) = when {
        work.downtime != null -> Triple(
            Palette.Orange,
            "ПРОСТІЙ",
            listOfNotNull(work.downtime.reason, elapsed(work.downtime, now)).joinToString(" · "),
        )
        work.changeover != null -> Triple(Palette.Indigo, "ПЕРЕНАЛАДКА", elapsed(work.changeover, now))
        work.phase != null -> Triple(Palette.Green, "В РОБОТІ", elapsed(work.phase, now))
        !state.setupComplete -> Triple(Palette.Orange, "ПОТРІБНІ ДАНІ", "Вкажіть кількість і фазу")
        else -> Triple(Palette.TextTertiary, "ОЧІКУВАННЯ", "Натисніть «Почати фазу»")
    }
    AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Dot(color, size = 14.dp)
            Spacer(Modifier.width(10.dp))
            Text(title, style = MaterialTheme.typography.titleLarge, color = color, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Text(detail, style = MaterialTheme.typography.titleMedium, color = Palette.TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        // Під час простою у фазі показуємо, що фаза триває.
        if (work.phase != null && (work.downtime != null || work.changeover != null)) {
            VSpace(6.dp)
            Text(
                "Фаза триває: ${elapsed(work.phase, now)}",
                style = MaterialTheme.typography.bodyMedium,
                color = Palette.TextSecondary,
            )
        }
    }
}

private fun elapsed(activity: ActiveActivity, now: Instant): String = TimeFormats.duration(activity.elapsedSeconds(now))

@Composable
private fun ActionGrid(
    state: HomeUiState,
    busy: Boolean,
    onAction: (EventType) -> Unit,
    onOpenJournal: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val now by rememberNow()
    val work = state.workState

    fun enabled(type: EventType) = !busy && state.isEnabled(type)
    fun hint(type: EventType): String? = when {
        state.record == null -> "Спершу виберіть продукцію"
        else -> (work.check(type, state.setupComplete) as? TransitionCheck.Denied)?.reason
    }
    fun since(activity: ActiveActivity?): String? =
        activity?.let { "з ${TimeFormats.localTime(it.startedAt)} · ${elapsed(it, now)}" }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            BigActionButton(
                title = "ПОЧАТИ ФАЗУ",
                icon = Icons.Filled.PlayArrow,
                color = Palette.Green,
                enabled = enabled(EventType.PHASE_START),
                hint = hint(EventType.PHASE_START),
                onClick = { onAction(EventType.PHASE_START) },
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
            BigActionButton(
                title = "ЗАВЕРШИТИ ФАЗУ",
                icon = Icons.Filled.Stop,
                color = Palette.Red,
                enabled = enabled(EventType.PHASE_END),
                subtitle = since(work.phase),
                hint = hint(EventType.PHASE_END),
                onClick = { onAction(EventType.PHASE_END) },
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            BigActionButton(
                title = "ПОЧАТИ ПЕРЕНАЛАДКУ",
                icon = Icons.Filled.SwapHoriz,
                color = Palette.Indigo,
                enabled = enabled(EventType.CHANGEOVER_START),
                hint = hint(EventType.CHANGEOVER_START),
                onClick = { onAction(EventType.CHANGEOVER_START) },
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
            BigActionButton(
                title = "ЗАВЕРШИТИ ПЕРЕНАЛАДКУ",
                icon = Icons.Filled.SwapHoriz,
                color = Palette.Indigo,
                enabled = enabled(EventType.CHANGEOVER_END),
                subtitle = since(work.changeover),
                hint = hint(EventType.CHANGEOVER_END),
                onClick = { onAction(EventType.CHANGEOVER_END) },
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            val downtime = work.downtime
            if (downtime == null) {
                BigActionButton(
                    title = "ПРОСТІЙ",
                    icon = Icons.Filled.Pause,
                    color = Palette.Orange,
                    enabled = enabled(EventType.DOWNTIME_START),
                    hint = hint(EventType.DOWNTIME_START),
                    onClick = { onAction(EventType.DOWNTIME_START) },
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                )
            } else {
                BigActionButton(
                    title = "ЗАВЕРШИТИ ПРОСТІЙ",
                    icon = Icons.Filled.PlayCircle,
                    color = Palette.Orange,
                    enabled = enabled(EventType.DOWNTIME_END),
                    subtitle = listOfNotNull(downtime.reason, elapsed(downtime, now)).joinToString(" · "),
                    onClick = { onAction(EventType.DOWNTIME_END) },
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                )
            }
            BigActionButton(
                title = "ЖУРНАЛ ПОДІЙ",
                icon = Icons.Filled.History,
                color = Palette.Blue,
                enabled = true,
                neutral = true,
                onClick = onOpenJournal,
                modifier = Modifier.weight(1f).fillMaxHeight(),
            )
        }
    }
}

@Composable
private fun BottomStatusBar(state: HomeUiState) {
    val last = state.lastEvent
    val lastText = if (last != null) {
        "Остання подія: ${last.eventType.feedbackLabel} ${TimeFormats.localTime(last.timestamp)}"
    } else {
        "Подій ще немає"
    }
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .background(Palette.Surface)
            .padding(horizontal = 24.dp, vertical = 12.dp),
    ) {
        if (maxWidth < 700.dp) {
            // Вертикальний планшет: два рядки, щоб нічого не обрізалось.
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    lastText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Palette.TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                SyncSummary(state.sync)
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    lastText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Palette.TextSecondary,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                SyncSummary(state.sync)
            }
        }
    }
}

@Composable
private fun SyncSummary(sync: SyncState) {
    val (color, text) = when {
        sync.pendingCount == 0 -> Palette.Green to "✓ Синхронізовано"
        !sync.apiConfigured -> Palette.Orange to "Збережено на планшеті: ${sync.pendingCount} (API не налаштовано)"
        sync.isSyncing -> Palette.Blue to "Відправка… (${sync.pendingCount})"
        else -> Palette.Orange to "Очікують відправки: ${sync.pendingCount}"
    }
    Text(text, style = MaterialTheme.typography.bodyLarge, color = color, fontWeight = FontWeight.SemiBold, maxLines = 1)
}

@Composable
private fun FeedbackToast(feedback: Feedback, onClick: () -> Unit) {
    val background = if (feedback.isError) Palette.Red else Color(0xF01D1D1F)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(24.dp),
        color = background,
        shadowElevation = 12.dp,
        modifier = Modifier.widthIn(min = 360.dp, max = 640.dp).padding(horizontal = 16.dp),
    ) {
        Column(Modifier.padding(horizontal = 28.dp, vertical = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (feedback.isError) Icons.Filled.Warning else Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = if (feedback.isError) Color.White else Color(0xFF4CD787),
                    modifier = Modifier.size(34.dp),
                )
                Spacer(Modifier.width(14.dp))
                Text(feedback.title, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f, fill = false))
                if (feedback.time != null) {
                    Spacer(Modifier.width(16.dp))
                    Text(feedback.time, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (feedback.duration != null) {
                VSpace(6.dp)
                Text(feedback.duration, color = Color.White.copy(alpha = 0.85f), fontSize = 20.sp, modifier = Modifier.padding(start = 48.dp))
            }
            if (feedback.savedLocallyNote) {
                VSpace(6.dp)
                Text(
                    "Дані збережені на планшеті. Будуть відправлені автоматично.",
                    color = Color.White.copy(alpha = 0.75f),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(start = 48.dp),
                )
            }
        }
    }
}
