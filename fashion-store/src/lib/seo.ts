import { formatMoney } from "@/lib/utils";

/** Link-preview card (1200×630, VELLA wordmark on the site's colour glows) for pages without their own image. */
export const DEFAULT_OG_IMAGE = "/og.jpg";

const DESCRIPTION_MAX = 160;

/**
 * True for text that reads as Ukrainian: mostly Cyrillic, with letters that
 * exist only in Ukrainian and none that exist only in Russian. Supplier feeds
 * arrive in Russian or English, and those texts must not reach Google as the
 * store's own description.
 */
export function isUkrainianText(text: string | null | undefined): text is string {
  if (!text?.trim()) return false;
  if (/[ыэъё]/i.test(text)) return false;
  // Russian text without its own letters ("натуральная кожа") still lacks і/ї/є/ґ.
  if (!/[іїєґ]/i.test(text)) return false;
  const cyrillic = text.match(/[\u0400-\u04FF]/g)?.length ?? 0;
  const latin = text.match(/[a-z]/gi)?.length ?? 0;
  return cyrillic > 0 && cyrillic >= latin * 2;
}

/** Drops a trailing "— VELLA" / "| VELLA" from a stored title: the layout's title template adds it. */
export function withoutStoreSuffix(title: string) {
  return title.replace(/\s*[—–|-]\s*VELLA\s*$/i, "").trim() || title;
}

function mentionsAny(text: string, names: (string | null | undefined)[]) {
  const lower = text.toLowerCase();
  return names.some((n) => n && n.trim().length > 1 && lower.includes(n.trim().toLowerCase()));
}

function clip(text: string, max = DESCRIPTION_MAX) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

type ProductSeoInput = {
  name: string;
  seoTitle: string | null;
  seoDescription: string | null;
  shortDescription: string | null;
  brand: string | null;
  supplier: string | null;
  price: number;
  currency: string;
  category: { name: string } | null;
  subcategory: { name: string } | null;
  variants: { color: { name: string } | null }[];
};

/**
 * Page title for a product. The store sells under its own name, so a stored SEO
 * title that names the supplier's brand (imported as "Name | Brand") is ignored.
 */
export function productSeoTitle(p: ProductSeoInput) {
  const custom = p.seoTitle?.trim();
  if (custom && !custom.includes("|") && !mentionsAny(custom, [p.brand, p.supplier])) return withoutStoreSuffix(custom);
  return p.name;
}

/**
 * Meta description for a product, always in Ukrainian and never naming the
 * supplier. A stored text is used when it qualifies; otherwise one is built
 * from the product's name, category, colours and price.
 */
export function productSeoDescription(p: ProductSeoInput) {
  const hidden = [p.brand, p.supplier];
  for (const text of [p.seoDescription, p.shortDescription]) {
    if (isUkrainianText(text) && !mentionsAny(text, hidden)) return clip(text);
  }
  const category = (p.subcategory ?? p.category)?.name;
  // Supplier colour names such as "Noir" stay untranslated; only Cyrillic ones go into the text.
  const colors = [
    ...new Set(p.variants.map((v) => v.color?.name).filter((c): c is string => Boolean(c && /[Ѐ-ӿ]/.test(c)))),
  ].slice(0, 3);
  const parts = [
    `${p.name}${category ? ` — ${category.toLowerCase()}` : ""}${colors.length ? `, ${colors.join(", ").toLowerCase()}` : ""}, VELLA.`,
    `Ціна ${formatMoney(p.price, p.currency)}.`,
    "Доставка Новою Поштою по Україні, обмін і повернення 14 днів.",
  ];
  return clip(parts.join(" "));
}

/** Meta description for a category or collection that has none of its own. */
export function listingSeoDescription(name: string, stored?: string | null) {
  if (isUkrainianText(stored)) return clip(stored);
  return clip(`${name} в інтернет-магазині VELLA. Нові моделі, актуальні ціни, доставка Новою Поштою по Україні, обмін і повернення 14 днів.`);
}

/** "?page=N" suffix for a listing's canonical URL; page 1 has none. */
export function pageSuffix(sp: Record<string, string | string[] | undefined>, joiner: "?" | "&" = "?") {
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 && n <= 50 ? `${joiner}page=${n}` : "";
}
