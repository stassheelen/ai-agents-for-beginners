import { describe, expect, it } from "vitest";
import { processEvents } from "@/lib/events";
import { GoogleSheetsEventStore } from "@/lib/googleSheets";
import { parseEventsBody } from "@/lib/validation";
import { FakeSheet, loadAppsScript } from "./appsScriptHarness";
import { makeEvent } from "./helpers";

const parse = (events: unknown[]) => {
  const parsed = parseEventsBody({ events });
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.items;
};

function setup(storeSecret = "s3cret") {
  const gas = loadAppsScript("s3cret");
  const store = new GoogleSheetsEventStore({ scriptUrl: "https://script.google.com/x/exec", secret: storeSecret }, gas.fetchImpl);
  return { gas, store };
}

describe("Google Sheets store + Apps Script (Code.gs)", () => {
  it("creates the «Події» sheet with headers and writes events as rows", async () => {
    const { gas, store } = setup();
    const res = await processEvents(parse([makeEvent(), makeEvent({ eventType: "PHASE_END", durationSeconds: 6753 })]), store);
    expect(res.created).toBe(2);
    const sheet = gas.sheets.get("Події")!;
    expect(sheet.data[0].slice(0, 5)).toEqual(["EventId", "RecordId", "Timestamp", "EventType", "SKU"]);
    expect(sheet.getLastRow()).toBe(3);
    const row = sheet.data[1];
    expect(row[4]).toBe("000123"); // SKU лишається текстом з нулями
    expect(row[2]).toBeInstanceOf(Date);
    expect(sheet.data[2][9]).toBe(6753);
    expect(gas.isLocked()).toBe(false);
  });

  it("never duplicates: the same batch sent again returns duplicate", async () => {
    const { gas, store } = setup();
    const events = Array.from({ length: 100 }, () => makeEvent());
    await processEvents(parse(events), store);
    const again = await processEvents(parse(events), store);
    expect(again.duplicates).toBe(100);
    expect(gas.sheets.get("Події")!.getLastRow()).toBe(101);
  });

  it("updates a comment in place and neutralises formula injection", async () => {
    const { gas, store } = setup();
    const e = makeEvent();
    await processEvents(parse([e]), store);
    const res = await processEvents(parse([{ ...e, comment: "=HYPERLINK(\"x\")" }]), store);
    expect(res.updated).toBe(1);
    const sheet = gas.sheets.get("Події")!;
    expect(sheet.getLastRow()).toBe(2);
    expect(sheet.data[1][12]).toBe("'=HYPERLINK(\"x\")");
  });

  it("reports a clear error when the secret does not match", async () => {
    const { store } = setup("wrong");
    await expect(processEvents(parse([makeEvent()]), store)).rejects.toThrow(/Секрет не збігається/);
    const health = await store.health();
    expect(health.ok).toBe(false);
  });

  it("health names the spreadsheet and sheet", async () => {
    const { store } = setup();
    expect(await store.health()).toEqual({ configured: true, ok: true, name: "Фіксатор часу → Події" });
  });

  it("serves the «Довідник» sheet as the product catalog", async () => {
    const { gas, store } = setup();
    expect(await store.listProducts()).toBeNull();
    const products = new FakeSheet("Довідник");
    products.data = [
      ["Артикул ГП", "Артикул МХП", "Найменування", "Торгова група"],
      ["144", "УБ14400", "УБ Сос Філейні 1с п/а", "Сосиски"],
      ["107005", "", "УБ Сос МІНІ з курячим філе", "Сосиски"],
    ];
    gas.sheets.set("Довідник", products);
    const list = await store.listProducts();
    expect(list).toEqual([
      { sku: "144", type: "УБ Сос Філейні 1с п/а", article: "УБ14400", group: "Сосиски" },
      { sku: "107005", type: "УБ Сос МІНІ з курячим філе", article: "", group: "Сосиски" },
    ]);
  });
});
