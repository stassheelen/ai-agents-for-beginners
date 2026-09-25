package ua.prod.timetracker.data.repository

import kotlinx.coroutines.flow.Flow
import ua.prod.timetracker.data.local.dao.ProductDao
import ua.prod.timetracker.data.local.toDomain
import ua.prod.timetracker.data.local.toEntity
import ua.prod.timetracker.domain.logic.SearchRanker
import ua.prod.timetracker.domain.model.Product
import ua.prod.timetracker.domain.repository.ProductRepository
import ua.prod.timetracker.util.SearchText

class RoomProductRepository(private val dao: ProductDao) : ProductRepository {

    override val count: Flow<Int> = dao.observeCount()

    override suspend fun search(query: String, limit: Int): List<Product> {
        val tokens = SearchText.tokens(query)
        // Беремо із запасом, щоб після ранжування точні збіги гарантовано були вгорі.
        val candidates = dao.search(tokens, limit = if (tokens.isEmpty()) limit else CANDIDATE_LIMIT)
            .map { it.toDomain() }
        return SearchRanker.rank(candidates, query).take(limit)
    }

    override suspend fun replaceAll(products: List<Product>) {
        dao.replaceAll(products.map { it.toEntity() })
    }

    private companion object {
        const val CANDIDATE_LIMIT = 1000
    }
}
