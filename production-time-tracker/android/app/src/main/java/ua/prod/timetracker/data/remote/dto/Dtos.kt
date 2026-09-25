package ua.prod.timetracker.data.remote.dto

import kotlinx.serialization.Serializable

/** Подія у форматі API (POST /api/events). */
@Serializable
data class EventDto(
    val eventId: String,
    val recordId: String,
    val sku: String,
    val productName: String,
    val article: String,
    val quantityKg: Double?,
    val phase: String?,
    val eventType: String,
    val timestamp: String,
    val durationSeconds: Long?,
    val downtimeReason: String?,
    val comment: String?,
    val recordComment: String?,
    val deviceId: String,
    val createdAt: String,
)

@Serializable
data class EventBatchRequestDto(val events: List<EventDto>)

/** status: created | duplicate | updated | error */
@Serializable
data class EventResultDto(
    val eventId: String,
    val status: String,
    val error: String? = null,
)

@Serializable
data class EventBatchResponseDto(
    val results: List<EventResultDto> = emptyList(),
    val created: Int = 0,
    val duplicates: Int = 0,
    val failed: Int = 0,
)

@Serializable
data class ProductDto(
    val sku: String,
    val type: String,
    val article: String? = null,
    val group: String? = null,
)

@Serializable
data class ProductsResponseDto(
    val products: List<ProductDto> = emptyList(),
    val updatedAt: String? = null,
)

@Serializable
data class SharePointStatusDto(
    val configured: Boolean = false,
    val ok: Boolean = false,
    val listName: String? = null,
    val error: String? = null,
)

@Serializable
data class HealthResponseDto(
    val ok: Boolean = false,
    val time: String? = null,
    val sharepoint: SharePointStatusDto? = null,
)
