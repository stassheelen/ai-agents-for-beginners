import { checkDeviceKey } from "@/lib/auth";
import { MAX_EVENTS_PER_REQUEST } from "@/lib/config";
import { processEvents } from "@/lib/events";
import { json } from "@/lib/http";
import { getStore } from "@/lib/storeFactory";
import { parseEventsBody } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/events — пакет подій (1…500) з планшета.
 * Відповідь 200 містить статус кожної події: created | duplicate | updated | error.
 * Планшет позначає SYNCED лише created / duplicate / updated.
 */
export async function POST(request: Request) {
  const auth = checkDeviceKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректний JSON" }, 400);
  }

  const parsed = parseEventsBody(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  if (parsed.items.length === 0) return json({ results: [], created: 0, duplicates: 0, updated: 0, failed: 0 });
  if (parsed.items.length > MAX_EVENTS_PER_REQUEST) {
    return json({ error: `Максимум ${MAX_EVENTS_PER_REQUEST} подій за запит` }, 413);
  }

  const store = getStore();
  if (!store) return json({ error: "SharePoint не налаштовано на сервері" }, 503);

  try {
    return json(await processEvents(parsed.items, store));
  } catch (e) {
    // Події залишаться на планшеті в статусі PENDING і будуть відправлені повторно.
    console.error("POST /api/events failed", e);
    return json({ error: "SharePoint тимчасово недоступний" }, 503);
  }
}
