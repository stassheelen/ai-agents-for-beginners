"use server";

import { z } from "zod";
import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionError, requireAdmin, type ActionResult } from "@/lib/admin";
import { invalidateStore } from "@/lib/cache";
import { removeDemoContent } from "@/lib/demo-content";
import { roundAllPrices } from "@/lib/round-prices";
import { slugify } from "@/lib/utils";
import { colorHexFromName } from "@/lib/color-names";

const money = z.coerce.number().int().min(0).max(1_000_000_000);
const optMoney = z.union([money, z.null()]).optional();
const optText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const imageUrl = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Посилання на фото має починатися з https:// або / (шлях на сайті)");

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, "Вкажіть артикул варіанту").max(64),
  color: z.string().trim().max(40).optional().nullable(),
  colorHex: z.string().trim().regex(/^#[0-9a-f]{6}$/i).optional().nullable(),
  size: z.string().trim().max(60).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  price: optMoney,
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Вкажіть назву товару").max(160),
  sku: z.string().trim().min(1, "Вкажіть артикул").max(64),
  slug: z.string().trim().max(120).optional(),
  description: optText(10000),
  shortDescription: optText(500),
  brand: optText(80),
  categoryId: z.string().optional().nullable().transform((v) => v || null),
  subcategoryId: z.string().optional().nullable().transform((v) => v || null),
  collectionIds: z.array(z.string()).max(30).default([]),
  price: money,
  compareAtPrice: optMoney,
  costPrice: optMoney,
  currency: z.string().trim().length(3).default("UAH"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  onSale: z.boolean().default(false),
  seoTitle: optText(160),
  seoDescription: optText(320),
  ogImage: optText(1000),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(40).default([]),
  details: optText(5000),
  material: optText(2000),
  careInstructions: optText(2000),
  shippingInfo: optText(2000),
  returnInfo: optText(2000),
  images: z.array(z.object({ url: imageUrl, alt: optText(200), colorName: optText(40) })).max(40).default([]),
  variants: z.array(variantSchema).max(300).default([]),
});

export type ProductInput = z.input<typeof productSchema>;

