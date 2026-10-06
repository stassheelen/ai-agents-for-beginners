"use server";

import { prisma } from "@/lib/db";
import { readCartId, setCartId } from "@/lib/visitor";
import { limitByIp } from "@/lib/rate-limit";
import { ukLabel } from "@/lib/uk-labels";

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  color: string | null;
  size: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  stock: number;
  currency: string;
};

export type CartView = { items: CartLine[]; count: number; subtotal: number };

const EMPTY: CartView = { items: [], count: 0, subtotal: 0 };

export async function loadCart(cartId: string | null): Promise<CartView> {
  if (!cartId) return EMPTY;
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          color: { select: { name: true } },
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              compareAtPrice: true,
              currency: true,
              status: true,
              images: { orderBy: { position: "asc" }, select: { url: true, colorName: true } },
            },
          },
        },
      },
    },
  });
  const lines: CartLine[] = items
    .filter((i) => i.variant.product.status === "PUBLISHED")
    .map((i) => {
      const p = i.variant.product;
      const colorName = i.variant.color?.name ?? null;
      const img = p.images.find((im) => colorName && im.colorName === colorName) ?? p.images[0];
      return {
        id: i.id,
        variantId: i.variantId,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        image: img?.url ?? null,
        color: ukLabel(colorName),
        size: ukLabel(i.variant.size),
        sku: i.variant.sku,
        quantity: i.quantity,
        unitPrice: i.variant.price ?? p.price,
        compareAtPrice: i.variant.compareAtPrice ?? p.compareAtPrice,
        stock: i.variant.stock,
        currency: p.currency,
      };
    });
  return {
    items: lines,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    subtotal: lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0),
  };
}

export async function getCart(): Promise<CartView> {
  return loadCart(await readCartId());
}

type Result = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

export async function addToCart(variantId: string, quantity = 1): Promise<Result> {
  if (!(await limitByIp("cart", 120, 60))) return { ok: false, error: "Забагато запитів. Спробуйте за хвилину." };
  const qty = Math.max(1, Math.min(20, Math.floor(quantity)));
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, stock: true, product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== "PUBLISHED") return { ok: false, error: "Товар недоступний" };
  if (variant.stock <= 0) return { ok: false, error: "Немає в наявності" };

  let cartId = await readCartId();
  if (cartId) {
    const exists = await prisma.cart.findUnique({ where: { id: cartId }, select: { id: true } });
    if (!exists) cartId = null;
  }
  if (!cartId) {
    const cart = await prisma.cart.create({ data: {} });
    cartId = cart.id;
    await setCartId(cartId);
  }
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const nextQty = Math.min(variant.stock, (existing?.quantity ?? 0) + qty);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    update: { quantity: nextQty },
    create: { cartId, variantId, quantity: nextQty },
  });
  await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  const cart = await loadCart(cartId);
  const limited = (existing?.quantity ?? 0) + qty > variant.stock;
  return { ok: true, cart, message: limited ? `Доступно лише ${variant.stock} шт.` : undefined };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Result> {
  const cartId = await readCartId();
  if (!cartId) return { ok: false, error: "Кошик порожній" };
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, include: { variant: { select: { stock: true } } } });
  if (!item) return { ok: false, error: "Позицію не знайдено", cart: await loadCart(cartId) };
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(item.variant.stock, Math.min(20, Math.floor(quantity))) } });
  }
  const cart = await loadCart(cartId);
  return { ok: true, cart, message: quantity > item.variant.stock ? `Доступно лише ${item.variant.stock} шт.` : undefined };
}

export async function removeCartItem(itemId: string): Promise<Result> {
  return updateCartItem(itemId, 0);
}
