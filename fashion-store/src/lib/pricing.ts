import type { Promotion, Settings } from "@prisma/client";

export type Totals = { subtotal: number; shipping: number; discount: number; total: number; freeShippingLeft: number };

export function promotionError(promo: Promotion | null, subtotal: number, now = new Date()): string | null {
  if (!promo || !promo.active) return "Промокод не знайдено";
  if (promo.startsAt && promo.startsAt > now) return "Промокод ще не діє";
  if (promo.endsAt && promo.endsAt < now) return "Термін дії промокоду минув";
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return "Промокод більше не доступний";
  if (subtotal < promo.minSubtotal) return `Мінімальна сума для промокоду — ${Math.round(promo.minSubtotal / 100)} ₴`;
  return null;
}

export function computeTotals(
  subtotal: number,
  settings: Pick<Settings, "freeShippingThreshold" | "shippingFlatRate">,
  promo?: Promotion | null,
): Totals {
  let shipping = subtotal === 0 || subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate;
  let discount = 0;
  if (promo) {
    if (promo.type === "PERCENTAGE") discount = Math.round((subtotal * Math.min(100, promo.value)) / 100);
    if (promo.type === "FIXED") discount = Math.min(subtotal, promo.value);
    if (promo.type === "FREE_SHIPPING") shipping = 0;
  }
  return {
    subtotal,
    shipping,
    discount,
    total: Math.max(0, subtotal - discount + shipping),
    freeShippingLeft: Math.max(0, settings.freeShippingThreshold - subtotal),
  };
}
