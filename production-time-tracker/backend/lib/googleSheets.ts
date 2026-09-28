import type { GoogleSheetsConfig } from "./config";
import type { EventStore, ProductRow, StoreHealth, UpsertOutcome } from "./store";
import type { ProductionEvent } from "./validation";

export class StoreError extends Error {}

type FetchLike = typeof fetch;

const CHUNK = 200;
const TIMEOUT_MS = 50_000;

/**
 * Зберігає події в Google Таблиці через Apps Script вебдодаток (google-sheets/Code.gs).
 * Скрипт пише під LockService і перевіряє EventId — дублі неможливі навіть при паралельних запитах.
 */
export class GoogleSheetsEventStore implements EventStore {
  constructor(
    private readonly config: GoogleSheetsConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    let res: Response;
    try {
      // Apps Script відповідає 302 на googleusercontent.com; fetch іде за переадресацією сам.
      res = await this.fetchImpl(this.config.scriptUrl, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: this.config.secret, action, ...payload }),
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw new StoreError(`Google Таблиця недоступна: ${e instanceof Error ? e.message : e}`);
    }
    if (!res.ok) throw new StoreError(`Google Apps Script відповів ${res.status}`);
    const text = await res.text();
    let json: { ok?: boolean; error?: string } & T;
    try {
      json = JSON.parse(text);
    } catch {
      throw new StoreError(
        "Google Apps Script повернув не JSON: перевірте, що вебдодаток розгорнуто з доступом «Усі»",
      );
    }
    if (!json.ok) {
      throw new StoreError(
        json.error === "unauthorized"
          ? "Секрет не збігається: GOOGLE_SCRIPT_SECRET у Vercel ≠ SHARED_SECRET у скрипті"
          : json.error ?? "Невідома помилка Google Apps Script",
      );
    }
    return json;
  }

  async upsertEvents(events: ProductionEvent[]): Promise<Map<string, UpsertOutcome>> {
    const result = new Map<string, UpsertOutcome>();
    for (let i = 0; i < events.length; i += CHUNK) {
      const chunk = events.slice(i, i + CHUNK);
      const response = await this.call<{ results: { eventId: string; status: string; error?: string }[] }>(
        "upsertEvents",
        { events: chunk },
      );
      for (const r of response.results ?? []) {
        if (r.status === "created" || r.status === "duplicate" || r.status === "updated") {
          result.set(r.eventId, { status: r.status });
        } else {
          result.set(r.eventId, { status: "error", error: r.error ?? "Помилка запису в таблицю" });
        }
      }
    }
    return result;
  }

  async listProducts(): Promise<ProductRow[] | null> {
    const response = await this.call<{ products: ProductRow[] | null; error?: string }>("products");
    if (response.error && !response.products) throw new StoreError(response.error);
    return response.products ?? null;
  }

  async health(): Promise<StoreHealth> {
    try {
      const h = await this.call<{ spreadsheet?: string; sheet?: string }>("health");
      return { configured: true, ok: true, name: [h.spreadsheet, h.sheet].filter(Boolean).join(" → ") };
    } catch (e) {
      return { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
