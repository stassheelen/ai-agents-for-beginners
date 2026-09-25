import type { GraphConfig } from "./config";

const GRAPH = "https://graph.microsoft.com/v1.0";

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export interface BatchRequest {
  id: string;
  method: "GET" | "POST" | "PATCH";
  url: string; // відносна адреса, наприклад /sites/{id}/lists/{list}/items
  body?: unknown;
  headers?: Record<string, string>;
}

export interface BatchResponseItem {
  id: string;
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type FetchLike = typeof fetch;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Мінімальний клієнт Microsoft Graph (client credentials, без SDK). */
export class GraphClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: GraphConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const res = await this.fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(this.config.tenantId)}/oauth2/v2.0/token`,
      { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } },
    );
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new GraphError(`Не вдалося отримати токен Microsoft: ${json.error_description ?? res.status}`, res.status);
    }
    this.token = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  /** Запит до Graph з повтором при 429/503/504 (з урахуванням Retry-After). */
  async request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(path.startsWith("http") ? path : GRAPH + path, {
        method,
        headers: {
          authorization: `Bearer ${await this.accessToken()}`,
          "content-type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if ((res.status === 429 || res.status === 503 || res.status === 504) && attempt < 3) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1000 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        const err = (json as { error?: { message?: string; code?: string } }).error;
        throw new GraphError(err?.message ?? `Graph ${res.status}`, res.status, err?.code);
      }
      return json as T;
    }
  }

  /** JSON batching: до 20 запитів за раз. Запити з 429/503 повторюються. */
  async batch(requests: BatchRequest[]): Promise<Map<string, BatchResponseItem>> {
    const results = new Map<string, BatchResponseItem>();
    for (let i = 0; i < requests.length; i += 20) {
      let pending = requests.slice(i, i + 20);
      for (let attempt = 0; pending.length > 0; attempt++) {
        const payload = {
          requests: pending.map((r) => ({
            id: r.id,
            method: r.method,
            url: r.url,
            ...(r.body !== undefined
              ? { body: r.body, headers: { "content-type": "application/json", ...r.headers } }
              : r.headers
                ? { headers: r.headers }
                : {}),
          })),
        };
        const response = await this.request<{ responses: BatchResponseItem[] }>("POST", "/$batch", payload);
        const retry: BatchRequest[] = [];
        for (const item of response.responses) {
          const throttled = item.status === 429 || item.status === 503 || item.status === 504;
          if (throttled && attempt < 3) {
            const original = pending.find((r) => r.id === item.id);
            if (original) retry.push(original);
          } else {
            results.set(item.id, item);
          }
        }
        pending = retry;
        if (pending.length) await sleep(1000 * 2 ** attempt);
      }
    }
    return results;
  }
}

export function graphErrorMessage(item: BatchResponseItem): string {
  const body = item.body as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? `Graph ${item.status}`;
}
