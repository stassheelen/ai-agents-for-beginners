import { randomUUID } from "node:crypto";

export function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: randomUUID(),
    recordId: "rec-1",
    sku: "000123",
    productName: "Ковбаса варена",
    article: "A-4587",
    quantityKg: 125.5,
    phase: "Фаза 10 — Формування",
    eventType: "PHASE_START",
    timestamp: "2026-09-25T11:32:18Z",
    durationSeconds: null,
    downtimeReason: null,
    comment: null,
    recordComment: null,
    deviceId: "tablet-001",
    createdAt: "2026-09-25T11:32:18Z",
    ...overrides,
  };
}
