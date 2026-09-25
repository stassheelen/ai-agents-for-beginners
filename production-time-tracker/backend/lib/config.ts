/** Налаштування з Vercel Environment Variables. Жодних секретів у коді чи в Android-додатку. */
export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId?: string;
  siteUrl?: string;
  eventsList: string;
  productsList?: string;
}

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export function deviceApiKeys(): string[] {
  return (env("DEVICE_API_KEYS") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/** null — якщо SharePoint ще не налаштовано. */
export function graphConfig(): GraphConfig | null {
  const tenantId = env("AZURE_TENANT_ID");
  const clientId = env("AZURE_CLIENT_ID");
  const clientSecret = env("AZURE_CLIENT_SECRET");
  const siteId = env("SP_SITE_ID");
  const siteUrl = env("SP_SITE_URL");
  if (!tenantId || !clientId || !clientSecret || (!siteId && !siteUrl)) return null;
  return {
    tenantId,
    clientId,
    clientSecret,
    siteId,
    siteUrl,
    eventsList: env("SP_EVENTS_LIST") ?? "ProductionEvents",
    productsList: env("SP_PRODUCTS_LIST"),
  };
}

export const MAX_EVENTS_PER_REQUEST = 500;
