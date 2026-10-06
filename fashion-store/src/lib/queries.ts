import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STORE_TAG } from "@/lib/cache";
import { sortSizes } from "@/lib/utils";

const CACHE = { revalidate: 300, tags: [STORE_TAG] };

/** Products shown in listings: published, with at least one photo and one variant (no empty cards). */
export const LISTED: Prisma.ProductWhereInput = { status: "PUBLISHED", images: { some: {} }, variants: { some: {} } };

// ───────────────────────────── Settings ─────────────────────────────

export const getSettings = unstable_cache(
  async () => {
    const s = await prisma.settings.findUnique({ where: { id: "default" } });
    return (
      s ?? (await prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }))
    );
  },
  ["settings"],
  CACHE,
);

// ──────────────────────────── Navigation ────────────────────────────

export type NavCategory = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };

export const getNavigation = unstable_cache(
  async () => {
    const now = new Date();
    const [categories, collections, colors, megaBanners, announcements] = await Promise.all([
      prisma.category.findMany({
        where: { parentId: null, published: true, showInNav: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          children: {
            where: { published: true },
            orderBy: { position: "asc" },
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.collection.findMany({
        where: { published: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.color.findMany({
        where: { variants: { some: { product: { status: "PUBLISHED" } } } },
        orderBy: { position: "asc" },
        select: { id: true, name: true, slug: true, hex: true },
      }),
      prisma.banner.findMany({
        where: activeBannerWhere("MEGA_MENU", now),
        orderBy: { position: "asc" },
        select: { id: true, title: true, subtitle: true, image: true, link: true, buttonLabel: true },
      }),
      prisma.banner.findMany({
        where: activeBannerWhere("ANNOUNCEMENT", now),
        orderBy: { position: "asc" },
        select: { id: true, title: true, link: true },
      }),
    ]);
    return { categories: categories as NavCategory[], collections, colors, megaBanners, announcements };
  },
  ["navigation"],
  CACHE,
);

function activeBannerWhere(placement: "MEGA_MENU" | "ANNOUNCEMENT" | "HOMEPAGE" | "CATALOG", now: Date): Prisma.BannerWhereInput {
  return {
    placement,
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

export const getBanners = unstable_cache(
  async (placement: "HOMEPAGE" | "CATALOG") =>
    prisma.banner.findMany({
      where: activeBannerWhere(placement, new Date()),
      orderBy: { position: "asc" },
      select: { id: true, title: true, subtitle: true, image: true, mobileImage: true, link: true, buttonLabel: true },
    }),
  ["banners"],
  CACHE,
);

// ──────────────────────────── Product cards ────────────────────────────

export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  compareAtPrice: true,
  currency: true,
  isNew: true,
  bestSeller: true,
  onSale: true,
  rating: true,
  reviewCount: true,
  images: { orderBy: { position: "asc" }, select: { url: true, alt: true, colorName: true }, take: 8 },
  variants: {
    orderBy: { position: "asc" },
    select: { stock: true, color: { select: { name: true, hex: true, slug: true } } },
  },
  collections: { take: 1, orderBy: { position: "asc" }, select: { collection: { select: { name: true } } } },
} satisfies Prisma.ProductSelect;

export type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  label: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  isNew: boolean;
  bestSeller: boolean;
  onSale: boolean;
  rating: number;
  reviewCount: number;
  images: { url: string; alt: string | null }[];
  colors: { name: string; hex: string; slug: string; image: string | null }[];
  available: boolean;
};

export function toCard(p: CardRow): ProductCardData {
  const colors = new Map<string, { name: string; hex: string; slug: string; image: string | null }>();
  for (const v of p.variants) {
    if (v.color && !colors.has(v.color.slug)) {
      const img = p.images.find((i) => i.colorName?.toLowerCase() === v.color!.name.toLowerCase());
      colors.set(v.color.slug, { ...v.color, image: img?.url ?? null });
    }
  }
  const primaryImages = p.images.filter((i, idx) => idx < 2 || !i.colorName);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    label: p.collections[0]?.collection.name ?? p.brand ?? null,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    onSale: p.onSale || Boolean(p.compareAtPrice && p.compareAtPrice > p.price),
    rating: p.rating,
    reviewCount: p.reviewCount,
    images: primaryImages.slice(0, 2).map((i) => ({ url: i.url, alt: i.alt })),
    colors: [...colors.values()],
    available: p.variants.some((v) => v.stock > 0),
  };
}

export type ProductSource = "new" | "bestseller" | "sale" | "featured" | "collection" | "category" | "latest";

export const getProductsBySource = unstable_cache(
  async (source: ProductSource, limit = 8, slug?: string) => {
    const where: Prisma.ProductWhereInput = { ...LISTED };
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: "desc" }];
    switch (source) {
      case "new":
        where.isNew = true;
        break;
      case "bestseller":
        where.bestSeller = true;
        orderBy = [{ salesCount: "desc" }, { createdAt: "desc" }];
        break;
      case "sale":
        where.onSale = true;
        break;
      case "featured":
        where.featured = true;
        break;
      case "collection":
        if (slug) where.collections = { some: { collection: { slug } } };
        break;
      case "category":
        if (slug) where.categories = { some: { category: { slug } } };
        break;
    }
    const rows = await prisma.product.findMany({ where, orderBy, take: Math.min(limit, 24), select: cardSelect });
    return rows.map(toCard);
  },
  ["products-by-source"],
  CACHE,
);

// ───────────────────────────── Catalog ─────────────────────────────

export type CatalogSort = "featured" | "newest" | "price-asc" | "price-desc" | "bestselling";

export type CatalogParams = {
  category?: string;
  collection?: string;
  q?: string;
  sizes?: string[];
  colors?: string[];
  categories?: string[];
  collections?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  flag?: "new" | "sale" | "bestseller" | "featured";
  sort?: CatalogSort;
  page?: number;
};

export const PAGE_SIZE = 24;

async function categorySubtreeIds(slug: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } });
  const root = all.find((c) => c.slug === slug);
  if (!root) return [];
  const ids = [root.id];
  for (let i = 0; i < ids.length; i++) {
    for (const c of all) if (c.parentId === ids[i]) ids.push(c.id);
  }
  return ids;
}

export async function buildCatalogWhere(p: CatalogParams): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [LISTED];

  if (p.category) {
    const ids = await categorySubtreeIds(p.category);
    and.push({ categories: { some: { categoryId: { in: ids.length ? ids : ["__none__"] } } } });
  }
  if (p.collection) and.push({ collections: { some: { collection: { slug: p.collection } } } });
  if (p.categories?.length) {
    const ids = (await Promise.all(p.categories.map(categorySubtreeIds))).flat();
    and.push({ categories: { some: { categoryId: { in: ids.length ? ids : ["__none__"] } } } });
  }
  if (p.collections?.length) and.push({ collections: { some: { collection: { slug: { in: p.collections } } } } });
  if (p.flag === "new") and.push({ isNew: true });
  if (p.flag === "sale") and.push({ onSale: true });
  if (p.flag === "bestseller") and.push({ bestSeller: true });
  if (p.flag === "featured") and.push({ featured: true });
  if (p.minPrice !== undefined) and.push({ price: { gte: p.minPrice } });
  if (p.maxPrice !== undefined) and.push({ price: { lte: p.maxPrice } });

  const variantWhere: Prisma.ProductVariantWhereInput = {};
  if (p.sizes?.length) variantWhere.size = { in: p.sizes };
  if (p.colors?.length) variantWhere.color = { slug: { in: p.colors } };
  if (p.inStock) variantWhere.stock = { gt: 0 };
  if (Object.keys(variantWhere).length) and.push({ variants: { some: variantWhere } });

  if (p.q) and.push(searchWhere(p.q));
  return { AND: and };
}

