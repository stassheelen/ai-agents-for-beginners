package ua.prod.timetracker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import ua.prod.timetracker.domain.model.SyncState
import ua.prod.timetracker.ui.theme.Palette
import java.time.Instant

/** Біла картка з м'якою тінню. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    contentPadding: PaddingValues = PaddingValues(20.dp),
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shadowed = modifier.shadow(
        elevation = 6.dp,
        shape = shape,
        ambientColor = Color.Black.copy(alpha = 0.04f),
        spotColor = Color.Black.copy(alpha = 0.08f),
    )
    if (onClick != null) {
        Surface(onClick = onClick, modifier = shadowed, shape = shape, color = Palette.Surface) {
            Column(Modifier.padding(contentPadding), content = content)
        }
    } else {
        Surface(modifier = shadowed, shape = shape, color = Palette.Surface) {
            Column(Modifier.padding(contentPadding), content = content)
        }
    }
}

/** Малий сірий підпис над значенням («SKU», «КІЛЬКІСТЬ»). */
@Composable
fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = Palette.TextSecondary,
        modifier = modifier,
    )
}

@Composable
fun Dot(color: Color, size: Dp = 10.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(color))
}

/** Капсула статусу: кольорова крапка + текст. */
@Composable
fun StatusPill(text: String, color: Color, modifier: Modifier = Modifier, spinning: Boolean = false) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(Palette.soft(color))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (spinning) {
            CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = color)
        } else {
            Dot(color)
        }
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.titleSmall, color = color, maxLines = 1)
    }
}

/** 🟢 Онлайн / 🔴 Офлайн / 🔄 Синхронізація + «Очікують відправки: N». */
@Composable
fun SyncIndicator(state: SyncState, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        when {
            state.isSyncing -> StatusPill("Синхронізація", Palette.Blue, spinning = true)
            state.isOnline -> StatusPill("Онлайн", Palette.Green)
            else -> StatusPill("Офлайн", Palette.Red)
        }
        if (state.pendingCount > 0) {
            StatusPill("Очікують відправки: ${state.pendingCount}", Palette.Orange)
        }
    }
}

/** Верхня панель екранів. */
@Composable
fun AppTopBar(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    syncState: SyncState? = null,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack, modifier = Modifier.size(56.dp)) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Назад",
                    tint = Palette.TextPrimary,
                    modifier = Modifier.size(30.dp),
                )
            }
            Spacer(Modifier.width(4.dp))
        } else {
            Spacer(Modifier.width(8.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall,
                color = Palette.TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Palette.TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (syncState != null) {
            SyncIndicator(syncState)
            Spacer(Modifier.width(8.dp))
        }
        actions()
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        color = Palette.TextPrimary,
        modifier = modifier.padding(bottom = 8.dp),
    )
}

@Composable
fun VSpace(height: Dp) = Spacer(Modifier.height(height))

/** Поточний час, що оновлюється щосекунди (для живих таймерів). */
@Composable
fun rememberNow(): State<Instant> = produceState(initialValue = Instant.now()) {
    while (true) {
        value = Instant.now()
        delay(1000L - System.currentTimeMillis() % 1000L)
    }
}
