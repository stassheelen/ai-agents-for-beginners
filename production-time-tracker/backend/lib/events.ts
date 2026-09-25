import type { EventStore } from "./store";
import type { ParsedItem, ProductionEvent } from "./validation";

export type EventStatus = "created" | "duplicate" | "updated" | "error";

export interface EventResult {
  eventId: string;
  status: EventStatus;
  error?: string;
}

export interface BatchResponse {
  results: EventResult[];
  created: number;
  duplicates: number;
  updated: number;
  failed: number;
}

/**
 * Ідемпотентна обробка пакета подій.
 *  1. Невалідні події → error (решта пакета обробляється).
 *  2. Повтори eventId у межах пакета зводяться до одного.
 *  3. Уже збережені події → duplicate (дубль не створюється);
 *     якщо змінився коментар — оновлюємо його (updated).
 *  4. Нові — створюються; якщо паралельний запит встиг раніше, унікальний
 *     індекс EventId у SharePoint поверне конфлікт → duplicate.
 */
export async function processEvents(items: ParsedItem[], store: EventStore): Promise<BatchResponse> {
  const results = new Map<string, EventResult>();
  const invalid: EventResult[] = [];
  const unique = new Map<string, ProductionEvent>();

  for (const item of items) {
    if (!item.ok) invalid.push({ eventId: item.eventId, status: "error", error: item.error });
    else unique.set(item.event.eventId, item.event);
  }

  const events = [...unique.values()];
  const existing = events.length ? await store.findExisting(events.map((e) => e.eventId)) : new Map();

  const toCreate = events.filter((e) => !existing.has(e.eventId));
  const toUpdate: { itemId: string; event: ProductionEvent }[] = [];
  for (const event of events) {
    const found = existing.get(event.eventId);
    if (!found) continue;
    const changed = event.comment !== found.comment || event.recordComment !== found.recordComment;
    if (changed) toUpdate.push({ itemId: found.itemId, event });
    else results.set(event.eventId, { eventId: event.eventId, status: "duplicate" });
  }

  if (toCreate.length) {
    const created = await store.create(toCreate);
    for (const event of toCreate) {
      const outcome = created.get(event.eventId) ?? { status: "error" as const, error: "Немає відповіді сховища" };
      results.set(
        event.eventId,
        outcome.status === "error"
          ? { eventId: event.eventId, status: "error", error: outcome.error }
          : { eventId: event.eventId, status: outcome.status },
      );
    }
  }

  if (toUpdate.length) {
    const updated = await store.updateComments(toUpdate);
    for (const { event } of toUpdate) {
      const outcome = updated.get(event.eventId) ?? { status: "error" as const, error: "Немає відповіді сховища" };
      results.set(
        event.eventId,
        outcome.status === "error"
          ? { eventId: event.eventId, status: "error", error: outcome.error }
          : { eventId: event.eventId, status: "updated" },
      );
    }
  }

  const all = [...results.values(), ...invalid];
  const count = (s: EventStatus) => all.filter((r) => r.status === s).length;
  return {
    results: all,
    created: count("created"),
    duplicates: count("duplicate"),
    updated: count("updated"),
    failed: count("error"),
  };
}
