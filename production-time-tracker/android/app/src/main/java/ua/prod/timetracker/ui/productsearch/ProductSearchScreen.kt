package ua.prod.timetracker.ui.productsearch

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Dialpad
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.ui.components.AppCard
import ua.prod.timetracker.ui.components.AppTopBar
import ua.prod.timetracker.ui.components.FieldLabel
import ua.prod.timetracker.ui.components.VSpace
import ua.prod.timetracker.ui.theme.Palette
import ua.prod.timetracker.util.NumberFormats
import ua.prod.timetracker.util.SearchText

@Composable
fun ProductSearchScreen(
    viewModel: ProductSearchViewModel,
    onSelected: () -> Unit,
    onBack: () -> Unit,
) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val recent by viewModel.recent.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val focus = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    var numericKeyboard by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                SearchEvent.Selected -> {
                    keyboard?.hide()
                    onSelected()
                }
                is SearchEvent.Error -> snackbar.showSnackbar(event.message)
            }
        }
    }
    LaunchedEffect(Unit) { focus.requestFocus() }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppTopBar(title = "Вибір продукції", onBack = onBack)
            OutlinedTextField(
                value = query,
                onValueChange = viewModel::onQueryChange,
                placeholder = { Text("Введіть артикул, СКЮ або вид", fontSize = 22.sp) },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, modifier = Modifier.size(30.dp)) },
                trailingIcon = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (query.isNotEmpty()) {
                            IconButton(onClick = { viewModel.onQueryChange("") }, modifier = Modifier.size(56.dp)) {
                                Icon(Icons.Filled.Close, contentDescription = "Очистити", modifier = Modifier.size(28.dp))
                            }
                        }
                        // Перемикач «цифри / букви» для швидкого введення номерів.
                        IconButton(
                            onClick = {
                                numericKeyboard = !numericKeyboard
                                keyboard?.hide()
                                keyboard?.show()
                            },
                            modifier = Modifier.size(56.dp),
                        ) {
                            Icon(
                                if (numericKeyboard) Icons.Filled.Keyboard else Icons.Filled.Dialpad,
                                contentDescription = if (numericKeyboard) "Букви" else "Цифри",
                                modifier = Modifier.size(28.dp),
                            )
                        }
                    }
                },
                singleLine = true,
                textStyle = MaterialTheme.typography.headlineSmall,
                keyboardOptions = KeyboardOptions(
                    keyboardType = if (numericKeyboard) KeyboardType.Number else KeyboardType.Text,
                    imeAction = ImeAction.Search,
                ),
                keyboardActions = KeyboardActions(onSearch = {
                    if (state.results.size == 1) viewModel.select(state.results.first()) else keyboard?.hide()
                }),
                shape = RoundedCornerShape(22.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Palette.Surface,
                    unfocusedContainerColor = Palette.Surface,
                    focusedBorderColor = Palette.Blue,
                    unfocusedBorderColor = Palette.Separator,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .height(76.dp)
                    .focusRequester(focus),
            )
            VSpace(12.dp)
            SearchResults(
                state = state,
                recent = recent,
                onSelect = viewModel::select,
                modifier = Modifier.weight(1f),
            )
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).padding(24.dp))
    }
}

