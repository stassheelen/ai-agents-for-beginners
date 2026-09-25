import { checkDeviceKey } from "@/lib/auth";
import { json } from "@/lib/http";
import { getStore } from "@/lib/storeFactory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/products — довідник продукції для майбутнього автоматичного оновлення.
 * Поки SP_PRODUCTS_LIST не задано, повертає 501 — планшет пропонує імпорт CSV/XLSX.
 */
export async function GET(request: Request) {
  const auth = checkDeviceKey(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const store = getStore();
  if (!store) return json({ error: "not_configured" }, 501);
  try {
    const products = await store.listProducts();
    if (products === null) return json({ error: "not_configured" }, 501);
    return json({ products, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("GET /api/products failed", e);
    return json({ error: "SharePoint тимчасово недоступний" }, 503);
  }
}
