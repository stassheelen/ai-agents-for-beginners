import { describe, expect, it } from "vitest";
import { processEvents } from "@/lib/events";
import { InMemoryEventStore } from "@/lib/store";
import { parseEventsBody } from "@/lib/validation";
import { makeEvent } from "./helpers";

const parse = (body: unknown) => {
  const parsed = parseEventsBody(body);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.items;
};

describe("processEvents", () => {
  it.each([1, 10, 50, 100])("creates a batch of %i events", async (n) => {
    const store = new InMemoryEventStore();
    const events = Array.from({ length: n }, () => makeEvent());
    const res = await processEvents(parse({ events }), store);
    expect(res.created).toBe(n);
    expect(res.failed).toBe(0);
    expect(store.items.size).toBe(n);
  });

  it("does not create duplicates when the same batch is sent twice", async () => {
    const store = new InMemoryEventStore();
    const events = [makeEvent(), makeEvent({ eventType: "PHASE_END", durationSeconds: 6753 })];
    await processEvents(parse({ events }), store);
    const second = await processEvents(parse({ events }), store);
    expect(second.duplicates).toBe(2);
    expect(second.created).toBe(0);
    expect(store.items.size).toBe(2);
  });

  it("collapses repeated eventIds inside one batch", async () => {
    const store = new InMemoryEventStore();
    const e = makeEvent();
    const res = await processEvents(parse({ events: [e, e, e] }), store);
    expect(res.created).toBe(1);
    expect(store.items.size).toBe(1);
  });

  it("updates the comment of an existing event instead of duplicating it", async () => {
    const store = new InMemoryEventStore();
    const e = makeEvent();
    await processEvents(parse([e]), store);
    const res = await processEvents(parse([{ ...e, comment: "Заміна ножа" }]), store);
    expect(res.updated).toBe(1);
    expect(store.items.size).toBe(1);
    expect(store.items.get(e.eventId)!.event.comment).toBe("Заміна ножа");
  });

  it("rejects only the invalid event and keeps the rest", async () => {
    const store = new InMemoryEventStore();
    const bad = makeEvent({ eventType: "LUNCH" });
    const good = makeEvent({ eventType: "DOWNTIME_START", downtimeReason: "Відсутність матеріалу" });
    const res = await processEvents(parse({ events: [bad, good] }), store);
    expect(res.created).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results.find((r) => r.eventId === bad.eventId)?.status).toBe("error");
  });
});

describe("parseEventsBody", () => {
  it("accepts a single event, an array and { events }", () => {
    const e = makeEvent();
    expect(parse(e)).toHaveLength(1);
    expect(parse([e, makeEvent()])).toHaveLength(2);
    expect(parse({ events: [e] })).toHaveLength(1);
  });

  it("validates timestamp and uuid", () => {
    const items = parse([makeEvent({ timestamp: "25.09.2026 14:32" }), makeEvent({ eventId: "abc" })]);
    expect(items.every((i) => !i.ok)).toBe(true);
  });

  it("normalises blank strings to null", () => {
    const [item] = parse([makeEvent({ comment: "  ", downtimeReason: "" })]);
    expect(item.ok && item.event.comment).toBeNull();
    expect(item.ok && item.event.downtimeReason).toBeNull();
  });
});