@Composable
private fun SearchResults(
    state: SearchUiState,
    recent: List<Product>,
    onSelect: (Product) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (!state.loaded) return
    val query = state.query
    when {
        state.totalProducts == 0 -> Message(
            modifier,
            "Довідник продукції порожній",
            "Імпортуйте CSV або XLSX у Налаштуваннях.",
        )
        query.isNotBlank() && state.results.isEmpty() -> Message(
            modifier,
            "Нічого не знайдено",
            "Перевірте артикул, СКЮ або вид. Пошук працює по частині слова чи номера.",
        )
        query.isNotBlank() && state.results.size == 1 -> Box(modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.TopCenter) {
            SingleResultCard(state.results.first(), query, onClick = { onSelect(state.results.first()) })
        }
        else -> LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 250.dp),
            modifier = modifier.fillMaxWidth(),
            contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (query.isBlank() && recent.isNotEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }) { FieldLabel("Нещодавні", Modifier.padding(top = 4.dp)) }
                items(recent, key = { "recent-" + it.sku }) { product ->
                    ProductCard(product, query = "", onClick = { onSelect(product) })
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    FieldLabel("Уся продукція · ${NumberFormats.grouped(state.totalProducts)}", Modifier.padding(top = 8.dp))
                }
            } else if (query.isNotBlank()) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    FieldLabel("Знайдено: ${state.results.size}${if (state.results.size >= 200) "+" else ""}")
                }
            }
            items(state.results, key = { it.sku }) { product ->
                ProductCard(product, query = query, onClick = { onSelect(product) })
            }
        }
    }
}

@Composable
private fun ProductCard(product: Product, query: String, onClick: () -> Unit) {
    AppCard(onClick = onClick, modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(20.dp)) {
        Text(
            highlight(product.headline, query),
            fontSize = 26.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        VSpace(4.dp)
        Text(
            highlight(product.type, query),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Normal,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.height(48.dp),
        )
        VSpace(6.dp)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                highlight("СКЮ ${product.sku}", query),
                style = MaterialTheme.typography.bodyLarge,
                color = Palette.TextSecondary,
            )
            product.group?.let {
                Spacer(Modifier.width(10.dp))
                Text("· $it", style = MaterialTheme.typography.bodyMedium, color = Palette.TextTertiary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun SingleResultCard(product: Product, query: String, onClick: () -> Unit) {
    AppCard(
        onClick = onClick,
        modifier = Modifier.widthIn(max = 720.dp).fillMaxWidth(),
        shape = RoundedCornerShape(32.dp),
        contentPadding = PaddingValues(36.dp),
    ) {
        Text(highlight(product.headline, query), fontSize = 48.sp, fontWeight = FontWeight.Bold)
        VSpace(8.dp)
        Text(highlight(product.type, query), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Normal)
        VSpace(8.dp)
        Text(highlight("СКЮ ${product.sku}", query), style = MaterialTheme.typography.titleLarge, color = Palette.TextSecondary, fontWeight = FontWeight.Normal)
        product.group?.let { Text(it, style = MaterialTheme.typography.bodyLarge, color = Palette.TextTertiary) }
        VSpace(24.dp)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.TouchApp, contentDescription = null, tint = Palette.Blue, modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(10.dp))
            Text("Натисніть, щоб вибрати", style = MaterialTheme.typography.titleMedium, color = Palette.Blue)
        }
    }
}

@Composable
private fun Message(modifier: Modifier, title: String, text: String) {
    Column(
        modifier.fillMaxWidth().padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
        VSpace(8.dp)
        Text(text, style = MaterialTheme.typography.bodyLarge, color = Palette.TextSecondary, textAlign = TextAlign.Center)
    }
}

/** Виділяє у тексті знайдені частини запиту (без урахування регістру та схожих літер). */
private fun highlight(text: String, query: String): AnnotatedString {
    val tokens = SearchText.tokens(query)
    if (tokens.isEmpty()) return AnnotatedString(text)
    val folded = SearchText.foldPerChar(text)
    val marks = BooleanArray(text.length)
    for (token in tokens) {
        var from = 0
        while (true) {
            val i = folded.indexOf(token, from)
            if (i < 0) break
            for (k in i until minOf(text.length, i + token.length)) marks[k] = true
            from = i + 1
        }
    }
    return buildAnnotatedString {
        var i = 0
        while (i < text.length) {
            val start = i
            val marked = marks[i]
            while (i < text.length && marks[i] == marked) i++
            if (marked) {
                pushStyle(SpanStyle(color = Palette.Blue, background = Color(0x1F0A6CFF)))
                append(text.substring(start, i))
                pop()
            } else {
                append(text.substring(start, i))
            }
        }
    }
}
