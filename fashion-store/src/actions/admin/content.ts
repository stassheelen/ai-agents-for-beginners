"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionError, requireAdmin, type ActionResult } from "@/lib/admin";
import { invalidateStore } from "@/lib/cache";

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const link = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => v || null)
  .refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Посилання має починатися з / або https://");
const color = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => v || null)
  .refine((v) => !v || /^#[0-9a-f]{6}$/i.test(v), "Колір у форматі HEX, напр. #111111");

const SECTION_TYPES = ["HERO", "PRODUCT_CAROUSEL", "PRODUCT_GRID", "CATEGORY_GRID", "IMAGE_TEXT", "BANNER", "COLLECTION", "VIDEO", "TEXT"] as const;

const sectionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(SECTION_TYPES),
  label: opt(120),
  title: opt(200),
  subtitle: opt(500),
  body: opt(3000),
  image: opt(1000),
  mobileImage: opt(1000),
  videoUrl: opt(1000),
  buttonLabel: opt(60),
  buttonLink: link,
  button2Label: opt(60),
  button2Link: link,
  background: color,
  textColor: color,
  active: z.boolean().default(true),
  config: z
    .object({
      source: z.enum(["new", "bestseller", "sale", "featured", "collection", "category", "latest"]).optional(),
      limit: z.coerce.number().int().min(1).max(24).optional(),
      slug: z.string().trim().max(100).optional(),
      slugs: z.array(z.string().trim().max(100)).max(12).optional(),
      layout: z.enum(["left", "right"]).optional(),
      align: z.enum(["left", "center"]).optional(),
      height: z.enum(["full", "large", "medium"]).optional(),
    })
    .default({}),
});

export type SectionInput = z.input<typeof sectionSchema>;

export async function saveSection(input: SectionInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const { id, config, ...d } = sectionSchema.parse(input);
    const data = { ...d, config: config as Prisma.InputJsonValue };
    const row = id
      ? await prisma.homepageSection.update({ where: { id }, data })
      : await prisma.homepageSection.create({ data: { ...data, position: ((await prisma.homepageSection.aggregate({ _max: { position: true } }))._max.position ?? -1) + 1 } });
    invalidateStore();
    return { ok: true, data: { id: row.id }, message: "Секцію збережено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteSection(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.homepageSection.delete({ where: { id } });
    invalidateStore();
    return { ok: true, message: "Секцію видалено" };
  } catch (e) {
    return actionError(e);
  }
}

async function normalizePositions(ids: string[]) {
  await prisma.$transaction(ids.map((id, i) => prisma.homepageSection.update({ where: { id }, data: { position: i } })));
}

export async function duplicateSection(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const s = await prisma.homepageSection.findUnique({ where: { id } });
    if (!s) return { ok: false, error: "Не знайдено" };
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = s;
    void _id;
    void _c;
    void _u;
    const all = await prisma.homepageSection.findMany({ orderBy: { position: "asc" }, select: { id: true } });
    const copy = await prisma.homepageSection.create({ data: { ...rest, config: rest.config as Prisma.InputJsonValue, title: rest.title ? `${rest.title} (копія)` : rest.title, active: false } });
    const ids = all.map((x) => x.id);
    ids.splice(ids.indexOf(id) + 1, 0, copy.id);
    await normalizePositions(ids);
    invalidateStore();
    return { ok: true, message: "Створено копію (неактивна)" };
  } catch (e) {
    return actionError(e);
  }
}

