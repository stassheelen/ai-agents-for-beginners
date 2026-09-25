import { describe, expect, it } from "vitest";
import { GraphClient } from "@/lib/graph";
import { SharePointEventStore, toListFields } from "@/lib/sharepoint";
import { EventSchema } from "@/lib/validation";
import { makeEvent } from "./helpers";

const config = {
  tenantId: "t",
  clientId: "c",
  clientSecret: "s",
  siteUrl: "https://contoso.sharepoint.com/sites/Production",
  eventsList: "ProductionEvents",
};

/** Імітація Graph: токен, пошук сайту та $batch зі списком з унікальним EventId. */
function fakeGraph() {
  const items = new Map<string, Record<string, unknown>>();
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("login.microsoftonline.com")) {
      return Response.json({ access_token: "token", expires_in: 3600 });
    }
    if (url.includes("/sites/contoso.sharepoint.com:/sites/Production")) {
      return Response.json({ id: "site-1" });
    }
    if (url.endsWith("/$batch")) {
      const { requests } = JSON.parse(String(init!.body));
      const responses = requests.map((r: { id: string; method: string; url: string; body?: { fields: Record<string, unknown> } }) => {
        if (r.method === "GET") {
          const id = /EventId eq '([^']+)'/.exec(decodeURIComponent(r.url))![1];
          const f = items.get(id);
          return { id: r.id, status: 200, body: { value: f ? [{ id: "1", fields: f }] : [] } };
        }
        if (r.method === "POST") {
          const fields = r.body!.fields;
          if (items.has(fields.EventId as string)) {
            return { id: r.id, status: 409, body: { error: { message: "duplicate values" } } };
          }
          items.set(fields.EventId as string, fields);
          return { id: r.id, status: 201, body: { id: "1" } };
        }
        return { id: r.id, status: 200, body: {} };
      });
      return Response.json({ responses });
    }
    return Response.json({ error: { message: "unexpected " + url } }, { status: 404 });
  }) as typeof fetch;
  return { items, calls, fetchImpl };
}

describe("SharePointEventStore", () => {
  it("maps event fields to list columns", () => {
    const e = EventSchema.parse(makeEvent({ eventType: "DOWNTIME_START", downtimeReason: "Санітарія" }));
    const f = toListFields(e);
    expect(f).toMatchObject({ EventId: e.eventId, SKU: "000123", QuantityKg: 125.5, DowntimeReason: "Санітарія" });
    expect(f.Title).toBe("DOWNTIME_START · 000123");
  });

  it("resolves the site, batches 25 creates into 2 Graph batches and reports conflicts as duplicates", async () => {
    const g = fakeGraph();
    const store = new SharePointEventStore(config, new GraphClient(config, g.fetchImpl));
    const events = Array.from({ length: 25 }, () => EventSchema.parse(makeEvent()));
    const created = await store.create(events);
    expect([...created.values()].every((o) => o.status === "created")).toBe(true);
    expect(g.calls.filter((c) => c.endsWith("/$batch"))).toHaveLength(2);
    expect(g.calls.filter((c) => c.includes("login.microsoftonline.com"))).toHaveLength(1);

    const again = await store.create(events.slice(0, 3));
    expect([...again.values()].every((o) => o.status === "duplicate")).toBe(true);

    const found = await store.findExisting([events[0].eventId, "00000000-0000-4000-8000-000000000000"]);
    expect(found.size).toBe(1);
  });
});
