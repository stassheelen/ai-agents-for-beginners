# Фіксатор часу — виробничий MVP

Простий Android-додаток для планшета **Samsung Galaxy Tab A9 (Android 16, landscape)**.
Оператор знаходить продукцію, вводить кількість і фазу, а далі лише натискає великі кнопки.
Час фіксується автоматично, **навіть без інтернету**.

```
Знайти артикул → Вибрати продукцію → Ввести кг → Вибрати фазу → ПОЧАТИ ФАЗУ
→ ПОЧАТИ/ЗАВЕРШИТИ ПЕРЕНАЛАДКУ → ПОЧАТИ/ЗАВЕРШИТИ ПРОСТІЙ → ЗАВЕРШИТИ ФАЗУ
```

## Структура

```
production-time-tracker/
├── android/          Android-додаток (Kotlin, Jetpack Compose, Material 3, Room, WorkManager)
├── backend/          API на Vercel (Next.js, TypeScript, Microsoft Graph → SharePoint List)
└── sample-data/      Тестові довідники: 150 позицій (CSV, XLSX) і файл з помилками
```

## Архітектура

```
Натискання кнопки → timestamp (UTC) → Room (PENDING) → ✓ оператору → WorkManager
                                                                        ↓ (є мережа)
                                   POST /api/events (пакети до 100 подій, x-api-key)
                                                                        ↓
                                        Vercel (Next.js) → Microsoft Graph → SharePoint List
                                                                        ↓
                                                              SYNCED на планшеті
```

* **Offline-first.** Подія записується в Room *до* будь-якої спроби відправки. Якщо Wi-Fi, Vercel
  або SharePoint недоступні, подія лишається `PENDING` і відправляється автоматично: при появі
  мережі, після кожної нової події та раз на 15 хвилин (WorkManager переживає перезапуск планшета).
* **Без дублів.** Кожна подія має `eventId` (UUID). Бекенд використовує його як ключ ідемпотентності:
  повторна відправка повертає `duplicate`. Колонка `EventId` у SharePoint індексована
  й має `enforceUniqueValues`, тому дублі неможливі навіть при паралельних запитах.
* **Жодних секретів Microsoft на планшеті.** Планшет знає лише адресу API та ключ пристрою.
  Облікові дані Entra ID зберігаються у Vercel Environment Variables.

### Android (`android/`)

| Шар | Що всередині |
|---|---|
| `domain/model` | `Product`, `ProductionEvent`, `EventType`, `WorkState` (правила доступності кнопок), `DowntimeReason` |
| `domain/logic` | `WorkStateReducer` (стан зі списку подій), `SearchRanker` (ранжування пошуку) |
| `domain/repository` | інтерфейси: `ProductionRepository`, `ProductRepository`, `ProductCatalogSource`, `PhaseRepository`, `SettingsRepository` |
| `data/local` | Room: `products`, `production_events`, `production_records`; DAO; мапери |
| `data/importer` | `CsvReader` (UTF-8 / Windows-1251, `;` `,` Tab), `XlsxReader` (без Apache POI), `ProductTableParser` (перевірка рядків) |
| `data/remote` | Retrofit `TimeTrackerApi`, DTO |
| `data/repository` | реалізації репозиторіїв, джерела довідника: файл і сервер |
| `sync` | `EventSyncer`, `SyncWorker`, `SyncScheduler`, `NetworkMonitor` |
| `di` | `AppContainer` — простий ручний DI |
| `ui` | `home`, `productsearch`, `journal`, `downtime`, `settings`, `components`, `theme` |

Стан кнопок обчислюється з подій у Room (`WorkState`), тому після перезапуску додатка таймери
й доступність кнопок відновлюються. Некоректні послідовності блокуються двічі: в UI (кнопка
сіра з підказкою, наприклад «Спершу завершіть простій») і в транзакції репозиторію
(захист від подвійного натискання).

| Кнопка | Доступна, коли |
|---|---|
| ПОЧАТИ ФАЗУ | вказано кількість і фазу, немає фази / переналадки / простою |
| ЗАВЕРШИТИ ФАЗУ | фаза йде і простій не активний |
| ПОЧАТИ ПЕРЕНАЛАДКУ | фаза не йде, переналадки й простою немає |
| ЗАВЕРШИТИ ПЕРЕНАЛАДКУ | переналадка йде і простій не активний |
| ПРОСТІЙ | простій не активний (можна під час фази / переналадки / очікування) |
| ЗАВЕРШИТИ ПРОСТІЙ | простій активний (кнопка ПРОСТІЙ перетворюється на неї) |

