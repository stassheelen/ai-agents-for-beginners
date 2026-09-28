// Фіксатор часу: Google Таблиця як сховище подій (інструкція: production-time-tracker/README.md).
const SHARED_SECRET = ''; // той самий, що GOOGLE_SCRIPT_SECRET у Vercel
const EV = 'Події', PR = 'Довідник', TZ = 'Europe/Kyiv', CC = 13;
const H = ['EventId','RecordId','Timestamp','EventType','SKU','Article','ProductName','QuantityKg','Phase','DurationSeconds','Duration','DowntimeReason','Comment','RecordComment','DeviceId','TimestampUtc','CreatedAt','ReceivedAt'];
const F = ['@','@','dd.mm.yyyy hh:mm:ss','@','@','@','@','0.00','@','0','[h]:mm:ss','@','@','@','@','@','@','dd.mm.yyyy hh:mm:ss'];

function doGet() { return out_({ ok: true, service: 'fiksator-chasu' }); }

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad json' }); }
  const s = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || SHARED_SECRET;
  if (!s) return out_({ ok: false, error: 'SHARED_SECRET not set' });
  if (b.token !== s) return out_({ ok: false, error: 'unauthorized' });
  try {
    if (b.action === 'health') {
      const sh = sheet_();
      return out_({ ok: true, spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(), sheet: sh.getName(), events: Math.max(sh.getLastRow() - 1, 0) });
    }
    if (b.action === 'upsertEvents') return out_({ ok: true, results: upsert_(b.events || []) });
    if (b.action === 'products') return out_(Object.assign({ ok: true }, products_()));
    return out_({ ok: false, error: 'unknown action' });
  } catch (x) { return out_({ ok: false, error: String((x && x.message) || x) }); }
}

// Запис під блокуванням + перевірка EventId: дублів не буде.
function upsert_(evs) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(), last = sh.getLastRow(), ids = new Map(), res = [], rows = [], now = new Date();
    if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => ids.set(String(r[0]), i + 2));
    for (const e of evs) {
      if (!e || !e.eventId) { res.push({ eventId: '', status: 'error', error: 'no eventId' }); continue; }
      const r = ids.get(e.eventId);
      if (r === undefined) {
        rows.push(row_(e, now)); ids.set(e.eventId, -1);
        res.push({ eventId: e.eventId, status: 'created' }); continue;
      }
      let st = 'duplicate';
      if (r > 0) {
        const g = sh.getRange(r, CC, 1, 2), c = g.getValues()[0], a = e.comment || '', d = e.recordComment || '';
        if (String(c[0]) !== a || String(c[1]) !== d) { g.setValues([[safe_(a), safe_(d)]]); st = 'updated'; }
      }
      res.push({ eventId: e.eventId, status: st });
    }
    if (rows.length) {
      const g = sh.getRange(last + 1, 1, rows.length, H.length);
      g.setNumberFormats(rows.map(() => F)); g.setValues(rows);
    }
    SpreadsheetApp.flush();
    return res;
  } finally { lock.releaseLock(); }
}

function row_(e, now) {
  const s = e.durationSeconds == null ? '' : Number(e.durationSeconds);
  return [e.eventId, e.recordId || '', new Date(e.timestamp), e.eventType, safe_(e.sku), safe_(e.article), safe_(e.productName),
    e.quantityKg == null ? '' : Number(e.quantityKg), safe_(e.phase), s, s === '' ? '' : s / 86400, safe_(e.downtimeReason),
    safe_(e.comment), safe_(e.recordComment), safe_(e.deviceId), e.timestamp, e.createdAt, now];
}

function safe_(v) { const s = v == null ? '' : String(v); return /^[=+@]/.test(s) ? "'" + s : s; }

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(EV);
  if (!sh) {
    sh = ss.insertSheet(EV, 0); ss.setSpreadsheetTimeZone(TZ);
    sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold'); sh.setFrozenRows(1);
  }
  return sh;
}

// Аркуш «Довідник» (необов'язково): SKU/Артикул ГП, Вид/Найменування, Артикул, Група.
function products_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PR);
  if (!sh || sh.getLastRow() < 2) return { products: null };
  const v = sh.getDataRange().getDisplayValues();
  const h = v[0].map(x => String(x).toLowerCase().replace(/[^0-9a-zа-яіїєґ]/g, ''));
  const c = a => h.findIndex(x => a.indexOf(x) >= 0);
  const k = c(['sku','скю','артикулгп','код']), t = c(['вид','найменування','назва']), a = c(['артикул','артикулмхп']), g = c(['торговагрупа','група']);
  if (k < 0 || t < 0) return { products: null, error: 'Довідник: потрібні колонки SKU та Вид' };
  const p = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!String(r[k]).trim()) continue;
    p.push({ sku: String(r[k]).trim(), type: String(r[t]).trim(), article: a >= 0 ? String(r[a]).trim() : null, group: g >= 0 ? String(r[g]).trim() || null : null });
  }
  return { products: p };
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
