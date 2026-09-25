import { EVENT_COLUMNS } from "./columns";
import type { GraphConfig } from "./config";
import { GraphClient, GraphError, graphErrorMessage, type BatchRequest } from "./graph";
import type {
  CreateOutcome,
  EventStore,
  ExistingItem,
  ProductRow,
  StoreHealth,
  UpdateOutcome,
} from "./store";
import type { ProductionEvent } from "./validation";

/** Поля SharePoint-списку (внутрішні імена колонок). */
export function toListFields(e: ProductionEvent): Record<string, unknown> {
  return {
    Title: `${e.eventType} · ${e.sku}`,
    EventId: e.eventId,
    RecordId: e.recordId,
    SKU: e.sku,
    ProductName: e.productName,
    Article: e.article,
    QuantityKg: e.quantityKg,
    Phase: e.phase,
    EventType: e.eventType,
    Timestamp: e.timestamp,
    DurationSeconds: e.durationSeconds,
    DowntimeReason: e.downtimeReason,
    Comment: e.comment,
    RecordComment: e.recordComment,
    DeviceId: e.deviceId,
    CreatedAt: e.createdAt,
  };
}

const isDuplicateError = (status: number, message: string) =>
  status === 409 || (status === 400 && /duplicate|unique|повтор|унікал/i.test(message));

