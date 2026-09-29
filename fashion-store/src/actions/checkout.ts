"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { clearCartId, orderToken, readCartId } from "@/lib/visitor";
import { loadCart } from "@/actions/cart";
import { computeTotals, promotionError } from "@/lib/pricing";
import { getSettings } from "@/lib/queries";
import { limitByIp } from "@/lib/rate-limit";
import { getPaymentProvider, type PaymentInit } from "@/lib/providers/payment";
import { DELIVERY_METHODS, novaPoshta } from "@/lib/providers/delivery";
import { siteUrl } from "@/lib/utils";
import { invalidateStore } from "@/lib/cache";

export async function checkPromo(code: string) {
  if (!(await limitByIp("promo", 20, 300))) return { ok: false as const, error: "Забагато спроб. Спробуйте пізніше." };
  const cart = await loadCart(await readCartId());
  const promo = await prisma.promotion.findUnique({ where: { code: code.trim().toUpperCase() } });
  const err = promotionError(promo, cart.subtotal);
  if (err) return { ok: false as const, error: err };
  const settings = await getSettings();
  return { ok: true as const, code: promo!.code, description: promo!.description, totals: computeTotals(cart.subtotal, settings, promo) };
}

export async function npSearchCities(q: string) {
  if (!novaPoshta.isConfigured() || q.trim().length < 2) return [];
  if (!(await limitByIp("np", 120, 60))) return [];
  try {
    return await novaPoshta.searchCities(q.trim().slice(0, 60));
  } catch {
    return [];
  }
}

export async function npWarehouses(cityRef: string, q?: string) {
  if (!novaPoshta.isConfigured() || !cityRef) return [];
  if (!(await limitByIp("np", 120, 60))) return [];
  try {
    return await novaPoshta.getWarehouses(cityRef, q);
  } catch {
    return [];
  }
}

const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, "Вкажіть ім'я").max(60),
  lastName: z.string().trim().min(2, "Вкажіть прізвище").max(60),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{10,13}$/, "Некоректний номер телефону")),
  email: z.string().trim().toLowerCase().email("Некоректний email").max(120),
  city: z.string().trim().min(2, "Вкажіть місто").max(100),
  deliveryMethod: z.enum(DELIVERY_METHODS.map((d) => d.id) as [string, ...string[]]),
  deliveryAddress: z.string().trim().min(2, "Вкажіть відділення або адресу").max(200),
  paymentMethod: z.enum(["card", "cod"]),
  comment: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().max(40).optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult =
  | { ok: true; orderId: string; number: number; token: string; payment: PaymentInit }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

class StockError extends Error {}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!(await limitByIp("checkout", 10, 600))) return { ok: false, error: "Забагато спроб оформлення. Спробуйте за кілька хвилин." };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Перевірте виділені поля", fieldErrors };
  }
  const data = parsed.data;
  const cartId = await readCartId();
  const cart = await loadCart(cartId);
  if (!cartId || cart.items.length === 0) return { ok: false, error: "Кошик порожній" };

  const settings = await getSettings();
  let promo = null;
  if (data.promoCode) {
    promo = await prisma.promotion.findUnique({ where: { code: data.promoCode.toUpperCase() } });
    const err = promotionError(promo, cart.subtotal);
    if (err) return { ok: false, error: err, fieldErrors: { promoCode: err } };
  }
  const totals = computeTotals(cart.subtotal, settings, promo);
  const provider = getPaymentProvider(data.paymentMethod);
  const delivery = DELIVERY_METHODS.find((d) => d.id === data.deliveryMethod)!;

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // Reserve stock atomically: only decrement when enough is left.
        for (const line of cart.items) {
          const res = await tx.productVariant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (res.count === 0) throw new StockError(`${line.name} (${[line.color, line.size].filter(Boolean).join(" / ")}) — недостатньо на складі`);
          await tx.product.update({ where: { id: line.productId }, data: { salesCount: { increment: line.quantity } } });
        }
        const customer = await tx.customer.upsert({
          where: { email: data.email },
          update: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            city: data.city,
            ordersCount: { increment: 1 },
            totalSpent: { increment: totals.total },
          },
          create: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            city: data.city,
            ordersCount: 1,
            totalSpent: totals.total,
          },
        });
        if (promo) {
          const upd = await tx.promotion.updateMany({
            where: { id: promo.id, OR: [{ usageLimit: null }, { usageCount: { lt: promo.usageLimit ?? 0 } }] },
            data: { usageCount: { increment: 1 } },
          });
          if (upd.count === 0) throw new StockError("Промокод більше не доступний");
        }
        const created = await tx.order.create({
          data: {
            customerId: customer.id,
            email: data.email,
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            paymentMethod: data.paymentMethod,
            paymentProvider: provider.id,
            deliveryMethod: delivery.id,
            deliveryProvider: delivery.provider,
            city: data.city,
            deliveryAddress: data.deliveryAddress,
            subtotal: totals.subtotal,
            shippingCost: totals.shipping,
            discount: totals.discount,
            total: totals.total,
            currency: settings.currency,
            promotionCode: promo?.code,
            comment: data.comment || null,
            items: {
              create: cart.items.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                name: l.name,
                sku: l.sku,
                color: l.color,
                size: l.size,
                image: l.image,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                total: l.unitPrice * l.quantity,
              })),
            },
          },
        });
        await tx.cart.delete({ where: { id: cartId } });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
    );

    await clearCartId();
    invalidateStore();
    const token = orderToken(order.id);
    const resultUrl = siteUrl(`/checkout/success?order=${order.id}&t=${token}`);
    const payment = await provider.createPayment(order, { resultUrl, callbackUrl: siteUrl(`/api/payments/${provider.id}/callback`) });
    return { ok: true, orderId: order.id, number: order.number, token, payment };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: e.message };
    console.error("placeOrder", e);
    return { ok: false, error: "Не вдалося створити замовлення. Спробуйте ще раз." };
  }
}
