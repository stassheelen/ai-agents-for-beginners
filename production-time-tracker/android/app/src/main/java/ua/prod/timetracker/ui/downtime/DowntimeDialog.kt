package ua.prod.timetracker.ui.downtime

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ua.prod.timetracker.domain.model.DowntimeReason
import ua.prod.timetracker.ui.components.AppDialog
import ua.prod.timetracker.ui.components.ChoiceRow
import ua.prod.timetracker.ui.components.PrimaryButton
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.theme.Palette

/** ПРИЧИНА ПРОСТОЮ: великі варіанти у дві колонки + необов'язковий коментар. */
@Composable
fun DowntimeDialog(
    onDismiss: () -> Unit,
    onConfirm: (reason: String, comment: String?) -> Unit,
) {
    var selected by rememberSaveable { mutableStateOf<DowntimeReason?>(null) }
    var comment by rememberSaveable { mutableStateOf("") }

    AppDialog(onDismiss = onDismiss, title = "ПРИЧИНА ПРОСТОЮ", maxWidth = 820.dp) {
        val reasons = DowntimeReason.entries
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            reasons.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    pair.forEach { reason ->
                        ChoiceRow(
                            text = reason.label,
                            selected = selected == reason,
                            onClick = { selected = reason },
                            accent = Palette.Orange,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
        VSpace(16.dp)
        OutlinedTextField(
            value = comment,
            onValueChange = { comment = it },
            label = { Text("Коментар (необов'язково)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
        )
        VSpace(24.dp)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (selected == null) "Виберіть причину" else "",
                style = MaterialTheme.typography.bodyLarge,
                color = Palette.TextSecondary,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onDismiss) { Text("Скасувати", style = MaterialTheme.typography.titleSmall) }
            Spacer(Modifier.width(12.dp))
            PrimaryButton(
                text = "ПОЧАТИ ПРОСТІЙ",
                icon = Icons.Filled.Pause,
                color = Palette.Orange,
                enabled = selected != null,
                onClick = { selected?.let { onConfirm(it.label, comment.trim().ifEmpty { null }) } },
                modifier = Modifier.height(64.dp),
            )
        }
    }
}