export function searchWhere(q: string): Prisma.ProductWhereInput {
  const term = q.trim().slice(0, 80);
  const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
      { tags: { hasSome: tokens } },
      { categories: { some: { category: { name: { contains: term, mode: "insensitive" } } } } },
      { collections: { some: { collection: { name: { contains: term, mode: "insensitive" } } } } },
      { variants: { some: { color: { name: { contains: term, mode: "insensitive" } } } } },
      { brand: { contains: term, mode: "insensitive" } },
    ],
  };
}

function catalogOrder(sort: CatalogSort = "featured"): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "price-asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "bestselling":
      return [{ salesCount: "desc" }, { id: "asc" }];
    default:
      return [{ featured: "desc" }, { bestSeller: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  }
}

export async function getCatalog(p: CatalogParams) {
  const where = await buildCatalogWhere(p);
  const page = Math.max(1, p.page ?? 1);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: catalogOrder(p.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return { total, page, pageSize: PAGE_SIZE, items: rows.map(toCard), hasMore: page * PAGE_SIZE < total };
}

/** Facet options for the filter sidebar, scoped to the current category / collection / search. */
export async function getCatalogFacets(scope: Pick<CatalogParams, "category" | "collection" | "q" | "flag">) {
  const where = await buildCatalogWhere(scope);
  const [variants, price, categories, collections] = await Promise.all([
    prisma.productVariant.findMany({
      where: { product: where },
      distinct: ["size", "colorId"],
      select: { size: true, color: { select: { name: true, slug: true, hex: true, position: true } } },
    }),
    prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    prisma.category.findMany({
      where: { published: true, products: { some: { product: where } } },
      orderBy: [{ parentId: "asc" }, { position: "asc" }],
      select: { name: true, slug: true, parentId: true },
    }),
    prisma.collection.findMany({
      where: { published: true, products: { some: { product: where } } },
      orderBy: { position: "asc" },
      select: { name: true, slug: true },
    }),
  ]);
  const sizes = sortSizes([...new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s)))]);
  const colorMap = new Map<string, { name: string; slug: string; hex: string; position: number }>();
  for (const v of variants) if (v.color) colorMap.set(v.color.slug, v.color);
  const colors = [...colorMap.values()].sort((a, b) => a.position - b.position);
  return {
    sizes,
    colors,
    categories: categories.filter((c) => c.parentId !== null),
    collections,
    minPrice: price._min.price ?? 0,
    maxPrice: price._max.price ?? 0,
  };
}

