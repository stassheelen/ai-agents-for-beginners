package ua.prod.timetracker.domain.logic

import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.util.SearchText

/**
 * Впорядковує результати пошуку, щоб потрібна позиція була першою:
 *  0 — точний збіг артикулу або СКЮ;
 *  1 — артикул / СКЮ починається із запиту;
 *  2 — запит міститься в артикулі / СКЮ;
 *  3 — збіг лише у виді / групі.
 */
object SearchRanker {

    fun rank(products: List<Product>, query: String): List<Product> {
        val q = SearchText.compact(query)
        if (q.isEmpty()) return products
        return products
            .map { it to score(it, q) }
            .sortedWith(
                compareBy<Pair<Product, Int>> { it.second }
                    .thenBy { SearchText.compact(it.first.headline) }
                    .thenBy { it.first.sku },
            )
            .map { it.first }
    }

    private fun score(product: Product, q: String): Int {
        val article = SearchText.compact(product.article)
        val sku = SearchText.compact(product.sku)
        return when {
            article == q || sku == q -> 0
            (article.isNotEmpty() && article.startsWith(q)) || sku.startsWith(q) -> 1
            article.contains(q) || sku.contains(q) -> 2
            else -> 3
        }
    }

    /** Чи відповідає позиція запиту (кожне слово запиту має бути знайдене). Дзеркало SQL-логіки. */
    fun matches(product: Product, query: String): Boolean {
        val text = SearchText.indexText(product.sku, product.article, product.type, product.group)
        return SearchText.tokens(query).all { text.contains(it) }
    }
}
