import type { CatalogParams, CatalogSort } from "@/lib/queries";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: CatalogSort[] = ["featured", "newest", "price-asc", "price-desc", "bestselling"];
const FLAGS = ["new", "sale", "bestseller", "featured"] as const;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .flatMap((x) => x.split(","))
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | string[] | undefined) {
  const n = Number(first(v));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

/** Parse URL search params into validated catalog params (prices in URL are major units). */
export function parseCatalogParams(sp: RawSearchParams): CatalogParams {
  const sort = first(sp.sort) as CatalogSort | undefined;
  const flag = first(sp.flag) as (typeof FLAGS)[number] | undefined;
  const page = Number(first(sp.page));
  return {
    sizes: list(sp.size),
    colors: list(sp.color),
    categories: list(sp.category),
    collections: list(sp.collection),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    inStock: first(sp.stock) === "1",
    flag: flag && FLAGS.includes(flag) ? flag : undefined,
    sort: sort && SORTS.includes(sort) ? sort : "featured",
    q: first(sp.q)?.slice(0, 100) || undefined,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 50) : 1,
  };
}

export const SORT_LABELS: Record<CatalogSort, string> = {
  featured: "Рекомендовані",
  newest: "Новинки",
  "price-asc": "Ціна: від низької",
  "price-desc": "Ціна: від високої",
  bestselling: "Бестселери",
};

export const FLAG_TITLES: Record<string, string> = {
  new: "New arrivals",
  sale: "Sale",
  bestseller: "Best sellers",
  featured: "Trending",
};
