"use server";

import { prisma } from "@/lib/db";
import { ensureVisitorId, readVisitorId } from "@/lib/visitor";
import { limitByIp } from "@/lib/rate-limit";

export async function getWishlistIds(): Promise<string[]> {
  const vid = await readVisitorId();
  if (!vid) return [];
  const rows = await prisma.wishlist.findMany({ where: { visitorId: vid }, select: { productId: true } });
  return rows.map((r) => r.productId);
}

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; ids: string[]; added?: boolean; error?: string }> {
  if (!(await limitByIp("wishlist", 120, 60))) return { ok: false, ids: await getWishlistIds(), error: "Забагато запитів" };
  const vid = await ensureVisitorId();
  const product = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" }, select: { id: true } });
  if (!product) return { ok: false, ids: await getWishlistIds(), error: "Товар недоступний" };
  const existing = await prisma.wishlist.findUnique({ where: { visitorId_productId: { visitorId: vid, productId } } });
  if (existing) await prisma.wishlist.delete({ where: { id: existing.id } });
  else await prisma.wishlist.create({ data: { visitorId: vid, productId } });
  const rows = await prisma.wishlist.findMany({ where: { visitorId: vid }, select: { productId: true } });
  return { ok: true, ids: rows.map((r) => r.productId), added: !existing };
}
