"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { cardSelect, getCatalog, LISTED, searchWhere, toCard, type CatalogParams, type ProductCardData } from "@/lib/queries";
import { limitByIp } from "@/lib/rate-limit";
import { sortSizes } from "@/lib/utils";

export type QuickAddProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: { url: string; alt: string | null; colorName: string | null }[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  variants: { id: string; color: string | null; size: string | null; stock: number; price: number }[];
};

export async function getQuickAddProduct(productId: string): Promise<QuickAddProduct | null> {
  const p = await prisma.product.findFirst({
    where: { id: productId, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      images: { orderBy: { position: "asc" }, select: { url: true, alt: true, colorName: true } },
      variants: { orderBy: { position: "asc" }, select: { id: true, size: true, stock: true, price: true, color: { select: { name: true, hex: true } } } },
    },
  });
  if (!p) return null;
  const colors = new Map<string, { name: string; hex: string }>();
  for (const v of p.variants) if (v.color) colors.set(v.color.name, v.color);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    images: p.images,
    colors: [...colors.values()],
    sizes: sortSizes([...new Set(p.variants.map((v) => v.size).filter((s): s is string => Boolean(s)))]),
    variants: p.variants.map((v) => ({ id: v.id, color: v.color?.name ?? null, size: v.size, stock: v.stock, price: v.price ?? p.price })),
  };
}

const paramsSchema = z.object({
  category: z.string().max(100).optional(),
  collection: z.string().max(100).optional(),
  q: z.string().max(100).optional(),
  sizes: z.array(z.string().max(20)).max(20).optional(),
  colors: z.array(z.string().max(40)).max(20).optional(),
  categories: z.array(z.string().max(100)).max(20).optional(),
  collections: z.array(z.string().max(100)).max(20).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  inStock: z.boolean().optional(),
  flag: z.enum(["new", "sale", "bestseller", "featured"]).optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "bestselling"]).optional(),
  page: z.number().int().min(1).max(500).optional(),
});

export async function loadCatalogPage(params: CatalogParams) {
  const parsed = paramsSchema.parse(params);
  const res = await getCatalog(parsed);
  return { items: res.items, hasMore: res.hasMore, page: res.page };
}

export type SearchSuggestions = {
  products: ProductCardData[];
  categories: { name: string; slug: string }[];
  collections: { name: string; slug: string }[];
  total: number;
};

export async function searchSuggestions(q: string): Promise<SearchSuggestions> {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [], collections: [], total: 0 };
  if (!(await limitByIp("search", 90, 60))) return { products: [], categories: [], collections: [], total: 0 };
  const where = { AND: [LISTED, searchWhere(term)] };
  const [rows, total, categories, collections] = await Promise.all([
    prisma.product.findMany({ where, take: 6, orderBy: [{ salesCount: "desc" }], select: cardSelect }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { published: true, name: { contains: term, mode: "insensitive" } }, take: 4, select: { name: true, slug: true } }),
    prisma.collection.findMany({ where: { published: true, name: { contains: term, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
  ]);
  return { products: rows.map(toCard), categories, collections, total };
}

export async function getProductsByIds(ids: string[]): Promise<ProductCardData[]> {
  const safe = ids.filter((id) => typeof id === "string" && id.length < 40).slice(0, 12);
  if (!safe.length) return [];
  const rows = await prisma.product.findMany({ where: { id: { in: safe }, ...LISTED }, select: cardSelect });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return safe.map((id) => byId.get(id)).filter((x): x is ProductCardData => Boolean(x));
}

const reviewSchema = z.object({
  productId: z.string().min(1).max(40),
  name: z.string().trim().min(2, "Вкажіть ім'я").max(60),
  email: z.string().trim().email("Некоректний email").max(120).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Відгук має містити щонайменше 10 символів").max(2000),
  size: z.string().trim().max(20).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitReview(_: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (!(await limitByIp("review", 5, 3600))) return { ok: false, message: "Забагато відгуків. Спробуйте пізніше." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Перевірте форму" };
  const { website: _hp, ...data } = parsed.data;
  void _hp;
  const product = await prisma.product.findFirst({ where: { id: data.productId, status: "PUBLISHED" }, select: { id: true } });
  if (!product) return { ok: false, message: "Товар не знайдено" };
  await prisma.review.create({ data: { ...data, email: data.email || null, status: "PENDING" } });
  return { ok: true, message: "Дякуємо! Відгук з'явиться після модерації." };
}