export async function moveSection(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    await requireAdmin();
    const ids = (await prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((x) => x.id);
    const i = ids.indexOf(id);
    if (i < 0 || i + dir < 0 || i + dir >= ids.length) return { ok: true };
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    await normalizePositions(ids);
    invalidateStore();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function toggleSection(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.homepageSection.update({ where: { id }, data: { active } });
    invalidateStore();
    return { ok: true, message: active ? "Секцію показано" : "Секцію приховано" };
  } catch (e) {
    return actionError(e);
  }
}

// ───────────────────────────── Banners ─────────────────────────────

const bannerSchema = z.object({
  id: z.string().optional(),
  placement: z.enum(["ANNOUNCEMENT", "HOMEPAGE", "MEGA_MENU", "CATALOG"]),
  title: z.string().trim().min(1, "Вкажіть заголовок").max(200),
  subtitle: opt(300),
  image: opt(1000),
  mobileImage: opt(1000),
  buttonLabel: opt(60),
  link,
  active: z.boolean().default(true),
  startsAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
  endsAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
});

export async function saveBanner(input: z.input<typeof bannerSchema>): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id, ...d } = bannerSchema.parse(input);
    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) return { ok: false, error: "Дата завершення має бути пізніше за дату початку" };
    if (id) await prisma.banner.update({ where: { id }, data: d });
    else await prisma.banner.create({ data: { ...d, position: await prisma.banner.count({ where: { placement: d.placement } }) } });
    invalidateStore();
    return { ok: true, message: "Банер збережено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.banner.delete({ where: { id } });
    invalidateStore();
    return { ok: true, message: "Банер видалено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function moveBanner(id: string, dir: -1 | 1): Promise<ActionResult> {
  try {
    await requireAdmin();
    const b = await prisma.banner.findUnique({ where: { id } });
    if (!b) return { ok: false, error: "Не знайдено" };
    const list = await prisma.banner.findMany({ where: { placement: b.placement }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    const i = list.findIndex((x) => x.id === id);
    if (!list[i + dir]) return { ok: true };
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    await prisma.$transaction(list.map((x, idx) => prisma.banner.update({ where: { id: x.id }, data: { position: idx } })));
    invalidateStore();
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

// ───────────────────────────── Reviews ─────────────────────────────

async function recalcRating(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: productId }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count } });
}

export async function setReviewStatus(ids: string[], status: "APPROVED" | "REJECTED" | "PENDING"): Promise<ActionResult> {
  try {
    await requireAdmin();
    const reviews = await prisma.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
    await prisma.review.updateMany({ where: { id: { in: ids } }, data: { status } });
    for (const pid of new Set(reviews.map((r) => r.productId))) await recalcRating(pid);
    invalidateStore();
    return { ok: true, message: `Відгуків оновлено: ${ids.length}` };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteReviews(ids: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const reviews = await prisma.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
    await prisma.review.deleteMany({ where: { id: { in: ids } } });
    for (const pid of new Set(reviews.map((r) => r.productId))) await recalcRating(pid);
    invalidateStore();
    return { ok: true, message: "Видалено" };
  } catch (e) {
    return actionError(e);
  }
}

// ───────────────────────────── Promotions ─────────────────────────────

const promoSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Код: 3–32 символи — латинські літери, цифри, - або _"),
  description: opt(200),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().int().min(0),
  minSubtotal: z.coerce.number().int().min(0).default(0),
  usageLimit: z.union([z.coerce.number().int().min(1), z.null()]).optional(),
  active: z.boolean().default(true),
  startsAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
  endsAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
});

export async function savePromotion(input: z.input<typeof promoSchema>): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id, ...d } = promoSchema.parse(input);
    if (d.type === "PERCENTAGE" && (d.value < 1 || d.value > 100)) return { ok: false, error: "Відсоток має бути від 1 до 100" };
    if (d.type === "FIXED" && d.value < 1) return { ok: false, error: "Вкажіть суму знижки" };
    if (id) await prisma.promotion.update({ where: { id }, data: d });
    else await prisma.promotion.create({ data: d });
    return { ok: true, message: "Промокод збережено" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.promotion.delete({ where: { id } });
    return { ok: true, message: "Промокод видалено" };
  } catch (e) {
    return actionError(e);
  }
}

// ───────────────────────────── Settings ─────────────────────────────

const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(40),
  tagline: opt(200),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Акцентний колір у форматі HEX"),
  currency: z.string().trim().length(3),
  freeShippingThreshold: z.coerce.number().int().min(0),
  shippingFlatRate: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  contactEmail: opt(120),
  contactPhone: opt(40),
  instagramUrl: link,
  seoTitle: opt(160),
  seoDescription: opt(320),
  ogImage: opt(1000),
  sizeGuide: opt(10000),
  deliveryInfo: opt(10000),
  returnsInfo: opt(10000),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = settingsSchema.parse(input);
    await prisma.settings.upsert({ where: { id: "default" }, update: { ...d, currency: d.currency.toUpperCase() }, create: { id: "default", ...d } });
    invalidateStore();
    return { ok: true, message: "Налаштування збережено" };
  } catch (e) {
    return actionError(e);
  }
}
