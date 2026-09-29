import "server-only";

export type City = { ref: string; name: string; area?: string };
export type Warehouse = { ref: string; name: string; number: string };

export interface DeliveryProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  searchCities(query: string): Promise<City[]>;
  getWarehouses(cityRef: string, query?: string): Promise<Warehouse[]>;
}

async function npCall<T>(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<T[]> {
  const res = await fetch("https://api.novaposhta.ua/v2.0/json/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.NOVA_POSHTA_API_KEY, modelName, calledMethod, methodProperties }),
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Nova Poshta API ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: T[]; errors?: string[] };
  if (!json.success) throw new Error(json.errors?.join(", ") || "Nova Poshta API error");
  return json.data;
}

/** Nova Poshta — https://developers.novaposhta.ua (enabled when NOVA_POSHTA_API_KEY is set). */
export const novaPoshta: DeliveryProvider = {
  id: "nova_poshta",
  name: "Нова Пошта",
  isConfigured: () => Boolean(process.env.NOVA_POSHTA_API_KEY),
  async searchCities(query) {
    const data = await npCall<{ Addresses: { DeliveryCity: string; MainDescription: string; Area: string }[] }>(
      "Address",
      "searchSettlements",
      { CityName: query, Limit: "10", Page: "1" },
    );
    return (data[0]?.Addresses ?? []).map((a) => ({ ref: a.DeliveryCity, name: a.MainDescription, area: a.Area }));
  },
  async getWarehouses(cityRef, query) {
    const data = await npCall<{ Ref: string; Description: string; Number: string }>("Address", "getWarehouses", {
      CityRef: cityRef,
      FindByString: query ?? "",
      Limit: "50",
      Page: "1",
    });
    return data.map((w) => ({ ref: w.Ref, name: w.Description, number: w.Number }));
  },
};

export const DELIVERY_METHODS = [
  { id: "nova_poshta_branch", label: "Нова Пошта — відділення / поштомат", provider: "nova_poshta" },
  { id: "nova_poshta_courier", label: "Нова Пошта — кур'єр на адресу", provider: "nova_poshta" },
] as const;

export type DeliveryMethodId = (typeof DELIVERY_METHODS)[number]["id"];
