import type { ProductionEvent } from "./validation";

export interface ExistingItem {
  itemId: string;
  comment: string | null;
  recordComment: string | null;
}

export type CreateOutcome = { status: "created" } | { status: "duplicate" } | { status: "error"; error: string };
export type UpdateOutcome = { status: "updated" } | { status: "error"; error: string };

export interface ProductRow {
  sku: string;
  type: string;
  article: string | null;
  group: string | null;
}

export interface StoreHealth {
  configured: boolean;
  ok: boolean;
  listName?: string;
  error?: string;
}

/** Сховище подій. Реалізації: SharePoint (прод) та InMemory (тести / локальна розробка). */
export interface EventStore {
  /** Знаходить уже збережені події за eventId. */
  findExisting(eventIds: string[]): Promise<Map<string, ExistingItem>>;
  /** Створює події. Дубль за унікальним EventId повертається як "duplicate". */
  create(events: ProductionEvent[]): Promise<Map<string, CreateOutcome>>;
  /** Оновлює змінні поля (коментарі) вже існуючої події. */
  updateComments(items: { itemId: string; event: ProductionEvent }[]): Promise<Map<string, UpdateOutcome>>;
  listProducts(): Promise<ProductRow[] | null>;
  health(): Promise<StoreHealth>;
}

/** Сховище в пам'яті з тією ж семантикою унікальності EventId, що й у SharePoint. */
export class InMemoryEventStore implements EventStore {
  readonly items = new Map<string, { itemId: string; event: ProductionEvent }>();
  private seq = 0;
  products: ProductRow[] | null = null;

  async findExisting(eventIds: string[]) {
    const result = new Map<string, ExistingItem>();
    for (const id of eventIds) {
      const item = this.items.get(id);
      if (item) {
        result.set(id, { itemId: item.itemId, comment: item.event.comment, recordComment: item.event.recordComment });
      }
    }
    return result;
  }

  async create(events: ProductionEvent[]) {
    const result = new Map<string, CreateOutcome>();
    for (const event of events) {
      if (this.items.has(event.eventId)) {
        result.set(event.eventId, { status: "duplicate" });
        continue;
      }
      this.items.set(event.eventId, { itemId: String(++this.seq), event });
      result.set(event.eventId, { status: "created" });
    }
    return result;
  }

  async updateComments(items: { itemId: string; event: ProductionEvent }[]) {
    const result = new Map<string, UpdateOutcome>();
    for (const { event } of items) {
      const stored = this.items.get(event.eventId);
      if (!stored) {
        result.set(event.eventId, { status: "error", error: "not found" });
        continue;
      }
      stored.event = { ...stored.event, comment: event.comment, recordComment: event.recordComment };
      result.set(event.eventId, { status: "updated" });
    }
    return result;
  }

  async listProducts() {
    return this.products;
  }

  async health(): Promise<StoreHealth> {
    return { configured: true, ok: true, listName: "in-memory" };
  }
}
