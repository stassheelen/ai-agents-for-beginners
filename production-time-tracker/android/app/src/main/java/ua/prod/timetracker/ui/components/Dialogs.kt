package ua.prod.timetracker.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ua.prod.timetracker.ui.theme.Palette

/** Діалог-картка з великим заголовком. */
@Composable
fun AppDialog(
    onDismiss: () -> Unit,
    title: String,
    maxWidth: Dp = 560.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.padding(24.dp).widthIn(max = maxWidth).fillMaxWidth(),
            shape = RoundedCornerShape(32.dp),
            color = Palette.Surface,
        ) {
            Column(Modifier.padding(28.dp)) {
                Text(title, style = MaterialTheme.typography.headlineSmall, color = Palette.TextPrimary)
                VSpace(20.dp)
                content()
            }
        }
    }
}

/** Введення одного текстового значення (Device ID, API URL, коментар…). */
@Composable
fun TextInputDialog(
    title: String,
    initial: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
    label: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    minLines: Int = 1,
    saveText: String = "Зберегти",
    allowEmpty: Boolean = true,
) {
    var value by remember { mutableStateOf(TextFieldValue(initial, TextRange(initial.length))) }
    val focus = remember { FocusRequester() }
    AppDialog(onDismiss = onDismiss, title = title) {
        OutlinedTextField(
            value = value,
            onValueChange = { value = it },
            label = label?.let { { Text(it) } },
            singleLine = singleLine,
            minLines = minLines,
            maxLines = if (singleLine) 1 else 10,
            textStyle = MaterialTheme.typography.bodyLarge,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            modifier = Modifier.fillMaxWidth().focusRequester(focus),
            shape = RoundedCornerShape(16.dp),
        )
        VSpace(24.dp)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp, androidx.compose.ui.Alignment.End)) {
            TextButton(onClick = onDismiss, modifier = Modifier.padding(vertical = 4.dp)) {
                Text("Скасувати", style = MaterialTheme.typography.titleSmall)
            }
            PrimaryButton(
                text = saveText,
                onClick = { onSave(value.text) },
                enabled = allowEmpty || value.text.isNotBlank(),
            )
        }
    }
    LaunchedEffect(Unit) { focus.requestFocus() }
}
