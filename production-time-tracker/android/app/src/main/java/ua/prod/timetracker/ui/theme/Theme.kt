package ua.prod.timetracker.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Спокійна «преміальна» палітра: світлий фон, білі картки, приглушені акценти. */
object Palette {
    val Background = Color(0xFFF5F5F7)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceMuted = Color(0xFFEFEFF2)
    val TextPrimary = Color(0xFF1D1D1F)
    val TextSecondary = Color(0xFF6E6E73)
    val TextTertiary = Color(0xFFA1A1A6)
    val Separator = Color(0xFFE3E3E8)

    val Blue = Color(0xFF0A6CFF)
    val Green = Color(0xFF1E9E57)
    val Red = Color(0xFFD9423F)
    val Orange = Color(0xFFE5840B)
    val Indigo = Color(0xFF5856D6)

    fun soft(color: Color): Color = color.copy(alpha = 0.12f)
}

private val colors = lightColorScheme(
    primary = Palette.Blue,
    onPrimary = Color.White,
    secondary = Palette.Indigo,
    background = Palette.Background,
    onBackground = Palette.TextPrimary,
    surface = Palette.Surface,
    onSurface = Palette.TextPrimary,
    surfaceVariant = Palette.SurfaceMuted,
    onSurfaceVariant = Palette.TextSecondary,
    outline = Palette.Separator,
    outlineVariant = Palette.Separator,
    error = Palette.Red,
    surfaceContainer = Palette.Surface,
    surfaceContainerHigh = Palette.Surface,
    surfaceContainerHighest = Palette.SurfaceMuted,
    surfaceContainerLow = Palette.Background,
)

private val typography = Typography(
    displayLarge = TextStyle(fontSize = 56.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1).sp),
    displayMedium = TextStyle(fontSize = 44.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.5).sp),
    headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold),
    headlineSmall = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold),
    titleSmall = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 18.sp),
    bodyMedium = TextStyle(fontSize = 16.sp),
    bodySmall = TextStyle(fontSize = 14.sp),
    labelLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.3.sp),
    labelMedium = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
    labelSmall = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.5.sp),
)

private val shapes = Shapes(
    extraSmall = RoundedCornerShape(10.dp),
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

@Composable
fun TimeTrackerTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography, shapes = shapes, content = content)
}
