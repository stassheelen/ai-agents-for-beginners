package ua.prod.timetracker.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ua.prod.timetracker.ui.theme.Palette

/**
 * Велика кнопка фіксації часу.
 * Доступна — заповнена кольором; недоступна — сіра з підказкою, чому.
 */
@Composable
fun BigActionButton(
    title: String,
    icon: ImageVector,
    color: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    hint: String? = null,
    neutral: Boolean = false,
) {
    val haptic = LocalHapticFeedback.current
    val container by animateColorAsState(
        when {
            neutral -> Palette.Surface
            enabled -> color
            else -> Palette.SurfaceMuted
        },
        label = "container",
    )
    val content = when {
        neutral -> Palette.TextPrimary
        enabled -> Color.White
        else -> Palette.TextTertiary
    }
    Surface(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        enabled = enabled,
        modifier = modifier,
        shape = RoundedCornerShape(28.dp),
        color = container,
        shadowElevation = if (enabled) 3.dp else 0.dp,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (neutral) color else content,
                modifier = Modifier.size(40.dp),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = content,
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
            val secondLine = subtitle ?: hint
            if (secondLine != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    secondLine,
                    style = MaterialTheme.typography.bodyMedium,
                    color = content.copy(alpha = if (enabled || neutral) 0.85f else 1f),
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/** Велика основна кнопка (ВИБРАТИ ПРОДУКЦІЮ, ГОТОВО, ПОЧАТИ ПРОСТІЙ). */
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    color: Color = Palette.Blue,
    icon: ImageVector? = null,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 64.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = color,
            contentColor = Color.White,
            disabledContainerColor = Palette.SurfaceMuted,
            disabledContentColor = Palette.TextTertiary,
        ),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(26.dp))
            Spacer(Modifier.size(10.dp))
        }
        Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}

/** Другорядна кнопка (світла). */
@Composable
fun SecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null,
    color: Color = Palette.Blue,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Palette.soft(color),
            contentColor = color,
            disabledContainerColor = Palette.SurfaceMuted,
            disabledContentColor = Palette.TextTertiary,
        ),
        elevation = null,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.size(8.dp))
        }
        Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
    }
}

/** Цифрова клавіатура для введення кількості — великі кнопки під палець. */
@Composable
fun NumericKeypad(
    onKey: (Char) -> Unit,
    onBackspace: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rows = listOf(
        listOf('1', '2', '3'),
        listOf('4', '5', '6'),
        listOf('7', '8', '9'),
        listOf('.', '0', '<'),
    )
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { key ->
                    Surface(
                        onClick = { if (key == '<') onBackspace() else onKey(key) },
                        modifier = Modifier.weight(1f).height(64.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = Palette.SurfaceMuted,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            if (key == '<') {
                                Icon(
                                    Icons.AutoMirrored.Filled.Backspace,
                                    contentDescription = "Стерти",
                                    tint = Palette.TextPrimary,
                                    modifier = Modifier.size(28.dp),
                                )
                            } else {
                                Text(
                                    if (key == '.') "," else key.toString(),
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Palette.TextPrimary,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Великий перемикач на 2–3 варіанти (замість дрібних dropdown). */
@Composable
fun SegmentedControl(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Palette.SurfaceMuted)
            .padding(4.dp),
    ) {
        options.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            Surface(
                onClick = { onSelect(index) },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(12.dp),
                color = if (selected) Palette.Surface else Color.Transparent,
                shadowElevation = if (selected) 2.dp else 0.dp,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        label,
                        style = MaterialTheme.typography.titleSmall,
                        color = if (selected) Palette.TextPrimary else Palette.TextSecondary,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                    )
                }
            }
        }
    }
}

/** Великий рядок вибору з «радіо» (причини простою, фази). */
@Composable
fun ChoiceRow(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    accent: Color = Palette.Blue,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().heightIn(min = 60.dp),
        shape = RoundedCornerShape(16.dp),
        color = if (selected) Palette.soft(accent) else Palette.Surface,
        border = androidx.compose.foundation.BorderStroke(
            width = if (selected) 2.dp else 1.dp,
            color = if (selected) accent else Palette.Separator,
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(RoundedCornerShape(50))
                    .border(2.dp, if (selected) accent else Palette.TextTertiary, RoundedCornerShape(50)),
                contentAlignment = Alignment.Center,
            ) {
                if (selected) Box(Modifier.size(12.dp).clip(RoundedCornerShape(50)).background(accent))
            }
            Spacer(Modifier.size(14.dp))
            Text(
                text,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (enabled) Palette.TextPrimary else Palette.TextTertiary,
            )
        }
    }
}
