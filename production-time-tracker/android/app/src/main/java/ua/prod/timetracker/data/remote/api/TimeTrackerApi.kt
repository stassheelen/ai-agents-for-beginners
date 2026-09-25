package ua.prod.timetracker.data.remote.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Url
import ua.prod.timetracker.data.remote.dto.EventBatchRequestDto
import ua.prod.timetracker.data.remote.dto.EventBatchResponseDto
import ua.prod.timetracker.data.remote.dto.HealthResponseDto
import ua.prod.timetracker.data.remote.dto.ProductsResponseDto

/**
 * API бекенду на Vercel. Адреса задається в налаштуваннях планшета, тому використовується @Url.
 * Жодних секретів Microsoft у додатку немає — лише ключ пристрою для доступу до власного API.
 */
interface TimeTrackerApi {

    @POST
    suspend fun postEvents(
        @Url url: String,
        @Header(API_KEY_HEADER) apiKey: String?,
        @Body body: EventBatchRequestDto,
    ): EventBatchResponseDto

    @GET
    suspend fun getProducts(
        @Url url: String,
        @Header(API_KEY_HEADER) apiKey: String?,
    ): ProductsResponseDto

    @GET
    suspend fun health(
        @Url url: String,
        @Header(API_KEY_HEADER) apiKey: String?,
    ): HealthResponseDto

    companion object {
        const val API_KEY_HEADER = "x-api-key"

        fun endpoint(baseUrl: String, path: String): String = baseUrl.trim().trimEnd('/') + path
    }
}
