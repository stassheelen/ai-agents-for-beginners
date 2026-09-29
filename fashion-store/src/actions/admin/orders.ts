"use server";

import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionError, requireAdmin, type ActionResult } from "@/lib/admin";
import { invalidateStore } from "@/lib/cache";

const INACTIVE: OrderStatus[] = ["CANCELLED", "RETURNED"];

const schema = z.object({
  id: z.string(),
  status: z.enum(["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  trackingNumber: z.string().trim().max(60).optional().nullable(),
  adminNote: z.string().trim().max(2000).optional().nullable(),
});

class StockError extends Error {}

export async function updateOrder(input: z.input<typeof schema>): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = schema.parse(input);
    const order = await prisma.order.findUnique({ where: { id: d.id }, include: { items: true } });
    if (!order) return { ok: false, error: "Order not found" };
    const wasActive = !INACTIVE.includes(order.status);
    const willBeActive = d.status ? !INACTIVE.includes(d.status) : wasActive;

    await prisma.$transaction(async (tx) => {
      if (wasActive && !willBeActive) {
        // return items to stock
        for (const i of order.items) {
          if (i.variantId) await tx.productVariant.updateMany({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
          if (i.productId) await tx.product.updateMany({ where: { id: i.productId, salesCount: { gte: i.quantity } }, data: { salesCount: { decrement: i.quantity } } });
        }
        if (order.customerId) await tx.customer.update({ where: { id: order.customerId }, data: { ordersCount: { decrement: 1 }, totalSpent: { decrement: order.total } } });
      } else if (!wasActive && willBeActive) {
        // re-reserve stock
        for (const i of order.items) {
          if (!i.variantId) continue;
          const r = await tx.productVariant.updateMany({ where: { id: i.variantId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
          if (r.count === 0) throw new StockError(`Not enough stock to reactivate: ${i.name} (${i.sku})`);
          if (i.productId) await tx.product.updateMany({ where: { id: i.productId }, data: { salesCount: { increment: i.quantity } } });
        }
        if (order.customerId) await tx.customer.update({ where: { id: order.customerId }, data: { ordersCount: { increment: 1 }, totalSpent: { increment: order.total } } });
      }
      await tx.order.update({
        where: { id: d.id },
        data: {
          ...(d.status ? { status: d.status } : {}),
          ...(d.paymentStatus ? { paymentStatus: d.paymentStatus } : {}),
          ...(d.trackingNumber !== undefined ? { trackingNumber: d.trackingNumber || null } : {}),
          ...(d.adminNote !== undefined ? { adminNote: d.adminNote || null } : {}),
        },
      });
    });
    if (wasActive !== willBeActive) invalidateStore();
    return { ok: true, message: wasActive && !willBeActive ? "Order updated — items returned to stock" : "Order updated" };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: e.message };
    return actionError(e);
  }
}

export async function bulkOrderStatus(ids: string[], status: OrderStatus): Promise<ActionResult> {
  let failed = 0;
  for (const id of ids) {
    const r = await updateOrder({ id, status });
    if (!r.ok) failed++;
  }
  return failed ? { ok: false, error: `${failed} order(s) could not be updated` } : { ok: true, message: `${ids.length} order(s) updated` };
}
