/**
 * Фіксатор часу — Google Таблиця як сховище подій виробництва.
 *
 * Встановлення (один раз):
 *  1. Відкрийте Google Таблицю → Розширення → Apps Script → вставте цей код замість вмісту Code.gs.
 *  2. Секрет: або впишіть його в SHARED_SECRET нижче, або (надійніше) додайте властивість скрипту
 *     SHARED_SECRET: Налаштування проєкту (⚙) → Властивості скрипту. Має збігатися з GOOGLE_SCRIPT_SECRET у Vercel.
 *  3. Розгорнути → Нове розгортання → Тип «Вебдодаток» → Виконувати як: «Я», Доступ: «Усі» → Розгорнути.
 *  4. Скопіюйте URL вебдодатка (…/exec) у змінну GOOGLE_SCRIPT_URL у Vercel.
 *
 * Аркуш «Події» створюється автоматично. EventId — ключ ідемпотентності: запис іде під
 * блокуванням (LockService), тому повторна або паралельна відправка не створює дублів.
 * Необов'язковий аркуш «Довідник» (SKU, Вид, Артикул, Група) віддається планшету як довідник продукції.
 */

// Спільний секрет (той самий, що GOOGLE_SCRIPT_SECRET у Vercel). Властивість скрипту SHARED_SECRET має пріоритет.
const SHARED_SECRET = '';

const EVENTS_SHEET = 'Події';
const PRODUCTS_SHEET = 'Довідник';
const TIME_ZONE = 'Europe/Kyiv';

// EventId має бути першою колонкою; Comment і RecordComment — поруч.
const HEADERS = [
  'EventId', 'RecordId', 'Timestamp', 'EventType', 'SKU', 'Article', 'ProductName', 'QuantityKg', 'Phase',
  'DurationSeconds', 'Duration', 'DowntimeReason', 'Comment', 'RecordComment', 'DeviceId',
  'TimestampUtc', 'CreatedAt', 'ReceivedAt',
];
const FORMATS = [
  '@', '@', 'dd.mm.yyyy hh:mm:ss', '@', '@', '@', '@', '0.00', '@',
  '0', '[h]:mm:ss', '@', '@', '@', '@',
  '@', '@', 'dd.mm.yyyy hh:mm:ss',
];
const COMMENT_COL = HEADERS.indexOf('Comment') + 1;

function doGet() {
  return json_({ ok: true, service: 'fiksator-chasu', message: 'Працює. Дані приймаються лише через POST.' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Некоректний JSON' });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || SHARED_SECRET;
  if (!secret) return json_({ ok: false, error: 'У властивостях скрипту не задано SHARED_SECRET' });
  if (body.token !== secret) return json_({ ok: false, error: 'unauthorized' });

  try {
    switch (body.action) {
      case 'health':
        return json_(health_());
      case 'upsertEvents':
        return json_({ ok: true, results: upsertEvents_(body.events || []) });
      case 'products':
        return json_(Object.assign({ ok: true }, readProducts_()));
      default:
        return json_({ ok: false, error: 'Невідома дія: ' + body.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function health_() {
  const sheet = eventsSheet_();
  return {
    ok: true,
    spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
    sheet: sheet.getName(),
    events: Math.max(sheet.getLastRow() - 1, 0),
  };
}

/** Додає нові події, для вже існуючих — оновлює коментарі. Повертає статус кожної події. */
function upsertEvents_(events) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = eventsSheet_();
    const lastRow = sheet.getLastRow();
    const rowById = new Map();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).getValues()
        .forEach((r, i) => rowById.set(String(r[0]), i + 2));
    }

    const receivedAt = new Date();
    const results = [];
    const newRows = [];
    for (const ev of events) {
      if (!ev || !ev.eventId) {
        results.push({ eventId: ev && ev.eventId ? ev.eventId : '', status: 'error', error: 'немає eventId' });
        continue;
      }
      const row = rowById.get(ev.eventId);
      if (row === undefined) {
        newRows.push(toRow_(ev, receivedAt));
        rowById.set(ev.eventId, -1);
        results.push({ eventId: ev.eventId, status: 'created' });
      } else if (row === -1) {
        results.push({ eventId: ev.eventId, status: 'duplicate' });
      } else {
        const range = sheet.getRange(row, COMMENT_COL, 1, 2);
        const current = range.getValues()[0];
        const comment = ev.comment || '';
        const recordComment = ev.recordComment || '';
        if (String(current[0]) !== comment || String(current[1]) !== recordComment) {
          range.setValues([[safe_(comment), safe_(recordComment)]]);
          results.push({ eventId: ev.eventId, status: 'updated' });
        } else {
          results.push({ eventId: ev.eventId, status: 'duplicate' });
        }
      }
    }

    if (newRows.length) {
      const range = sheet.getRange(lastRow + 1, 1, newRows.length, HEADERS.length);
      range.setNumberFormats(newRows.map(() => FORMATS));
      range.setValues(newRows);
    }
    SpreadsheetApp.flush();
    return results;
  } finally {
    lock.releaseLock();
  }
}

function toRow_(ev, receivedAt) {
  const seconds = ev.durationSeconds == null ? '' : Number(ev.durationSeconds);
  return [
    ev.eventId,
    ev.recordId || '',
    new Date(ev.timestamp),
    ev.eventType,
    safe_(ev.sku),
    safe_(ev.article || ''),
    safe_(ev.productName || ''),
    ev.quantityKg == null ? '' : Number(ev.quantityKg),
    safe_(ev.phase || ''),
    seconds,
    seconds === '' ? '' : seconds / 86400,
    safe_(ev.downtimeReason || ''),
    safe_(ev.comment || ''),
    safe_(ev.recordComment || ''),
    safe_(ev.deviceId),
    ev.timestamp,
    ev.createdAt,
    receivedAt,
  ];
}

/** Текст, що починається з =, + або @, Таблиця сприйняла б як формулу. */
function safe_(value) {
  const s = String(value == null ? '' : value);
  return /^[=+@]/.test(s) ? "'" + s : s;
}

function eventsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EVENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(EVENTS_SHEET, 0);
    ss.setSpreadsheetTimeZone(TIME_ZONE);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#f1f3f4');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Аркуш «Довідник»: перший рядок — заголовки (SKU / СКЮ / Артикул ГП, Вид / Найменування, Артикул, Група). */
function readProducts_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return { products: null };
  const values = sheet.getDataRange().getDisplayValues();
  const header = values[0].map((h) => String(h).toLowerCase().replace(/[^0-9a-zа-яіїєґ]/g, ''));
  const col = (aliases) => header.findIndex((h) => aliases.indexOf(h) >= 0);
  const sku = col(['sku', 'скю', 'ску', 'артикулгп', 'код', 'кодгп']);
  const type = col(['вид', 'найменування', 'назва', 'type', 'name']);
  const article = col(['артикул', 'артикулмхп', 'article']);
  const group = col(['торговагрупа', 'група', 'group', 'категорія']);
  if (sku < 0 || type < 0) return { products: null, error: 'В аркуші «Довідник» потрібні колонки SKU та Вид' };
  const products = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!String(r[sku]).trim()) continue;
    products.push({
      sku: String(r[sku]).trim(),
      type: String(r[type]).trim(),
      article: article >= 0 ? String(r[article]).trim() : null,
      group: group >= 0 ? String(r[group]).trim() || null : null,
    });
  }
  return { products: products };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
