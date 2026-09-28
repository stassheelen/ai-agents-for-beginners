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
 * Обробка пакета подій:
 *  1. Невалідні події → error (решта пакета обробляється).
 *  2. Повтори eventId у межах пакета зводяться до одного.
 *  3. Сховище записує ідемпотентно: уже збережена подія → duplicate / updated, дубль не створюється.
 * Якщо сховище недоступне, помилка йде вище → 503, і планшет повторить відправку пізніше.
 */
export async function processEvents(items: ParsedItem[], store: EventStore): Promise<BatchResponse> {
  const invalid: EventResult[] = [];
  const unique = new Map<string, ProductionEvent>();
  for (const item of items) {
    if (!item.ok) invalid.push({ eventId: item.eventId, status: "error", error: item.error });
    else unique.set(item.event.eventId, item.event);
  }

  const events = [...unique.values()];
  const outcomes = events.length ? await store.upsertEvents(events) : new Map();
  const results: EventResult[] = events.map((event) => {
    const outcome = outcomes.get(event.eventId) ?? { status: "error" as const, error: "Немає відповіді сховища" };
    return outcome.status === "error"
      ? { eventId: event.eventId, status: "error", error: outcome.error }
      : { eventId: event.eventId, status: outcome.status };
  });

  const all = [...results, ...invalid];
  const count = (s: EventStatus) => all.filter((r) => r.status === s).length;
  return {
    results: all,
    created: count("created"),
    duplicates: count("duplicate"),
    updated: count("updated"),
    failed: count("error"),
  };
}
