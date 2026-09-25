import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/events/route";
import { GET as health } from "@/app/api/health/route";
import { GET as products } from "@/app/api/products/route";
import { InMemoryEventStore } from "@/lib/store";
import { setStoreForTests } from "@/lib/storeFactory";
import { makeEvent } from "./helpers";

const KEY = "test-device-key";
let store: InMemoryEventStore;

const post = (body: unknown, key: string | null = KEY) =>
  POST(
    new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { "x-api-key": key } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  process.env.DEVICE_API_KEYS = `other-key, ${KEY}`;
  store = new InMemoryEventStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

describe("POST /api/events", () => {
  it("requires a valid device key", async () => {
    expect((await post({ events: [makeEvent()] }, null)).status).toBe(401);
    expect((await post({ events: [makeEvent()] }, "wrong")).status).toBe(401);
  });

  it("stores events idempotently", async () => {
    const events = Array.from({ length: 7 }, () => makeEvent());
    const first = await (await post({ events })).json();
    expect(first.created).toBe(7);
    const retry = await (await post({ events })).json();
    expect(retry.duplicates).toBe(7);
    expect(store.items.size).toBe(7);
  });

  it("rejects malformed json and oversized batches", async () => {
    expect((await post("{not json")).status).toBe(400);
    const tooMany = Array.from({ length: 501 }, () => makeEvent());
    expect((await post({ events: tooMany })).status).toBe(413);
  });

  it("returns 503 when the store throws so the tablet keeps events PENDING", async () => {
    store.findExisting = async () => {
      throw new Error("SharePoint down");
    };
    expect((await post({ events: [makeEvent()] })).status).toBe(503);
  });
});

describe("GET /api/health and /api/products", () => {
  it("reports SharePoint status", async () => {
    const res = await health(new Request("http://localhost/api/health", { headers: { "x-api-key": KEY } }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sharepoint.ok).toBe(true);
  });

  it("returns 501 until the products list is configured", async () => {
    const req = () => new Request("http://localhost/api/products", { headers: { "x-api-key": KEY } });
    expect((await products(req())).status).toBe(501);
    store.products = [{ sku: "000123", type: "Ковбаса варена", article: "A-4587", group: null }];
    const body = await (await products(req())).json();
    expect(body.products).toHaveLength(1);
  });
});
