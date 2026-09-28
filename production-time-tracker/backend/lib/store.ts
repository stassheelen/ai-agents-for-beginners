import type { ProductionEvent } from "./validation";

export type UpsertOutcome =
  | { status: "created" }
  | { status: "duplicate" }
  | { status: "updated" }
  | { status: "error"; error: string };

export interface ProductRow {
  sku: string;
  type: string;
  article: string | null;
  group: string | null;
}

export interface StoreHealth {
  configured: boolean;
  ok: boolean;
  name?: string;
  error?: string;
}

/** Сховище подій. Реалізації: Google Таблиця (прод) та InMemory (тести / локальна розробка). */
export interface EventStore {
  /**
   * Ідемпотентний запис: нова подія → created; подія з тим самим eventId → duplicate
   * (або updated, якщо змінився коментар). Дублі не створюються.
   */
  upsertEvents(events: ProductionEvent[]): Promise<Map<string, UpsertOutcome>>;
  listProducts(): Promise<ProductRow[] | null>;
  health(): Promise<StoreHealth>;
}

/** Сховище в пам'яті з тією ж семантикою, що й Google Таблиця. */
export class InMemoryEventStore implements EventStore {
  readonly items = new Map<string, ProductionEvent>();
  products: ProductRow[] | null = null;

  async upsertEvents(events: ProductionEvent[]) {
    const result = new Map<string, UpsertOutcome>();
    for (const event of events) {
      const stored = this.items.get(event.eventId);
      if (!stored) {
        this.items.set(event.eventId, event);
        result.set(event.eventId, { status: "created" });
      } else if (stored.comment !== event.comment || stored.recordComment !== event.recordComment) {
        this.items.set(event.eventId, { ...stored, comment: event.comment, recordComment: event.recordComment });
        result.set(event.eventId, { status: "updated" });
      } else {
        result.set(event.eventId, { status: "duplicate" });
      }
    }
    return result;
  }

  async listProducts() {
    return this.products;
  }

  async health(): Promise<StoreHealth> {
    return { configured: true, ok: true, name: "in-memory" };
  }
}
