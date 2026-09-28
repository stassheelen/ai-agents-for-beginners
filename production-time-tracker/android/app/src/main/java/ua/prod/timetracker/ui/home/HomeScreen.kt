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
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
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
import ua.prod.timetracker.domain.model.ActiveRecordState
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.domain.model.TransitionCheck
import ua.prod.timetracker.ui.components.AppCard
import ua.prod.timetracker.ui.components.AppDialog
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
    val newlyAdded by viewModel.newlyAddedRecordId.collectAsStateWithLifecycle()
    var setupFor by rememberSaveable { mutableStateOf<String?>(null) }
    var downtimeFor by rememberSaveable { mutableStateOf<String?>(null) }
    var closeFor by rememberSaveable { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()

    // Щойно додали продукцію — одразу пропонуємо ввести кількість і фазу та прокручуємо до неї.
    LaunchedEffect(newlyAdded, state.records.size) {
        val id = newlyAdded ?: return@LaunchedEffect
        val index = state.records.indexOfFirst { it.record.recordId == id }
        if (index >= 0) {
            setupFor = id
            viewModel.consumeNewlyAdded()
            listState.animateScrollToItem(index)
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppTopBar(
                title = "ВИРОБНИЦТВО",
                subtitle = "Фіксатор часу",
                syncState = state.sync,
                actions = {
                    IconButton(onClick = onOpenJournal, modifier = Modifier.size(56.dp)) {
                        Icon(Icons.Filled.History, contentDescription = "Журнал подій", tint = Palette.TextSecondary, modifier = Modifier.size(30.dp))
                    }
                    IconButton(onClick = onOpenSettings, modifier = Modifier.size(56.dp)) {
                        Icon(Icons.Filled.Settings, contentDescription = "Налаштування", tint = Palette.TextSecondary, modifier = Modifier.size(30.dp))
                    }
                },
            )
            when {
                !state.loaded -> Spacer(Modifier.weight(1f))
                state.records.isEmpty() -> EmptyHome(
                    productCount = state.productCount,
                    onSelectProduct = onSelectProduct,
                    onOpenSettings = onOpenSettings,
                    modifier = Modifier.weight(1f),
                )
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.records, key = { it.record.recordId }) { item ->
                        RecordCard(
                            item = item,
                            busy = busy != null,
                            onToggle = { viewModel.toggleCollapsed(item.record.recordId) },
                            onClose = { closeFor = item.record.recordId },
                            onEditSetup = { setupFor = item.record.recordId },
                            onAction = { type ->
                                if (type == EventType.DOWNTIME_START) {
                                    downtimeFor = item.record.recordId
                                } else {
                                    viewModel.record(item.record.recordId, type)
                                }
                            },
                            onOpenJournal = onOpenJournal,
                        )
                    }
                    item(key = "add") {
                        SecondaryButton(
                            text = "ДОДАТИ ПРОДУКЦІЮ",
                            onClick = onSelectProduct,
                            icon = Icons.Filled.Add,
                            modifier = Modifier.fillMaxWidth().height(72.dp),
                        )
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

    setupFor?.let { id ->
        val item = state.record(id)
        if (item == null) {
            setupFor = null
        } else {
            SetupDialog(
                record = item.record,
                phases = state.phases,
                canChangePhase = item.workState.canChangePhase,
                onDismiss = { setupFor = null },
                onConfirm = { quantity, phase, comment ->
                    viewModel.saveSetup(id, quantity, phase, comment)
                    setupFor = null
                },
            )
        }
    }
    downtimeFor?.let { id ->
        DowntimeDialog(
            onDismiss = { downtimeFor = null },
            onConfirm = { reason, comment ->
                downtimeFor = null
                viewModel.record(id, EventType.DOWNTIME_START, reason, comment)
            },
        )
    }
    closeFor?.let { id ->
        val item = state.record(id)
        AppDialog(onDismiss = { closeFor = null }, title = "Прибрати продукцію з екрана?") {
            Text(
                listOfNotNull(item?.record?.product?.headline, item?.record?.product?.type).joinToString(" · ") +
                    "\nУсі події збережено — їх видно в журналі та в таблиці.",
                style = MaterialTheme.typography.bodyLarge,
                color = Palette.TextSecondary,
            )
            VSpace(20.dp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { closeFor = null }) { Text("Скасувати", style = MaterialTheme.typography.titleSmall) }
                Spacer(Modifier.width(12.dp))
                PrimaryButton(
                    text = "ПРИБРАТИ",
                    onClick = {
                        viewModel.closeRecord(id)
                        closeFor = null
                    },
                )
            }
        }
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

/** Короткий статус продукції: колір, назва стану й таймер. */
private data class StatusInfo(val color: Color, val label: String, val timer: String?)

private fun statusOf(item: ActiveRecordState, now: Instant): StatusInfo {
    val work = item.workState
    return when {
        work.downtime != null -> StatusInfo(Palette.Orange, "Простій", elapsed(work.downtime, now))
        work.changeover != null -> StatusInfo(Palette.Indigo, "Переналадка", elapsed(work.changeover, now))
        work.phase != null -> StatusInfo(Palette.Green, "В роботі", elapsed(work.phase, now))
        !item.setupComplete -> StatusInfo(Palette.Orange, "Вкажіть кг і фазу", null)
        else -> StatusInfo(Palette.TextTertiary, "Очікування", null)
    }
}

private fun elapsed(activity: ActiveActivity, now: Instant): String = TimeFormats.duration(activity.elapsedSeconds(now))

/**
 * Картка однієї продукції. Згорнута — один рядок: зліва артикул і назва, збоку поточна фаза,
 * стан і час. Розгорнута — кількість, фаза, стан і великі кнопки фіксації часу.
 */
@Composable
private fun RecordCard(
    item: ActiveRecordState,
    busy: Boolean,
    onToggle: () -> Unit,
    onClose: () -> Unit,
    onEditSetup: () -> Unit,
    onAction: (EventType) -> Unit,
    onOpenJournal: () -> Unit,
) {
    val now by rememberNow()
    val status = statusOf(item, now)
    val record = item.record
    AppCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(0.dp)) {
        // Заголовок: натискання згортає / розгортає картку.
        Surface(onClick = onToggle, color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
            Row(
                Modifier.heightIn(min = 84.dp).padding(start = 12.dp, end = 12.dp, top = 12.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (item.isCollapsed) Icons.Filled.ExpandMore else Icons.Filled.ExpandLess,
                    contentDescription = if (item.isCollapsed) "Розгорнути" else "Згорнути",
                    tint = Palette.TextSecondary,
                    modifier = Modifier.size(32.dp),
                )
                Spacer(Modifier.width(8.dp))
                Dot(status.color, size = 14.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(record.product.headline, style = MaterialTheme.typography.titleLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        if (item.isCollapsed) record.product.type else listOfNotNull("СКЮ ${record.product.sku}", record.product.type).joinToString(" · "),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Palette.TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.width(12.dp))
                // Збоку: поточна фаза, стан і час.
                Column(horizontalAlignment = Alignment.End, modifier = Modifier.widthIn(max = 280.dp)) {
                    Text(
                        record.phase ?: "Фазу не вибрано",
                        style = MaterialTheme.typography.titleSmall,
                        color = if (record.phase == null) Palette.TextTertiary else Palette.TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        listOfNotNull(status.label, status.timer).joinToString(" · "),
                        style = MaterialTheme.typography.titleMedium,
                        color = status.color,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                    )
                }
                if (!item.isCollapsed && item.canClose) {
                    IconButton(onClick = onClose, modifier = Modifier.size(48.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Прибрати з екрана", tint = Palette.TextTertiary)
                    }
                }
            }
        }
        AnimatedVisibility(visible = !item.isCollapsed) {
            BoxWithConstraints(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                val wide = maxWidth >= 760.dp
                if (wide) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        RecordDetails(item, now, onEditSetup, Modifier.weight(0.42f))
                        ActionGrid(item, busy, now, onAction, onOpenJournal, Modifier.weight(0.58f).height(372.dp))
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        RecordDetails(item, now, onEditSetup, Modifier.fillMaxWidth())
                        ActionGrid(item, busy, now, onAction, onOpenJournal, Modifier.fillMaxWidth().height(372.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun RecordDetails(item: ActiveRecordState, now: Instant, onEditSetup: () -> Unit, modifier: Modifier = Modifier) {
    val record = item.record
    val work = item.workState
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(onClick = onEditSetup, modifier = Modifier.weight(1f), shape = RoundedCornerShape(18.dp), color = Palette.Background) {
                Column(Modifier.padding(16.dp)) {
                    FieldLabel("Кількість")
                    val q = record.quantityKg
                    if (q != null) {
                        Text(NumberFormats.quantityKg(q), fontSize = 28.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    } else {
                        Text("Вказати", fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Palette.Blue)
                    }
                }
            }
            Surface(onClick = onEditSetup, modifier = Modifier.weight(1.4f), shape = RoundedCornerShape(18.dp), color = Palette.Background) {
                Column(Modifier.padding(16.dp)) {
                    FieldLabel("Фаза виробництва")
                    val phase = record.phase
                    if (!phase.isNullOrBlank()) {
                        Text(phase, style = MaterialTheme.typography.titleLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    } else {
                        Text("Вибрати", fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Palette.Blue)
                    }
                }
            }
        }
        // Під час простою чи переналадки у фазі показуємо, що фаза триває.
        if (work.phase != null && (work.downtime != null || work.changeover != null)) {
            Text(
                "Фаза триває: ${elapsed(work.phase, now)}",
                style = MaterialTheme.typography.bodyLarge,
                color = Palette.TextSecondary,
            )
        }
        work.downtime?.reason?.let {
            Text("Причина простою: $it", style = MaterialTheme.typography.bodyLarge, color = Palette.Orange)
        }
    }
}

@Composable
private fun ActionGrid(
    item: ActiveRecordState,
    busy: Boolean,
    now: Instant,
    onAction: (EventType) -> Unit,
    onOpenJournal: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val work = item.workState

    fun enabled(type: EventType) = !busy && item.isEnabled(type)
    fun hint(type: EventType): String? = (work.check(type, item.setupComplete) as? TransitionCheck.Denied)?.reason
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
            if (feedback.product != null) {
                VSpace(4.dp)
                Text(feedback.product, color = Color.White.copy(alpha = 0.85f), fontSize = 20.sp, modifier = Modifier.padding(start = 48.dp))
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
