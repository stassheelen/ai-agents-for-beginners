package ua.prod.timetracker.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ua.prod.timetracker.domain.model.ProductionRecord
import ua.prod.timetracker.ui.components.ChoiceRow
import ua.prod.timetracker.ui.components.FieldLabel
import ua.prod.timetracker.ui.components.NumericKeypad
import ua.prod.timetracker.ui.components.PrimaryButton
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.theme.Palette
import ua.prod.timetracker.util.QuantityInput

/**
 * Один екран для кількості (кг) і фази — вводиться один раз перед початком роботи з продукцією.
 * Кількість — з великої цифрової клавіатури, фаза — великими рядками (без dropdown).
 */
@Composable
fun SetupDialog(
    record: ProductionRecord,
    phases: List<String>,
    canChangePhase: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (quantityKg: Double, phase: String, comment: String?) -> Unit,
) {
    var quantity by remember(record.recordId) { mutableStateOf(QuantityInput.of(record.quantityKg)) }
    val initialPhase = record.phase.orEmpty()
    val customInitial = initialPhase.isNotBlank() && initialPhase !in phases
    var phase by remember(record.recordId) { mutableStateOf(initialPhase) }
    var customPhase by remember(record.recordId) { mutableStateOf(if (customInitial) initialPhase else "") }
    var customSelected by remember(record.recordId) { mutableStateOf(customInitial) }
    var comment by remember(record.recordId) { mutableStateOf(record.comment.orEmpty()) }

    val chosenPhase = if (customSelected) customPhase.trim() else phase
    val canSave = quantity.isValid && chosenPhase.isNotBlank()

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.padding(16.dp).widthIn(max = 1040.dp).fillMaxWidth(),
            shape = RoundedCornerShape(32.dp),
            color = Palette.Surface,
        ) {
            Column(Modifier.padding(24.dp)) {
                Text(record.product.headline, style = MaterialTheme.typography.headlineSmall)
                Text(record.product.type, style = MaterialTheme.typography.bodyLarge, color = Palette.TextSecondary, maxLines = 1)
                VSpace(16.dp)
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    // Кількість
                    Column(Modifier.weight(1f)) {
                        FieldLabel("Кількість, кг")
                        VSpace(6.dp)
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = Palette.Background,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(Modifier.padding(horizontal = 20.dp, vertical = 10.dp), verticalAlignment = Alignment.Bottom) {
                                Text(
                                    quantity.text.replace('.', ',').ifEmpty { "0" },
                                    fontSize = 44.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (quantity.text.isEmpty()) Palette.TextTertiary else Palette.TextPrimary,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                )
                                Text("кг", fontSize = 26.sp, color = Palette.TextSecondary, modifier = Modifier.padding(bottom = 6.dp))
                            }
                        }
                        VSpace(12.dp)
                        NumericKeypad(
                            onKey = { quantity = quantity.append(it) },
                            onBackspace = { quantity = quantity.backspace() },
                        )
                    }
                    // Фаза + коментар
                    Column(
                        Modifier
                            .weight(1.1f)
                            .heightIn(max = 420.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FieldLabel("Фаза виробництва")
                        if (!canChangePhase) {
                            Text(
                                "Фазу можна змінити після її завершення",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Palette.Orange,
                            )
                        }
                        phases.forEach { p ->
                            ChoiceRow(
                                text = p,
                                selected = !customSelected && phase == p,
                                enabled = canChangePhase,
                                onClick = {
                                    phase = p
                                    customSelected = false
                                },
                            )
                        }
                        ChoiceRow(
                            text = "Інша фаза…",
                            selected = customSelected,
                            enabled = canChangePhase,
                            onClick = { customSelected = true },
                        )
                        if (customSelected) {
                            OutlinedTextField(
                                value = customPhase,
                                onValueChange = { customPhase = it },
                                label = { Text("Назва фази") },
                                singleLine = true,
                                enabled = canChangePhase,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                            )
                        }
                        VSpace(4.dp)
                        OutlinedTextField(
                            value = comment,
                            onValueChange = { comment = it },
                            label = { Text("Коментар до запису (необов'язково)") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                        )
                    }
                }
                VSpace(20.dp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        when {
                            !quantity.isValid -> "Введіть кількість у кілограмах"
                            chosenPhase.isBlank() -> "Виберіть фазу"
                            else -> ""
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = Palette.TextSecondary,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onDismiss) { Text("Скасувати", style = MaterialTheme.typography.titleSmall) }
                    Spacer(Modifier.width(12.dp))
                    PrimaryButton(
                        text = "ГОТОВО",
                        enabled = canSave,
                        onClick = { quantity.value?.let { onConfirm(it, chosenPhase, comment) } },
                        modifier = Modifier.widthIn(min = 220.dp),
                    )
                }
            }
        }
    }
}
