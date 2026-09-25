import { graphConfig } from "./config";
import { SharePointEventStore } from "./sharepoint";
import { InMemoryEventStore, type EventStore } from "./store";

let override: EventStore | null = null;
let cached: { key: string; store: EventStore } | null = null;
let memory: InMemoryEventStore | null = null;

/** Для тестів: підмінити сховище. */
export function setStoreForTests(store: EventStore | null) {
  override = store;
}

/**
 * Повертає сховище SharePoint або null, якщо змінні середовища ще не задано.
 * EVENT_STORE=memory — лише для локальної перевірки без SharePoint (дані не зберігаються між перезапусками).
 */
export function getStore(): EventStore | null {
  if (override) return override;
  if (process.env.EVENT_STORE === "memory") return (memory ??= new InMemoryEventStore());
  const config = graphConfig();
  if (!config) return null;
  const key = JSON.stringify(config);
  if (!cached || cached.key !== key) cached = { key, store: new SharePointEventStore(config) };
  return cached.store;
}
