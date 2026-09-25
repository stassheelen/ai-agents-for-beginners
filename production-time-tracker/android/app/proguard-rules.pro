# DTO-класи серіалізуються kotlinx.serialization (правила постачаються бібліотекою).
-keep class ua.prod.timetracker.data.remote.dto.** { *; }
# Room-сутності.
-keep class ua.prod.timetracker.data.local.entity.** { *; }
# Retrofit-інтерфейс із suspend-функціями.
-keep,allowobfuscation,allowshrinking interface ua.prod.timetracker.data.remote.api.TimeTrackerApi
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
