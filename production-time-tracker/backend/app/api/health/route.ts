import { checkDeviceKey } from "@/lib/auth";
import { json } from "@/lib/http";
import { getStore } from "@/lib/storeFactory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — «Статус API» та «Статус SharePoint» на екрані налаштувань планшета. */
export async function GET(request: Request) {
  const auth = checkDeviceKey(request);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const store = getStore();
  const sharepoint = store ? await store.health() : { configured: false, ok: false };
  return json({ ok: true, time: new Date().toISOString(), sharepoint });
}
