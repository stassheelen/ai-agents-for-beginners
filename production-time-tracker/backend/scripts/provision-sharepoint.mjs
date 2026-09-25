// Створює (або доповнює) SharePoint-список подій через Microsoft Graph.
// Запуск: npm run provision   (читає змінні з .env.local)
//
// Потрібні змінні: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
// SP_SITE_URL або SP_SITE_ID, SP_EVENTS_LIST (за замовчуванням ProductionEvents).
// Додатково, якщо задано SP_PRODUCTS_LIST, створюється список довідника продукції.

const GRAPH = "https://graph.microsoft.com/v1.0";
const env = (k) => process.env[k]?.trim() || undefined;

const EVENT_COLUMNS = [
  { name: "EventId", text: {}, indexed: true, enforceUniqueValues: true, required: true },
  { name: "RecordId", text: {}, indexed: true },
  { name: "SKU", text: {}, indexed: true },
  { name: "ProductName", text: {} },
  { name: "Article", text: {} },
  { name: "QuantityKg", number: { decimalPlaces: "two" } },
  { name: "Phase", text: {} },
  { name: "EventType", text: {}, indexed: true },
  { name: "Timestamp", dateTime: { format: "dateTime" }, indexed: true },
  { name: "DurationSeconds", number: { decimalPlaces: "none" } },
  { name: "DowntimeReason", text: {} },
  { name: "Comment", text: { allowMultipleLines: true } },
  { name: "RecordComment", text: { allowMultipleLines: true } },
  { name: "DeviceId", text: {}, indexed: true },
  { name: "CreatedAt", dateTime: { format: "dateTime" } },
];

const PRODUCT_COLUMNS = [
  { name: "SKU", text: {}, indexed: true, enforceUniqueValues: true, required: true },
  { name: "ProductType", text: {} },
  { name: "Article", text: {}, indexed: true },
  { name: "ProductGroup", text: {} },
];

async function token() {
  const res = await fetch(`https://login.microsoftonline.com/${env("AZURE_TENANT_ID")}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env("AZURE_CLIENT_ID"),
      client_secret: env("AZURE_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Токен не отримано: " + (json.error_description ?? res.status));
  return json.access_token;
}

async function main() {
  for (const k of ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"]) {
    if (!env(k)) throw new Error(`Не задано ${k}`);
  }
  const auth = { authorization: `Bearer ${await token()}`, "content-type": "application/json" };
  const graph = async (method, path, body) => {
    const res = await fetch(GRAPH + path, { method, headers: auth, body: body ? JSON.stringify(body) : undefined });
    const json = res.status === 204 ? {} : await res.json();
    if (!res.ok) throw new Error(`${method} ${path}: ${json.error?.message ?? res.status}`);
    return json;
  };

  let siteId = env("SP_SITE_ID");
  if (!siteId) {
    const url = new URL(env("SP_SITE_URL") ?? "");
    siteId = (await graph("GET", `/sites/${url.hostname}:${url.pathname.replace(/\/+$/, "") || "/"}`)).id;
  }
  console.log("Сайт:", siteId);

  async function ensureList(displayName, columns) {
    const lists = await graph("GET", `/sites/${siteId}/lists?$select=id,displayName&$top=999`);
    let list = lists.value.find((l) => l.displayName === displayName);
    if (!list) {
      list = await graph("POST", `/sites/${siteId}/lists`, {
        displayName,
        columns,
        list: { template: "genericList" },
      });
      console.log(`✓ Створено список «${displayName}» (${list.id})`);
      return list;
    }
    const existing = await graph("GET", `/sites/${siteId}/lists/${list.id}/columns?$select=name`);
    const names = new Set(existing.value.map((c) => c.name));
    for (const column of columns) {
      if (names.has(column.name)) continue;
      await graph("POST", `/sites/${siteId}/lists/${list.id}/columns`, column);
      console.log(`  + колонка ${column.name}`);
    }
    console.log(`✓ Список «${displayName}» вже існує (${list.id}), колонки перевірено`);
    return list;
  }

  const events = await ensureList(env("SP_EVENTS_LIST") ?? "ProductionEvents", EVENT_COLUMNS);
  if (env("SP_PRODUCTS_LIST")) await ensureList(env("SP_PRODUCTS_LIST"), PRODUCT_COLUMNS);

  console.log("\nДодайте у Vercel Environment Variables:");
  console.log(`  SP_SITE_ID=${siteId}`);
  console.log(`  SP_EVENTS_LIST=${events.id}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