Змінити продукцію можна, коли не йде фаза і немає простою. Під час переналадки теж можна:
типовий сценарій — переналадка на нову продукцію.

### Довідник продукції

Імпорт: **Налаштування → Імпорт CSV / XLSX**. Додаток читає файл, знаходить рядок заголовків
(серед перших 15), перевіряє кожен рядок, показує звіт (усього / буде імпортовано / помилок,
перелік помилок із номерами рядків) і після підтвердження **повністю замінює** довідник однією
транзакцією.

Розпізнавані назви колонок (регістр і пробіли не важливі):

| Поле | Назви колонок |
|---|---|
| SKU (обов'язково) | `SKU`, `СКЮ`, `Артикул ГП`, `Код`, `Код ГП` |
| Вид (обов'язково) | `Вид`, `Найменування`, `Назва`, `Номенклатура` |
| Артикул (колонка обов'язкова) | `Артикул`, `Артикул МХП`, `Article` |
| Група (необов'язково) | `Торгова група`, `Група`, `Категорія` |

Ваш файл (`Артикул ГП / Артикул МХП / Найменування / Торгова група`) імпортується без змін:
688 позицій, 0 помилок. У 137 позицій немає «Артикулу МХП»; їх теж імпортовано, і шукати їх можна
за SKU та назвою.

Перевірки: немає SKU, немає виду, дублікат SKU, порожні рядки (пропускаються), надто довгі
значення. Старий формат `.xls` відхиляється з поясненням. Один поганий рядок не зупиняє імпорт.

**Пошук** повністю офлайн (SQLite у Room), без урахування регістру (включно з кирилицею) і по
частині слова чи номера: `458` → A-4587, A-4588, A-4589. Кілька слів шукаються разом
(`сос філ`), кирилична «А» знаходить латинську «A», а `a4587` знаходить `A-4587`. Точні збіги
артикулу або SKU показуються першими.

«**Оновити довідник з сервера**» використовує `GET /api/products`. Він уже працює, якщо на
бекенді задано `SP_PRODUCTS_LIST`, і проходить ту саму перевірку, що й файл
(`ProductCatalogSource`).

## Збірка й встановлення Android-додатка

Потрібні Android Studio (Narwhal або новіша) або JDK 17+ з Android SDK 36.

```bash
cd production-time-tracker/android
./gradlew assembleDebug          # APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest      # юніт-тести логіки (стан кнопок, імпорт, пошук, формати)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Першого запуску достатньо:

1. **Налаштування → API URL**: `https://production-time-tracker-api.vercel.app`.
2. **Налаштування → Ключ пристрою**: значення з `DEVICE_API_KEYS` на Vercel.
3. **Налаштування → Device ID**: наприклад, `tablet-001` (генерується автоматично).
4. **Налаштування → Імпорт CSV / XLSX**: вибрати файл довідника.
5. Список фаз: **Налаштування → Змінити список фаз** (по одній у рядку).

Рекомендовано увімкнути на планшеті автоматичний час (Налаштування Android → Дата й час):
timestamp береться з годинника планшета.

## Бекенд (Vercel)

API:

| Метод | Шлях | Опис |
|---|---|---|
| `POST` | `/api/events` | `{ "events": [...] }` (також масив або одна подія), 1–500 подій. Відповідь: `results[]` зі статусом кожної події `created` / `duplicate` / `updated` / `error` |
| `GET` | `/api/products` | довідник з SharePoint (`501`, поки не налаштовано) |
| `GET` | `/api/health` | стан API та SharePoint (екран «Налаштування») |

Усі запити вимагають заголовок `x-api-key`. Структура події:

```json
{
  "eventId": "7f1c…-uuid", "recordId": "uuid запису", "sku": "000123",
  "productName": "Ковбаса варена", "article": "A-4587", "quantityKg": 125.5,
  "phase": "Фаза 10 — Формування", "eventType": "PHASE_START",
  "timestamp": "2026-09-25T11:32:18Z", "durationSeconds": null,
  "downtimeReason": null, "comment": null, "recordComment": null,
  "deviceId": "tablet-001", "createdAt": "2026-09-25T11:32:18Z"
}
```

`durationSeconds` заповнюється для подій `*_END` (тривалість обчислює планшет). `recordId` групує
всі події однієї партії, щоб у SharePoint було зручно рахувати тривалості.

### Змінні середовища Vercel

| Змінна | Опис |
|---|---|
| `DEVICE_API_KEYS` | ключі планшетів через кому |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | App registration в Microsoft Entra ID |
| `SP_SITE_URL` або `SP_SITE_ID` | сайт SharePoint, напр. `https://contoso.sharepoint.com/sites/Production` |
| `SP_EVENTS_LIST` | назва або ID списку подій (за замовчуванням `ProductionEvents`) |
| `SP_PRODUCTS_LIST` | необов'язково: список довідника для `GET /api/products` |

### Microsoft Entra ID і SharePoint

1. **Entra ID → App registrations → New registration** (наприклад, «Production Time Tracker»).
2. **API permissions → Microsoft Graph → Application permissions**: `Sites.Selected`
   (рекомендовано) або `Sites.ReadWrite.All`, потім **Grant admin consent**.
3. Для `Sites.Selected` видайте застосунку доступ `write` до потрібного сайту
   (`POST /sites/{site-id}/permissions`, або PnP: `Grant-PnPAzureADAppSitePermission`).
4. **Certificates & secrets → New client secret**. Значення внесіть у Vercel (`AZURE_CLIENT_SECRET`).
5. Створіть список і колонки:

   ```bash
   cd production-time-tracker/backend
   cp .env.example .env.local   # заповніть AZURE_* і SP_SITE_URL
   npm install
   npm run provision            # створить список ProductionEvents з усіма колонками
   ```

Колонки списку `ProductionEvents`:

| Колонка | Тип | Примітка |
|---|---|---|
| EventId | Text | індексована, **унікальна** |
| RecordId | Text | індексована |
| SKU | Text | індексована |
| ProductName | Text | |
| Article | Text | |
| QuantityKg | Number (2 знаки) | |
| Phase | Text | |
| EventType | Text | індексована |
| Timestamp | Date and Time | індексована |
| DurationSeconds | Number | для `*_END` |
| DowntimeReason | Text | |
| Comment | Multiple lines | |
| RecordComment | Multiple lines | |
| DeviceId | Text | індексована |
| CreatedAt | Date and Time | |

`Title` заповнюється автоматично: `PHASE_START · 000123`.

### Локальна розробка бекенду

```bash
cd production-time-tracker/backend
npm install
npm test                         # 19 тестів: ідемпотентність, пакети 1/10/50/100, auth, Graph $batch
DEVICE_API_KEYS=dev EVENT_STORE=memory npm run dev   # API без SharePoint (пам'ять процесу)
```

## Фінальна перевірка

| Сценарій | Як перевірено |
|---|---|
| Імпорт 100+ позицій, пошук за повним і частковим артикулом, SKU, видом | юніт-тести на `sample-data/*` (150 позицій) та на реальному довіднику (688 позицій) |
| Кнопки та послідовності (фаза, переналадка, простій), тривалості | `WorkStateTest`, `FormatsTest` |
| Timestamp у UTC ISO 8601, показ у локальному часі | `FormatsTest` (Europe/Kyiv) |
| Пакети 1 / 10 / 50 / 100 подій, повторна відправка без дублів | `backend/tests/*` + ручна перевірка запущеного API |
| Offline → online | ручна перевірка на планшеті за чек-листом нижче |

Чек-лист на планшеті:

1. Імпортувати `sample-data/products-sample.xlsx` → «Довідник оновлено. Завантажено 150 позицій».
2. Вимкнути Wi-Fi → у шапці 🔴 Офлайн.
3. Вибрати продукцію (`4587`) → ввести `125.50` → вибрати фазу → «Почати фазу».
4. Почати й завершити переналадку, почати простій (причина «Відсутність матеріалу»), завершити
   простій, завершити фазу. Лічильник «Очікують відправки» росте.
5. Журнал подій: усі події на місці з часом і тривалостями.
6. Увімкнути Wi-Fi → 🔄 Синхронізація → «✓ Синхронізовано».
7. У SharePoint: усі події є, дублів немає (EventId унікальні).
