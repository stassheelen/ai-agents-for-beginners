package ua.prod.timetracker.ui.journal

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ua.prod.timetracker.domain.model.ActivityKind
import ua.prod.timetracker.domain.model.EventType
import ua.prod.timetracker.domain.model.ProductionEvent
import ua.prod.timetracker.domain.model.SyncStatus
import ua.prod.timetracker.ui.components.AppCard
import ua.prod.timetracker.ui.components.AppTopBar
import ua.prod.timetracker.ui.components.Dot
import ua.prod.timetracker.ui.components.SegmentedControl
import ua.prod.timetracker.ui.components.TextInputDialog
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.theme.Palette
import ua.prod.timetracker.util.NumberFormats
import ua.prod.timetracker.util.TimeFormats

@Composable
fun JournalScreen(viewModel: JournalViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf<ProductionEvent?>(null) }

    Column(Modifier.fillMaxSize()) {
        AppTopBar(
            title = "Журнал подій",
            subtitle = state.record?.let { "${it.product.headline} · ${it.product.type}" },
            syncState = state.sync,
            onBack = onBack,
        )
        SegmentedControl(
            options = listOf("Поточна продукція", "Сьогодні — усі"),
            selectedIndex = state.filter.ordinal,
            onSelect = { viewModel.setFilter(JournalFilter.entries[it]) },
            modifier = Modifier.padding(horizontal = 24.dp).widthIn(max = 640.dp).fillMaxWidth(),
        )
        VSpace(12.dp)
        if (state.loaded && state.events.isEmpty()) {
            Text(
                "Подій ще немає",
                style = MaterialTheme.typography.headlineSmall,
                color = Palette.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(48.dp),
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.events, key = { it.eventId }) { event ->
                    EventRow(
                        event = event,
                        showProduct = state.filter == JournalFilter.TODAY,
                        onClick = { editing = event },
                    )
                }
            }
        }
    }

    editing?.let { event ->
        TextInputDialog(
            title = "Коментар до події",
            initial = event.comment.orEmpty(),
            label = "${event.eventType.journalLabel} · ${TimeFormats.localTime(event.timestamp)}",
            onDismiss = { editing = null },
            onSave = {
                viewModel.updateComment(event.eventId, it)
                editing = null
            },
        )
    }
}

fun eventColor(type: EventType): Color = when (type.activity) {
    ActivityKind.PHASE -> if (type.isStart) Palette.Green else Palette.Red
    ActivityKind.CHANGEOVER -> Palette.Indigo
    ActivityKind.DOWNTIME -> Palette.Orange
}

@Composable
private fun EventRow(event: ProductionEvent, showProduct: Boolean, onClick: () -> Unit) {
    AppCard(onClick = onClick, modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 22.dp, vertical = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Dot(eventColor(event.eventType), size = 16.dp)
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(event.eventType.journalLabel, style = MaterialTheme.typography.titleLarge)
                val details = buildList {
                    if (showProduct) add("${event.article.ifBlank { event.sku }} · ${event.productName}")
                    event.phase?.let { if (event.eventType.activity == ActivityKind.PHASE) add(it) }
                    if (event.eventType == EventType.DOWNTIME_START) event.downtimeReason?.let { add(it) }
                    event.durationSeconds?.let { add("Тривалість ${TimeFormats.duration(it)}") }
                    event.quantityKg?.let { if (event.eventType == EventType.PHASE_START) add(NumberFormats.quantityKg(it)) }
                }
                if (details.isNotEmpty()) {
                    Text(details.joinToString(" · "), style = MaterialTheme.typography.bodyLarge, color = Palette.TextSecondary)
                }
                event.comment?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Edit, contentDescription = null, tint = Palette.TextTertiary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = Palette.TextSecondary)
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(TimeFormats.localTime(event.timestamp), fontSize = 30.sp, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(TimeFormats.localDate(event.timestamp), style = MaterialTheme.typography.bodyMedium, color = Palette.TextTertiary)
                    Spacer(Modifier.width(8.dp))
                    val synced = event.syncStatus == SyncStatus.SYNCED
                    Icon(
                        if (synced) Icons.Filled.CloudDone else Icons.Filled.CloudUpload,
                        contentDescription = if (synced) "Синхронізовано" else "Очікує відправки",
                        tint = if (synced) Palette.Green else Palette.Orange,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}
