"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { actionError, requireAdmin, type ActionResult } from "@/lib/admin";
import { invalidateStore } from "@/lib/cache";
import { slugify } from "@/lib/utils";

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(100).optional(),
  parentId: z.string().optional().nullable().transform((v) => v || null),
  description: opt(2000),
  image: opt(1000),
  seoTitle: opt(160),
  seoDescription: opt(320),
  published: z.boolean().default(true),
  showInNav: z.boolean().default(false),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const d = categorySchema.parse(input);
    const slug = slugify(d.slug || d.name);
    if (!slug) return { ok: false, error: "Slug is required" };
    if (d.id && d.parentId) {
      // prevent cycles
      let cur: string | null = d.parentId;
      while (cur) {
        if (cur === d.id) return { ok: false, error: "A category cannot be nested inside itself" };
        cur = (await prisma.category.findUnique({ where: { id: cur }, select: { parentId: true } }))?.parentId ?? null;
      }
    }
    const data = { ...d, slug, id: undefined };
    const row = d.id
      ? await prisma.category.update({ where: { id: d.id }, data })
      : await prisma.category.create({ data: { ...data, position: await prisma.category.count({ where: { parentId: d.parentId } }) } });
    invalidateStore();
    return { ok: true, data: { id: row.id }, message: "Category saved" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const cat = await prisma.category.findUnique({ where: { id }, select: { parentId: true } });
    if (!cat) return { ok: false, error: "Not found" };
    // children move up one level; products keep their other categories
    await prisma.$transaction([
      prisma.category.updateMany({ where: { parentId: id }, data: { parentId: cat.parentId } }),
      prisma.category.delete({ where: { id } }),
    ]);
    invalidateStore();
    return { ok: true, message: "Category deleted" };
  } catch (e) {
    return actionError(e);
  }
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    await requireAdmin();
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) return { ok: false, error: "Not found" };
    const siblings = await prisma.category.findMany({ where: { parentId: cat.parentId }, orderBy: [{ position: "asc" }, { name: "asc" }] });
    const idx = siblings.findIndex((s) => s.id === id);
    const swap = siblings[idx + dir];
    if (!swap) return { ok: true };
    const ordered = [...siblings];
    [ordered[idx], ordered[idx + dir]] = [ordered[idx + dir], ordered[idx]];
    await prisma.$transaction(ordered.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { position: i } })));
    invalidateStore();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(100).optional(),
  description: opt(2000),
  heroImage: opt(1000),
  seoTitle: opt(160),
  seoDescription: opt(320),
  published: z.boolean().default(true),
  productIds: z.array(z.string()).max(2000).optional(),
});

export async function saveCollection(input: z.input<typeof collectionSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const { productIds, ...d } = collectionSchema.parse(input);
    const slug = slugify(d.slug || d.name);
    const data = { ...d, slug, id: undefined };
    const row = await prisma.$transaction(async (tx) => {
      const c = d.id ? await tx.collection.update({ where: { id: d.id }, data }) : await tx.collection.create({ data: { ...data, position: await tx.collection.count() } });
      if (productIds) {
        await tx.productCollection.deleteMany({ where: { collectionId: c.id } });
        if (productIds.length) await tx.productCollection.createMany({ data: productIds.map((productId, i) => ({ productId, collectionId: c.id, position: i })), skipDuplicates: true });
      }
      return c;
    });
    invalidateStore();
    return { ok: true, data: { id: row.id }, message: "Collection saved" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.collection.delete({ where: { id } });
    invalidateStore();
    return { ok: true, message: "Collection deleted" };
  } catch (e) {
    return actionError(e);
  }
}

export async function moveCollection(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    await requireAdmin();
    const all = await prisma.collection.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0 || !all[idx + dir]) return { ok: true };
    [all[idx], all[idx + dir]] = [all[idx + dir], all[idx]];
    await prisma.$transaction(all.map((c, i) => prisma.collection.update({ where: { id: c.id }, data: { position: i } })));
    invalidateStore();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function searchProductsForPicker(q: string) {
  await requireAdmin();
  return prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {},
    take: 30,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
}