// ───────────────────────────── Product page ─────────────────────────────

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    const product = await prisma.product.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: {
          orderBy: { position: "asc" },
          include: { color: true },
        },
        category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
        subcategory: { select: { name: true, slug: true } },
        collections: { orderBy: { position: "asc" }, include: { collection: { select: { name: true, slug: true } } } },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, name: true, rating: true, title: true, body: true, size: true, createdAt: true },
        },
      },
    });
    if (!product) return null;
    return {
      ...product,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        stock: v.stock,
        price: v.price ?? product.price,
        compareAtPrice: v.compareAtPrice ?? product.compareAtPrice,
        color: v.color ? { name: v.color.name, slug: v.color.slug, hex: v.color.hex } : null,
      })),
      reviews: product.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      publishedAt: product.publishedAt?.toISOString() ?? null,
    };
  },
  ["product-by-slug"],
  CACHE,
);

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export const getRelatedProducts = unstable_cache(
  async (productId: string, categoryId: string | null, limit = 8) => {
    const rows = await prisma.product.findMany({
      where: {
        ...LISTED,
        id: { not: productId },
        ...(categoryId ? { OR: [{ categoryId }, { bestSeller: true }] } : {}),
      },
      orderBy: [{ salesCount: "desc" }],
      take: limit,
      select: cardSelect,
    });
    return rows.map(toCard);
  },
  ["related-products"],
  CACHE,
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string) =>
    prisma.category.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        seoTitle: true,
        seoDescription: true,
        parent: { select: { name: true, slug: true } },
        children: { where: { published: true }, orderBy: { position: "asc" }, select: { name: true, slug: true } },
      },
    }),
  ["category-by-slug"],
  CACHE,
);

export const getCollectionBySlug = unstable_cache(
  async (slug: string) =>
    prisma.collection.findFirst({
      where: { slug, published: true },
      select: { id: true, name: true, slug: true, description: true, heroImage: true, seoTitle: true, seoDescription: true },
    }),
  ["collection-by-slug"],
  CACHE,
);

// ───────────────────────────── Homepage ─────────────────────────────

export const getHomepageSections = unstable_cache(
  async () =>
    prisma.homepageSection.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        title: true,
        subtitle: true,
        body: true,
        image: true,
        mobileImage: true,
        videoUrl: true,
        buttonLabel: true,
        buttonLink: true,
        button2Label: true,
        button2Link: true,
        background: true,
        textColor: true,
        config: true,
      },
    }),
  ["homepage-sections"],
  CACHE,
);

export type HomepageSectionData = Awaited<ReturnType<typeof getHomepageSections>>[number];

/** First photo of a listed product, used when a category or collection has no image of its own. */
const coverProduct = {
  where: { product: LISTED },
  take: 1,
  orderBy: { product: { createdAt: "desc" } },
  select: { product: { select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } },
} as const;
const coverOf = (rows: { product: { images: { url: string }[] } }[]) => rows[0]?.product.images[0]?.url ?? null;

export const getCategoryTiles = unstable_cache(
  async (slugs?: string[]) => {
    const rows = await prisma.category.findMany({
      where: slugs?.length
        ? { slug: { in: slugs }, published: true }
        : { published: true, parentId: { not: null }, OR: [{ image: { not: null } }, { products: { some: { product: LISTED } } }] },
      orderBy: { position: "asc" },
      take: 8,
      select: { id: true, name: true, slug: true, image: true, products: coverProduct },
    });
    return rows.map(({ products, ...c }) => ({ ...c, image: c.image ?? coverOf(products) })).filter((c) => c.image);
  },
  ["category-tiles"],
  CACHE,
);

export const getCollectionTiles = unstable_cache(
  async () => {
    const rows = await prisma.collection.findMany({
      where: { published: true, OR: [{ heroImage: { not: null } }, { products: { some: { product: LISTED } } }] },
      orderBy: { position: "asc" },
      take: 6,
      select: { id: true, name: true, slug: true, heroImage: true, description: true, products: coverProduct },
    });
    return rows.map(({ products, ...c }) => ({ ...c, heroImage: c.heroImage ?? coverOf(products) }));
  },
  ["collection-tiles"],
  CACHE,
);
