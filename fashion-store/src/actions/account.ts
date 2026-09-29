"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { limitByIp } from "@/lib/rate-limit";

const STATUS_UK: Record<string, string> = {
  NEW: "Нове",
  CONFIRMED: "Підтверджене",
  PROCESSING: "В обробці",
  PACKED: "Зібране",
  SHIPPED: "Відправлене",
  DELIVERED: "Доставлене",
  CANCELLED: "Скасоване",
  RETURNED: "Повернення",
};

export type LookupResult =
  | { ok: true; order: { number: number; status: string; statusLabel: string; total: number; currency: string; createdAt: string; trackingNumber: string | null; items: { name: string; quantity: number; color: string | null; size: string | null }[] } }
  | { ok: false; error: string };

export async function lookupOrder(_: unknown, formData: FormData): Promise<LookupResult> {
  if (!(await limitByIp("order-lookup", 10, 600))) return { ok: false, error: "Забагато спроб. Спробуйте пізніше." };
  const parsed = z
    .object({ number: z.coerce.number().int().positive(), email: z.string().trim().toLowerCase().email() })
    .safeParse({ number: String(formData.get("number") ?? "").replace(/\D/g, ""), email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Перевірте номер замовлення та email" };
  const order = await prisma.order.findFirst({
    where: { number: parsed.data.number, email: parsed.data.email },
    include: { items: { select: { name: true, quantity: true, color: true, size: true } } },
  });
  if (!order) return { ok: false, error: "Замовлення не знайдено" };
  return {
    ok: true,
    order: {
      number: order.number,
      status: order.status,
      statusLabel: STATUS_UK[order.status] ?? order.status,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      trackingNumber: order.trackingNumber,
      items: order.items,
    },
  };
}
