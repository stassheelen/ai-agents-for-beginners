import { z } from "zod";

export const EVENT_TYPES = [
  "PHASE_START",
  "PHASE_END",
  "CHANGEOVER_START",
  "CHANGEOVER_END",
  "DOWNTIME_START",
  "DOWNTIME_END",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()));

/** Структура події з планшета. eventId (UUID) — ключ ідемпотентності. */
export const EventSchema = z.object({
  eventId: z.uuid(),
  recordId: optionalText(64),
  sku: z.string().trim().min(1).max(64),
  productName: z.string().trim().max(300).default(""),
  article: z.string().trim().max(300).default(""),
  quantityKg: z.number().nonnegative().max(1_000_000).nullish().transform((v) => v ?? null),
  phase: optionalText(200),
  eventType: z.enum(EVENT_TYPES),
  timestamp: z.iso.datetime({ offset: true }),
  durationSeconds: z.number().int().nonnegative().nullish().transform((v) => v ?? null),
  downtimeReason: optionalText(200),
  comment: optionalText(2000),
  recordComment: optionalText(2000),
  deviceId: z.string().trim().min(1).max(64),
  createdAt: z.iso.datetime({ offset: true }),
});

export type ProductionEvent = z.infer<typeof EventSchema>;

export type ParsedItem =
  | { ok: true; event: ProductionEvent }
  | { ok: false; eventId: string; error: string };

/**
 * Приймає { events: [...] }, масив подій або одну подію.
 * Кожна подія перевіряється окремо: одна неправильна не блокує решту пакета.
 */
export function parseEventsBody(body: unknown): { items: ParsedItem[] } | { error: string } {
  let raw: unknown[];
  if (Array.isArray(body)) raw = body;
  else if (body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)) {
    raw = (body as { events: unknown[] }).events;
  } else if (body && typeof body === "object" && "eventId" in body) raw = [body];
  else return { error: "Очікується { events: [...] }" };

  const items = raw.map((item): ParsedItem => {
    const result = EventSchema.safeParse(item);
    if (result.success) return { ok: true, event: result.data };
    const eventId =
      item && typeof item === "object" && typeof (item as { eventId?: unknown }).eventId === "string"
        ? (item as { eventId: string }).eventId
        : "";
    const error = result.error.issues
      .map((i) => `${i.path.join(".") || "event"}: ${i.message}`)
      .join("; ");
    return { ok: false, eventId, error };
  });
  return { items };
}