async function colorIdFor(tx: Prisma.TransactionClient, name: string | null | undefined, hex?: string | null) {
  if (!name) return null;
  const clean = name.trim();
  const existing = await tx.color.findFirst({ where: { name: { equals: clean, mode: "insensitive" } } });
  if (existing) {
    if (hex && hex.toLowerCase() !== existing.hex.toLowerCase()) await tx.color.update({ where: { id: existing.id }, data: { hex } });
    return existing.id;
  }
  const count = await tx.color.count();
  const created = await tx.color.create({ data: { name: clean, slug: slugify(clean) || `color-${count + 1}`, hex: hex ?? colorHexFromName(clean) ?? "#888888", position: count } });
  return created.id;
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "product";
  for (let i = 2; ; i++) {
    const clash = await prisma.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return slug;
    slug = `${slugify(base)}-${i}`;
  }
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    await requireAdmin();
    const data = productSchema.parse(input);

    // Business validation
    const skus = data.variants.map((v) => v.sku.toUpperCase());
    const dupe = skus.find((s, i) => skus.indexOf(s) !== i);
    if (dupe) return { ok: false, error: `Артикул варіанту повторюється: ${dupe}` };
    const combos = data.variants.map((v) => `${(v.color ?? "").toLowerCase()}|${(v.size ?? "").toLowerCase()}`);
    const dupeCombo = combos.find((c, i) => combos.indexOf(c) !== i);
    if (dupeCombo) return { ok: false, error: `Варіант повторюється (колір/розмір): ${dupeCombo.replace("|", " / ")}` };
    if (data.status === "PUBLISHED" && data.variants.length === 0) return { ok: false, error: "Перед публікацією додайте хоча б один варіант (колір/розмір із залишком)" };
    if (data.compareAtPrice && data.compareAtPrice <= data.price) data.compareAtPrice = null;

    const conflictSku = await prisma.productVariant.findFirst({
      where: { sku: { in: data.variants.map((v) => v.sku), mode: "insensitive" }, ...(data.id ? { productId: { not: data.id } } : {}) },
      select: { sku: true },
    });
    if (conflictSku) return { ok: false, error: `Артикул варіанту вже використовує інший товар: ${conflictSku.sku}` };
    const conflictProductSku = await prisma.product.findFirst({ where: { sku: { equals: data.sku, mode: "insensitive" }, ...(data.id ? { id: { not: data.id } } : {}) }, select: { id: true } });
    if (conflictProductSku) return { ok: false, error: `Артикул ${data.sku} уже існує` };

    const slug = await uniqueSlug(data.slug || data.name, data.id);
    const existing = data.id ? await prisma.product.findUnique({ where: { id: data.id }, select: { status: true, publishedAt: true } }) : null;

    const saved = await prisma.$transaction(
      async (tx) => {
        const base = {
          name: data.name,
          sku: data.sku,
          slug,
          description: data.description,
          shortDescription: data.shortDescription,
          brand: data.brand,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          price: data.price,
          compareAtPrice: data.compareAtPrice ?? null,
          costPrice: data.costPrice ?? null,
          currency: data.currency.toUpperCase(),
          status: data.status as ProductStatus,
          featured: data.featured,
          isNew: data.isNew,
          bestSeller: data.bestSeller,
          onSale: data.onSale || Boolean(data.compareAtPrice && data.compareAtPrice > data.price),
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          ogImage: data.ogImage,
          tags: [...new Set(data.tags.filter(Boolean))],
          details: data.details,
          material: data.material,
          careInstructions: data.careInstructions,
          shippingInfo: data.shippingInfo,
          returnInfo: data.returnInfo,
          publishedAt: data.status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
        };
        const product = data.id ? await tx.product.update({ where: { id: data.id }, data: base }) : await tx.product.create({ data: base });

        // Images
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        if (data.images.length) {
          await tx.productImage.createMany({
            data: data.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt, colorName: img.colorName, position: i })),
          });
        }

        // Categories (primary + sub) and collections
        await tx.productCategory.deleteMany({ where: { productId: product.id } });
        const catIds = [...new Set([data.categoryId, data.subcategoryId].filter((x): x is string => Boolean(x)))];
        if (catIds.length) await tx.productCategory.createMany({ data: catIds.map((categoryId) => ({ productId: product.id, categoryId })) });
        await tx.productCollection.deleteMany({ where: { productId: product.id } });
        if (data.collectionIds.length) {
          await tx.productCollection.createMany({ data: [...new Set(data.collectionIds)].map((collectionId, i) => ({ productId: product.id, collectionId, position: i })) });
        }

        // Variants: update existing, create new, delete removed
        const keepIds = data.variants.map((v) => v.id).filter((x): x is string => Boolean(x));
        await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });
        for (const [i, v] of data.variants.entries()) {
          const colorId = await colorIdFor(tx, v.color, v.colorHex);
          const vdata = { sku: v.sku, colorId, size: v.size || null, stock: v.stock, price: v.price ?? null, position: i };
          if (v.id) await tx.productVariant.update({ where: { id: v.id, productId: product.id }, data: vdata });
          else await tx.productVariant.create({ data: { ...vdata, productId: product.id } });
        }
        return product;
      },
      { timeout: 30000 },
    );
    invalidateStore();
    return { ok: true, data: { id: saved.id, slug: saved.slug }, message: "Товар збережено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function setProductsStatus(ids: string[], status: ProductStatus): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (status === "PUBLISHED") {
      const withoutVariants = await prisma.product.count({ where: { id: { in: ids }, variants: { none: {} } } });
      if (withoutVariants) return { ok: false, error: `Товарів без варіантів: ${withoutVariants} — їх не можна опублікувати` };
    }
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } });
    if (status === "PUBLISHED") await prisma.product.updateMany({ where: { id: { in: ids }, publishedAt: null }, data: { publishedAt: new Date() } });
    invalidateStore();
    return { ok: true, message: `Оновлено товарів: ${ids.length}` };
  } catch (e) {
    return actionError(e);
  }
}