const odataString = (value: string) => value.replace(/'/g, "''");

/**
 * Зберігає події у SharePoint List через Microsoft Graph.
 * Колонка EventId — індексована та з enforceUniqueValues, тому SharePoint сам
 * гарантує відсутність дублів навіть при паралельних запитах.
 */
export class SharePointEventStore implements EventStore {
  private siteIdPromise: Promise<string> | null = null;
  private eventsListPromise: Promise<string> | null = null;

  constructor(
    private readonly config: GraphConfig,
    private readonly graph: GraphClient = new GraphClient(config),
  ) {}

  private siteId(): Promise<string> {
    if (this.config.siteId) return Promise.resolve(this.config.siteId);
    if (!this.siteIdPromise) {
      const url = new URL(this.config.siteUrl!);
      const path = url.pathname.replace(/\/+$/, "");
      this.siteIdPromise = this.graph
        .request<{ id: string }>("GET", `/sites/${url.hostname}:${path || "/"}`)
        .then((s) => s.id)
        .catch((e) => {
          this.siteIdPromise = null;
          throw e;
        });
    }
    return this.siteIdPromise;
  }

  private async listPath(list: string): Promise<string> {
    return `/sites/${await this.siteId()}/lists/${encodeURIComponent(list)}`;
  }

  /**
   * Шлях до списку подій. Якщо списку ще немає — створює його з усіма колонками,
   * тож окремо запускати скрипт provision не обов'язково.
   */
  private eventsListPath(): Promise<string> {
    if (!this.eventsListPromise) {
      this.eventsListPromise = this.ensureEventsList().catch((e) => {
        this.eventsListPromise = null;
        throw e;
      });
    }
    return this.eventsListPromise;
  }

  private async ensureEventsList(): Promise<string> {
    const path = await this.listPath(this.config.eventsList);
    try {
      await this.graph.request("GET", `${path}?$select=id`);
      return path;
    } catch (e) {
      if (!(e instanceof GraphError && e.status === 404)) throw e;
    }
    try {
      const created = await this.graph.request<{ id: string }>("POST", `/sites/${await this.siteId()}/lists`, {
        displayName: this.config.eventsList,
        columns: EVENT_COLUMNS,
        list: { template: "genericList" },
      });
      console.info(`SharePoint: створено список «${this.config.eventsList}» (${created.id})`);
      return `/sites/${await this.siteId()}/lists/${created.id}`;
    } catch (e) {
      // Паралельний запит встиг створити список раніше.
      if (e instanceof GraphError && e.status === 409) return path;
      throw e;
    }
  }

  async findExisting(eventIds: string[]): Promise<Map<string, ExistingItem>> {
    const base = await this.eventsListPath();
    const requests: BatchRequest[] = eventIds.map((id, i) => ({
      id: String(i),
      method: "GET",
      url:
        `${base}/items?$expand=fields($select=EventId,Comment,RecordComment)&$select=id&$top=1` +
        `&$filter=fields/EventId eq '${odataString(id)}'`,
      headers: { Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" },
    }));
    const responses = await this.graph.batch(requests);
    const found = new Map<string, ExistingItem>();
    eventIds.forEach((eventId, i) => {
      const res = responses.get(String(i));
      if (!res) throw new GraphError("Graph не повернув відповідь пошуку", 502);
      if (res.status >= 400) throw new GraphError(`Пошук події: ${graphErrorMessage(res)}`, res.status);
      const value = (res.body as { value?: { id: string; fields?: Record<string, unknown> }[] }).value ?? [];
      const item = value[0];
      if (item) {
        found.set(eventId, {
          itemId: item.id,
          comment: (item.fields?.Comment as string | undefined) ?? null,
          recordComment: (item.fields?.RecordComment as string | undefined) ?? null,
        });
      }
    });
    return found;
  }

  async create(events: ProductionEvent[]): Promise<Map<string, CreateOutcome>> {
    const base = await this.eventsListPath();
    const requests: BatchRequest[] = events.map((e, i) => ({
      id: String(i),
      method: "POST",
      url: `${base}/items`,
      body: { fields: toListFields(e) },
    }));
    const responses = await this.graph.batch(requests);
    const result = new Map<string, CreateOutcome>();
    events.forEach((e, i) => {
      const res = responses.get(String(i));
      if (!res) {
        result.set(e.eventId, { status: "error", error: "Немає відповіді Graph" });
      } else if (res.status < 300) {
        result.set(e.eventId, { status: "created" });
      } else {
        const message = graphErrorMessage(res);
        result.set(
          e.eventId,
          isDuplicateError(res.status, message) ? { status: "duplicate" } : { status: "error", error: message },
        );
      }
    });
    return result;
  }

  async updateComments(items: { itemId: string; event: ProductionEvent }[]): Promise<Map<string, UpdateOutcome>> {
    const base = await this.eventsListPath();
    const requests: BatchRequest[] = items.map(({ itemId, event }, i) => ({
      id: String(i),
      method: "PATCH",
      url: `${base}/items/${encodeURIComponent(itemId)}/fields`,
      body: { Comment: event.comment, RecordComment: event.recordComment },
    }));
    const responses = await this.graph.batch(requests);
    const result = new Map<string, UpdateOutcome>();
    items.forEach(({ event }, i) => {
      const res = responses.get(String(i));
      result.set(
        event.eventId,
        res && res.status < 300
          ? { status: "updated" }
          : { status: "error", error: res ? graphErrorMessage(res) : "Немає відповіді Graph" },
      );
    });
    return result;
  }

  /** Довідник продукції з SharePoint (колонки SKU, ProductType, Article, ProductGroup). */
  async listProducts(): Promise<ProductRow[] | null> {
    if (!this.config.productsList) return null;
    const base = await this.listPath(this.config.productsList);
    const rows: ProductRow[] = [];
    let next: string | undefined =
      `${base}/items?$expand=fields($select=SKU,ProductType,Article,ProductGroup,Title)&$select=id&$top=999`;
    while (next) {
      const page: { value: { fields?: Record<string, unknown> }[]; "@odata.nextLink"?: string } =
        await this.graph.request("GET", next);
      for (const item of page.value) {
        const f = item.fields ?? {};
        const sku = String(f.SKU ?? "").trim();
        const type = String(f.ProductType ?? f.Title ?? "").trim();
        if (!sku) continue;
        rows.push({
          sku,
          type,
          article: f.Article ? String(f.Article) : null,
          group: f.ProductGroup ? String(f.ProductGroup) : null,
        });
      }
      next = page["@odata.nextLink"];
    }
    return rows;
  }

  async health(): Promise<StoreHealth> {
    try {
      const list = await this.graph.request<{ displayName?: string }>(
        "GET",
        `${await this.eventsListPath()}?$select=displayName`,
      );
      return { configured: true, ok: true, listName: list.displayName ?? this.config.eventsList };
    } catch (e) {
      return { configured: true, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