export async function setProductsFlag(ids: string[], flag: "featured" | "isNew" | "bestSeller" | "onSale", value: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { [flag]: value } });
    invalidateStore();
    return { ok: true, message: `Оновлено товарів: ${ids.length}` };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteProducts(ids: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    // Order history keeps name/SKU/price snapshots; OrderItem.productId is set to NULL.
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    invalidateStore();
    return { ok: true, message: `Видалено товарів: ${ids.length}` };
  } catch (e) {
    return actionError(e);
  }
}

/** Products that would show as empty cards: no photo or no variants. */
const EMPTY_PRODUCT: Prisma.ProductWhereInput = { OR: [{ images: { none: {} } }, { variants: { none: {} } }] };

/** Products with a photo in the old Vercel Blob store: it was suspended, so those photos no longer load. */
const BROKEN_PHOTO_PRODUCT: Prisma.ProductWhereInput = { images: { some: { url: { contains: ".blob.vercel-storage.com" } } } };

export async function deleteBrokenPhotoProducts(): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { count } = await prisma.product.deleteMany({ where: BROKEN_PHOTO_PRODUCT });
    invalidateStore();
    return { ok: true, message: count ? `Видалено товарів зі зламаними фото: ${count}` : "Таких товарів немає" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteEmptyProducts(): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { count } = await prisma.product.deleteMany({ where: EMPTY_PRODUCT });
    invalidateStore();
    return { ok: true, message: count ? `Видалено порожніх товарів: ${count}` : "Порожніх товарів немає" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteDemoContent(): Promise<ActionResult> {
  try {
    await requireAdmin();
    const s = await removeDemoContent();
    invalidateStore();
    return { ok: true, message: `Демо-дані видалено: товарів ${s.products}, замовлень ${s.orders}, банерів ${s.banners}` };
  } catch (e) {
    return actionError(e);
  }
}

export async function roundPrices(): Promise<ActionResult> {
  try {
    await requireAdmin();
    await roundAllPrices();
    invalidateStore();
    return { ok: true, message: "Ціни округлено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const p = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: true, categories: true, collections: true },
    });
    if (!p) return { ok: false, error: "Товар не знайдено" };
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const { id: _id, createdAt: _c, updatedAt: _u, publishedAt: _p, images, variants, categories, collections, ...rest } = p;
    void _id;
    void _c;
    void _u;
    void _p;
    const copy = await prisma.product.create({
      data: {
        ...rest,
        name: `${p.name} (копія)`,
        sku: `${p.sku}-COPY-${suffix}`,
        slug: await uniqueSlug(`${p.slug}-copy`),
        status: "DRAFT",
        salesCount: 0,
        rating: 0,
        reviewCount: 0,
        images: { create: images.map((i) => ({ url: i.url, alt: i.alt, colorName: i.colorName, position: i.position })) },
        variants: { create: variants.map((v) => ({ sku: `${v.sku}-C${suffix}`, colorId: v.colorId, size: v.size, stock: 0, price: v.price, position: v.position })) },
        categories: { create: categories.map((c) => ({ categoryId: c.categoryId })) },
        collections: { create: collections.map((c) => ({ collectionId: c.collectionId, position: c.position })) },
      },
    });
    return { ok: true, data: { id: copy.id }, message: "Створено копію-чернетку (залишки обнулено)" };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateVariantStock(updates: { id: string; stock: number }[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = z.array(z.object({ id: z.string(), stock: z.coerce.number().int().min(0).max(1_000_000) })).max(500).parse(updates);
    await prisma.$transaction(parsed.map((u) => prisma.productVariant.update({ where: { id: u.id }, data: { stock: u.stock } })));
    invalidateStore();
    return { ok: true, message: `Оновлено варіантів: ${parsed.length}` };
  } catch (e) {
    return actionError(e);
  }
}
