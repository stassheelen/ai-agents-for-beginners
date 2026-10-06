import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { importRemoteFile } from "@/lib/storage";
import { slugify, toMinor } from "@/lib/utils";
import { parseYml } from "@/lib/yml-feed";

/**
 * Bulk product import (CSV / XLSX).
 *
 * One row = one variant. Rows sharing the same "Parent SKU" (or, if absent, the same
 * "Product Name") become one product. Matching rules:
 *   • variant SKU already exists  → that variant + its product are UPDATED (never duplicated)
 *   • product SKU already exists  → new variants are added to it (product UPDATED)
 *   • otherwise                    → product is CREATED
 */

export const IMPORT_COLUMNS = [
  "Артикул",
  "Артикул моделі",
  "Назва",
  "Категорія",
  "Підкатегорія",
  "Колекція",
  "Колір",
  "Код кольору",
  "Розмір",
  "Ціна",
  "Стара ціна",
  "Собівартість",
  "Залишок",
  "Опис",
  "Короткий опис",
  "Фото URL",
  "Статус",
  "Теги",
  "Склад",
  "Догляд",
  "Бренд",
  "SEO заголовок",
  "SEO опис",
  "Рекомендований",
  "Новинка",
  "Бестселер",
] as const;

export type Field =
  | "sku"
  | "parentSku"
  | "name"
  | "category"
  | "subcategory"
  | "collection"
  | "color"
  | "colorHex"
  | "size"
  | "price"
  | "compareAt"
  | "cost"
  | "stock"
  | "description"
  | "shortDescription"
  | "images"
  | "status"
  | "tags"
  | "material"
  | "care"
  | "brand"
  | "seoTitle"
  | "seoDescription"
  | "featured"
  | "isNew"
  | "bestSeller";

const ALIASES: Record<Field, string[]> = {
  sku: ["sku", "variantsku", "артикул", "артикулваріанту", "код"],
  parentSku: ["parentsku", "productsku", "handle", "groupsku", "модель", "артикулмоделі", "артикултовару"],
  name: ["productname", "name", "title", "назва", "назватовару"],
  category: ["category", "категорія"],
  subcategory: ["subcategory", "підкатегорія"],
  collection: ["collection", "collections", "колекція"],
  color: ["color", "colour", "колір"],
  colorHex: ["colorhex", "hex", "colourhex", "кодкольору"],
  size: ["size", "розмір"],
  price: ["price", "sellingprice", "ціна"],
  compareAt: ["compareprice", "compareatprice", "oldprice", "стараціна", "ціназастарою"],
  cost: ["cost", "costprice", "собівартість"],
  stock: ["stock", "qty", "quantity", "inventory", "залишок", "кількість"],
  description: ["description", "опис"],
  shortDescription: ["shortdescription", "короткийопис"],
  images: ["imageurl", "image", "images", "imageurls", "фото", "фотоurl", "зображення"],
  status: ["status", "статус"],
  tags: ["tags", "теги"],
  material: ["material", "склад", "матеріал"],
  care: ["care", "careinstructions", "догляд"],
  brand: ["brand", "бренд"],
  seoTitle: ["seotitle", "seoзаголовок"],
  seoDescription: ["seodescription", "seoопис"],
  featured: ["featured", "рекомендований"],
  isNew: ["new", "isnew", "новинка"],
  bestSeller: ["bestseller", "bestsellers", "бестселер"],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, "");

const COLOR_HEX: Record<string, string> = {
  black: "#1c1c1c",
  white: "#f4f2ee",
  grey: "#a3a4a2",
  gray: "#a3a4a2",
  brown: "#5e4436",
  beige: "#d6c5ab",
  blue: "#7b90a8",
  navy: "#1f2a44",
  green: "#5f6549",
  olive: "#6b6b3e",
  red: "#9b2d2d",
  pink: "#e3b5b8",
  cream: "#ece4d4",
  чорний: "#1c1c1c",
  білий: "#f4f2ee",
  сірий: "#a3a4a2",
  коричневий: "#5e4436",
  бежевий: "#d6c5ab",
  блакитний: "#7b90a8",
  синій: "#1f2a44",
  зелений: "#5f6549",
  оливковий: "#5f6549",
  червоний: "#9b2d2d",
  рожевий: "#e3b5b8",
  молочний: "#ece4d4",
};

export type ParsedRow = { row: number; data: Partial<Record<Field, string>> };

export type RowPlan = {
  row: number;
  sku: string;
  name: string;
  color: string;
  size: string;
  price: string;
  stock: string;
  action: "create" | "update" | "duplicate" | "error";
  message?: string;
  groupKey: string;
};

export type ImportPreview = {
  totalRows: number;
  newProducts: number;
  updatedProducts: number;
  newVariants: number;
  updatedVariants: number;
  duplicates: number;
  errors: number;
  unknownColumns: string[];
  rows: RowPlan[];
};

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorRows: { row: number; sku: string; error: string }[];
  warnings: { row: number; sku: string; warning: string }[];
  /** Chunked commits: product groups in the whole file / done after this chunk. */
  totalGroups?: number;
  processedGroups?: number;
  done?: boolean;
};

// ───────────────────────────── Parsing ─────────────────────────────

export const MAX_ROWS = 5000;

export async function parseFile(file: File): Promise<{ rows: ParsedRow[]; unknownColumns: string[] }> {
  const name = file.name.toLowerCase();
  let table: string[][] = [];
  if (name.endsWith(".csv") || file.type === "text/csv") {
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const res = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    table = res.data;
  } else if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("У файлі немає аркушів");
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      const count = Math.max(row.cellCount, ws.columnCount);
      for (let c = 1; c <= count; c++) {
        const v = row.getCell(c).value;
        let s = "";
        if (v === null || v === undefined) s = "";
        else if (typeof v === "object" && "text" in v) s = String((v as { text: unknown }).text ?? "");
        else if (typeof v === "object" && "hyperlink" in v) s = String((v as { hyperlink: string }).hyperlink);
        else if (typeof v === "object" && "result" in v) s = String((v as { result: unknown }).result ?? "");
        else if (typeof v === "object" && "richText" in v) s = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
        else if (v instanceof Date) s = v.toISOString();
        else s = String(v);
        values.push(s);
      }
      table.push(values);
    });
  } else if (name.endsWith(".xml") || name.endsWith(".yml") || file.type.includes("xml")) {
    return parseFeedText(await file.text());
  } else {
    throw new Error("Непідтримуваний тип файлу. Завантажте .csv, .xlsx або .xml");
  }
  if (table.length < 2) throw new Error("У файлі немає рядків з даними");
  if (table.length - 1 > MAX_ROWS) throw new Error(`Забагато рядків (максимум ${MAX_ROWS}). Розділіть файл.`);

  const header = table[0].map((h) => String(h ?? ""));
  const map: (Field | null)[] = header.map((h) => {
    const n = norm(h);
    return (Object.keys(ALIASES) as Field[]).find((f) => ALIASES[f].includes(n)) ?? null;
  });
  const unknownColumns = header.filter((h, i) => h.trim() && !map[i]);
  if (!map.includes("sku")) throw new Error("Відсутня обовʼязкова колонка: Артикул (SKU)");
  if (!map.includes("name")) throw new Error("Відсутня обовʼязкова колонка: Назва");

  const rows: ParsedRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const data: Partial<Record<Field, string>> = {};
    table[r].forEach((cell, i) => {
      const f = map[i];
      if (f) data[f] = String(cell ?? "").trim();
    });
    if (Object.values(data).every((v) => !v)) continue;
    rows.push({ row: r + 1, data });
  }
  return { rows, unknownColumns };
}

/** Prom / YML product feed (XML) → import rows. */
export function parseFeedText(xml: string): { rows: ParsedRow[]; unknownColumns: string[] } {
  const rows = parseYml(xml);
  if (!rows.length) throw new Error("У фіді не знайдено товарів (<offer>)");
  if (rows.length > MAX_ROWS) throw new Error(`Забагато товарів у фіді (${rows.length}, максимум ${MAX_ROWS})`);
  return { rows, unknownColumns: [] };
}

// ───────────────────────────── Planning ─────────────────────────────

function rowError(d: Partial<Record<Field, string>>): string | null {
  if (!d.sku) return "Не вказано артикул (SKU)";
  if (d.sku.length > 64) return "Артикул задовгий (максимум 64 символи)";
  if (!d.name) return "Не вказано назву товару";
  if (!d.price || toMinor(d.price) === null || toMinor(d.price)! < 0) return `Некоректна ціна: "${d.price ?? ""}"`;
  if (d.compareAt && toMinor(d.compareAt) === null) return `Некоректна стара ціна: "${d.compareAt}"`;
  if (d.cost && toMinor(d.cost) === null) return `Некоректна собівартість: "${d.cost}"`;
  if (d.stock && !/^-?\d+$/.test(d.stock.replace(/\s/g, ""))) return `Некоректний залишок: "${d.stock}"`;
  if (d.status && !["draft", "published", "active", "archived", "чернетка", "опубліковано", "архів"].includes(d.status.toLowerCase())) return `Некоректний статус: "${d.status}" (Чернетка / Опубліковано / Архів)`;
  if (d.colorHex && !/^#?[0-9a-f]{6}$/i.test(d.colorHex)) return `Некоректний код кольору: "${d.colorHex}"`;
  for (const url of splitImages(d.images)) {
    if (!url.startsWith("/") && !/^https?:\/\/\S+$/i.test(url)) return `Некоректне посилання на фото: "${url}"`;
  }
  return null;
}

function splitImages(v?: string) {
  return (v ?? "")
    .split(/[\s,|;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const groupKeyOf = (d: Partial<Record<Field, string>>) => (d.parentSku ? `sku:${d.parentSku.toUpperCase()}` : `name:${slugify(d.name ?? "")}`);

const comboOf = (d: Partial<Record<Field, string>>) => `${(d.color ?? "").trim().toLowerCase()}|${(d.size ?? "").trim().toUpperCase()}`;
const skuPrefix = (sku: string) => {
  const i = Math.max(sku.lastIndexOf("-"), sku.lastIndexOf("_"), sku.lastIndexOf("/"), sku.lastIndexOf("."));
  return i > 0 ? sku.slice(0, i).toUpperCase() : "";
};

/**
 * Product group for every row. Rows with a parent SKU group by it. Rows without one group by name, but different
 * models often share a name ("Худі oversize" in several fabrics): when the same colour + size appears twice under one
 * name, the rows are split by SKU prefix (133470-431447 → 133470), and failing that, into as many products as needed.
 */
function assignGroupKeys(rows: ParsedRow[]): Map<number, string> {
  const keys = new Map<number, string>();
  const byName = new Map<string, ParsedRow[]>();
  for (const r of rows) {
    const k = groupKeyOf(r.data);
    keys.set(r.row, k);
    if (!r.data.parentSku && r.data.sku) byName.set(k, [...(byName.get(k) ?? []), r]);
  }
  const clashes = (list: ParsedRow[]) => new Set(list.map((r) => comboOf(r.data))).size < list.length;
  for (const [nameKey, list] of byName) {
    if (!clashes(list)) continue;
    const byPrefix = new Map<string, ParsedRow[]>();
    for (const r of list) byPrefix.set(skuPrefix(r.data.sku!), [...(byPrefix.get(skuPrefix(r.data.sku!)) ?? []), r]);
    if (!byPrefix.has("") && [...byPrefix.values()].every((l) => !clashes(l))) {
      for (const [prefix, l] of byPrefix) for (const r of l) keys.set(r.row, `${nameKey}|${prefix}`);
      continue;
    }
    // Fallback: put each row into the first product that does not have its colour + size yet.
    const buckets: Set<string>[] = [];
    for (const r of list) {
      const combo = comboOf(r.data);
      let i = buckets.findIndex((b) => !b.has(combo));
      if (i < 0) i = buckets.push(new Set()) - 1;
      buckets[i].add(combo);
      keys.set(r.row, i === 0 ? nameKey : `${nameKey}|${i + 1}`);
    }
  }
  return keys;
}

export async function planImport(rows: ParsedRow[], unknownColumns: string[] = []): Promise<ImportPreview> {
  const skus = rows.map((r) => r.data.sku?.toUpperCase()).filter((s): s is string => Boolean(s));
  const parentSkus = rows.map((r) => r.data.parentSku?.toUpperCase()).filter((s): s is string => Boolean(s));
  const [existingVariants, existingProducts] = await Promise.all([
    prisma.productVariant.findMany({ where: { sku: { in: skus, mode: "insensitive" } }, select: { sku: true, productId: true } }),
    prisma.product.findMany({ where: { sku: { in: [...skus, ...parentSkus], mode: "insensitive" } }, select: { id: true, sku: true } }),
  ]);
  const variantBySku = new Map(existingVariants.map((v) => [v.sku.toUpperCase(), v.productId]));
  const productBySku = new Map(existingProducts.map((p) => [p.sku.toUpperCase(), p.id]));

  const seen = new Set<string>();
  const groupProduct = new Map<string, string | null>(); // groupKey -> existing productId | null (new)
  const plans: RowPlan[] = [];
  let newVariants = 0;
  let updatedVariants = 0;
  const groupKeys = assignGroupKeys(rows.filter((r) => !rowError(r.data)));

  for (const r of rows) {
    const d = r.data;
    const groupKey = groupKeys.get(r.row) ?? groupKeyOf(d);
    const base = { row: r.row, sku: d.sku ?? "", name: d.name ?? "", color: d.color ?? "", size: d.size ?? "", price: d.price ?? "", stock: d.stock ?? "", groupKey };
    const err = rowError(d);
    if (err) {
      plans.push({ ...base, action: "error", message: err });
      continue;
    }
    const sku = d.sku!.toUpperCase();
    if (seen.has(sku)) {
      plans.push({ ...base, action: "duplicate", message: "Артикул повторюється у файлі — рядок пропущено" });
      continue;
    }
    seen.add(sku);

    const existingProductId = variantBySku.get(sku) ?? productBySku.get((d.parentSku ?? "").toUpperCase()) ?? (groupProduct.get(groupKey) || null) ?? productBySku.get(sku) ?? null;
    if (!groupProduct.has(groupKey) || (existingProductId && !groupProduct.get(groupKey))) groupProduct.set(groupKey, existingProductId);

    if (variantBySku.has(sku)) {
      updatedVariants++;
      plans.push({ ...base, action: "update", message: "Артикул уже існує — товар буде оновлено" });
    } else {
      newVariants++;
      plans.push({ ...base, action: groupProduct.get(groupKey) ? "update" : "create", message: groupProduct.get(groupKey) ? "Новий варіант для наявного товару" : undefined });
    }
  }

  const values = [...groupProduct.values()];
  return {
    totalRows: rows.length,
    newProducts: values.filter((v) => !v).length,
    updatedProducts: new Set(values.filter(Boolean)).size,
    newVariants,
    updatedVariants,
    duplicates: plans.filter((p) => p.action === "duplicate").length,
    errors: plans.filter((p) => p.action === "error").length,
    unknownColumns,
    rows: plans,
  };
}

// ───────────────────────────── Commit ─────────────────────────────

function bool(v?: string) {
  return v ? ["1", "true", "yes", "y", "так", "+"].includes(v.toLowerCase()) : undefined;
}

function statusOf(v?: string): ProductStatus | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (["published", "active", "опубліковано"].includes(s)) return "PUBLISHED";
  if (["archived", "архів"].includes(s)) return "ARCHIVED";
  return "DRAFT";
}

async function findOrCreateCategory(name: string, parentId: string | null, cache: Map<string, string>) {
  const key = `${parentId ?? "root"}|${name.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;
  const slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }], ...(parentId ? { parentId } : {}) },
    select: { id: true },
  });
  let id = existing?.id;
  if (!id) {
    let s = slug || "category";
    for (let i = 2; await prisma.category.findUnique({ where: { slug: s }, select: { id: true } }); i++) s = `${slug}-${i}`;
    id = (await prisma.category.create({ data: { name, slug: s, parentId, showInNav: false } })).id;
  }
  cache.set(key, id);
  return id;
}

async function findOrCreateCollection(name: string, cache: Map<string, string>) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const slug = slugify(name);
  const existing = await prisma.collection.findFirst({ where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] }, select: { id: true } });
  const id = existing?.id ?? (await prisma.collection.create({ data: { name, slug: slug || `collection-${Date.now()}` } })).id;
  cache.set(key, id);
  return id;
}

async function findOrCreateColor(name: string, hex: string | undefined, cache: Map<string, string>) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const existing = await prisma.color.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
  let id = existing?.id;
  if (!id) {
    const count = await prisma.color.count();
    const h = hex ? (hex.startsWith("#") ? hex : `#${hex}`) : COLOR_HEX[key] ?? "#888888";
    let slug = slugify(name) || `color-${count + 1}`;
    if (await prisma.color.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${count + 1}`;
    id = (await prisma.color.create({ data: { name, slug, hex: h, position: count } })).id;
  }
  cache.set(key, id);
  return id;
}

/** `reserved` holds slugs taken earlier in this import, so parallel creates never pick the same one. */
async function uniqueProductSlug(name: string, reserved: Set<string>) {
  const base = slugify(name) || "product";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (reserved.has(slug)) continue;
    // Reserve before awaiting so a parallel create for the same name moves on to the next candidate.
    reserved.add(slug);
    if (!(await prisma.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const IMAGE_CONCURRENCY = 6;
const GROUP_CONCURRENCY = 3;
/** Product groups per chunked request: small enough to finish well inside the function time limit. */
export const IMPORT_CHUNK_SIZE = 25;

/** Downloads every distinct remote image once, in parallel. Returns url → stored url (missing when it failed). */
async function prefetchImages(groupRows: ParsedRow[][], warn: (row: ParsedRow, w: string) => void) {
  const stored = new Map<string, string>();
  const jobs = new Map<string, { url: string; alt: string; row: ParsedRow }>();
  for (const rows of groupRows) {
    for (const r of rows) {
      for (const url of splitImages(r.data.images)) {
        if (url.startsWith("/")) stored.set(url, url);
        else if (!jobs.has(url)) jobs.set(url, { url, alt: rows[0].data.name ?? "", row: r });
      }
    }
  }
  await eachLimit([...jobs.values()], IMAGE_CONCURRENCY, async (job) => {
    try {
      stored.set(job.url, (await importRemoteFile(job.url, job.alt)).url);
    } catch (e) {
      warn(job.row, `Фото не імпортовано (${job.url}): ${e instanceof Error ? e.message : "помилка"}`);
    }
  });
  return stored;
}

/**
 * Imports the file. With `chunk` set, only that slice of product groups is written (IMPORT_CHUNK_SIZE per chunk)
 * so a large file is committed over several short requests; row errors and duplicates are reported with chunk 0.
 */
export async function commitImport(rows: ParsedRow[], opts: { chunk?: number } = {}): Promise<ImportResult> {
  const plan = await planImport(rows);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: 0, errorRows: [], warnings: [] };
  const planByRow = new Map(plan.rows.map((p) => [p.row, p]));
  const catCache = new Map<string, string>();
  const colCache = new Map<string, string>();
  const colorCache = new Map<string, string>();

  // group valid rows
  const groups = new Map<string, ParsedRow[]>();
  for (const r of rows) {
    const p = planByRow.get(r.row)!;
    if (p.action === "error") {
      result.errors++;
      result.errorRows.push({ row: r.row, sku: p.sku, error: p.message ?? "Некоректний рядок" });
      continue;
    }
    if (p.action === "duplicate") {
      result.skipped++;
      result.errorRows.push({ row: r.row, sku: p.sku, error: p.message ?? "Дублікат" });
      continue;
    }
    const list = groups.get(p.groupKey) ?? [];
    list.push(r);
    groups.set(p.groupKey, list);
  }

  const allGroups = [...groups.values()];
  const chunked = opts.chunk !== undefined;
  const from = chunked ? opts.chunk! * IMPORT_CHUNK_SIZE : 0;
  const batch = chunked ? allGroups.slice(from, from + IMPORT_CHUNK_SIZE) : allGroups;
  if (chunked && opts.chunk! > 0) {
    // Row-level problems were already reported with the first chunk.
    result.errors = result.skipped = 0;
    result.errorRows = [];
  }
  result.totalGroups = allGroups.length;
  result.processedGroups = Math.min(allGroups.length, from + batch.length);
  result.done = result.processedGroups >= allGroups.length;

  // Images first: every distinct URL downloaded once, several at a time.
  const images = await prefetchImages(batch, (r, w) => result.warnings.push({ row: r.row, sku: r.data.sku ?? "", warning: w }));

  // Categories, collections and colours are shared between products: resolve them one by one before the parallel part.
  for (const groupRows of batch) {
    const pick = (f: Field) => groupRows.map((r) => r.data[f]).find((v) => v) || undefined;
    try {
      const categoryId = pick("category") ? await findOrCreateCategory(pick("category")!, null, catCache) : undefined;
      if (pick("subcategory") && categoryId) await findOrCreateCategory(pick("subcategory")!, categoryId, catCache);
      for (const r of groupRows) {
        for (const n of (r.data.collection ?? "").split(/[,;|]/).map((x) => x.trim()).filter(Boolean)) await findOrCreateCollection(n, colCache);
        if (r.data.color) await findOrCreateColor(r.data.color, r.data.colorHex, colorCache);
      }
    } catch {
      // Reported per product below.
    }
  }

  const reservedSlugs = new Set<string>();
  await eachLimit(batch, GROUP_CONCURRENCY, async (groupRows) => {
    const first = groupRows[0].data;
    try {
      // Locate existing product
      const variantSkus = groupRows.map((r) => r.data.sku!);
      const existingVariant = await prisma.productVariant.findFirst({ where: { sku: { in: variantSkus, mode: "insensitive" } }, select: { productId: true } });
      const productSku = (first.parentSku || first.sku)!;
      const existingProduct = existingVariant
        ? await prisma.product.findUnique({ where: { id: existingVariant.productId } })
        : await prisma.product.findFirst({ where: { sku: { equals: productSku, mode: "insensitive" } } });

      const pick = (f: Field) => groupRows.map((r) => r.data[f]).find((v) => v) || undefined;
      const prices = groupRows.map((r) => toMinor(r.data.price)!).filter((p) => p !== null);
      const basePrice = Math.min(...prices);
      const compareAt = pick("compareAt") ? toMinor(pick("compareAt")) : undefined;
      const cost = pick("cost") ? toMinor(pick("cost")) : undefined;

      const categoryId = pick("category") ? await findOrCreateCategory(pick("category")!, null, catCache) : undefined;
      const subcategoryId = pick("subcategory") && categoryId ? await findOrCreateCategory(pick("subcategory")!, categoryId, catCache) : undefined;
      const collectionNames = [...new Set(groupRows.flatMap((r) => (r.data.collection ?? "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean)))];
      const collectionIds = await Promise.all(collectionNames.map((n) => findOrCreateCollection(n, colCache)));

      const imageRows: { url: string; colorName: string | null }[] = [];
      for (const r of groupRows) {
        for (const url of splitImages(r.data.images)) {
          const u = images.get(url);
          if (u && !imageRows.some((x) => x.url === u)) imageRows.push({ url: u, colorName: r.data.color || null });
        }
      }

      const status = statusOf(pick("status"));
      const tags = pick("tags")?.split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
      const common: Prisma.ProductUncheckedUpdateInput = {
        name: first.name!,
        price: basePrice,
        ...(compareAt !== undefined ? { compareAtPrice: compareAt && compareAt > basePrice ? compareAt : null, onSale: Boolean(compareAt && compareAt > basePrice) } : {}),
        ...(cost !== undefined ? { costPrice: cost } : {}),
        ...(pick("description") ? { description: pick("description") } : {}),
        ...(pick("shortDescription") ? { shortDescription: pick("shortDescription") } : {}),
        ...(pick("material") ? { material: pick("material") } : {}),
        ...(pick("care") ? { careInstructions: pick("care") } : {}),
        ...(pick("brand") ? { brand: pick("brand") } : {}),
        ...(pick("seoTitle") ? { seoTitle: pick("seoTitle") } : {}),
        ...(pick("seoDescription") ? { seoDescription: pick("seoDescription") } : {}),
        ...(tags ? { tags } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(status ? { status, ...(status === "PUBLISHED" ? { publishedAt: existingProduct?.publishedAt ?? new Date() } : {}) } : {}),
        ...(bool(pick("featured")) !== undefined ? { featured: bool(pick("featured")) } : {}),
        ...(bool(pick("isNew")) !== undefined ? { isNew: bool(pick("isNew")) } : {}),
        ...(bool(pick("bestSeller")) !== undefined ? { bestSeller: bool(pick("bestSeller")) } : {}),
      };

      await prisma.$transaction(
        async (tx) => {
          const product = existingProduct
            ? await tx.product.update({ where: { id: existingProduct.id }, data: common })
            : await tx.product.create({
                data: {
                  ...(common as Prisma.ProductUncheckedCreateInput),
                  sku: productSku,
                  slug: await uniqueProductSlug(first.name!, reservedSlugs),
                  status: status ?? "DRAFT",
                  publishedAt: status === "PUBLISHED" ? new Date() : null,
                  isNew: bool(pick("isNew")) ?? true,
                },
              });

          // categories & collections
          const catIds = [categoryId ?? product.categoryId, subcategoryId ?? product.subcategoryId].filter((x): x is string => Boolean(x));
          for (const id of catIds) await tx.productCategory.upsert({ where: { productId_categoryId: { productId: product.id, categoryId: id } }, update: {}, create: { productId: product.id, categoryId: id } });
          for (const id of collectionIds) await tx.productCollection.upsert({ where: { productId_collectionId: { productId: product.id, collectionId: id } }, update: {}, create: { productId: product.id, collectionId: id } });

          // images (append new ones)
          if (imageRows.length) {
            const have = await tx.productImage.findMany({ where: { productId: product.id }, select: { url: true, position: true } });
            let pos = have.reduce((m, i) => Math.max(m, i.position + 1), 0);
            const fresh = imageRows.filter((i) => !have.some((h) => h.url === i.url));
            if (fresh.length) await tx.productImage.createMany({ data: fresh.map((i) => ({ productId: product.id, url: i.url, colorName: i.colorName, alt: first.name!, position: pos++ })) });
          }

          // variants
          const existingVariants = await tx.productVariant.findMany({ where: { sku: { in: variantSkus, mode: "insensitive" } } });
          for (const [idx, r] of groupRows.entries()) {
            const d = r.data;
            const colorId = d.color ? await findOrCreateColor(d.color, d.colorHex, colorCache) : null;
            const price = toMinor(d.price)!;
            const stock = d.stock ? Math.max(0, parseInt(d.stock.replace(/\s/g, ""), 10)) : undefined;
            const existing = existingVariants.find((v) => v.sku.toLowerCase() === d.sku!.toLowerCase());
            const size = d.size ? d.size.toUpperCase() : null;
            // Same colour + size under another SKU: keep the row, drop the colour link and flag it for manual editing.
            const clash = colorId && size ? await tx.productVariant.findFirst({ where: { productId: product.id, colorId, size, ...(existing ? { id: { not: existing.id } } : {}) }, select: { sku: true } }) : null;
            const linkColor = !clash;
            if (clash) {
              result.warnings.push({
                row: r.row,
                sku: d.sku!,
                warning: `Варіант ${[d.color, d.size].filter(Boolean).join(" / ")} уже є (артикул ${clash.sku}) — рядок імпортовано без кольору, відредагуйте товар вручну`,
              });
            }
            if (existing) {
              await tx.productVariant.update({
                where: { id: existing.id },
                data: { productId: product.id, ...(d.color ? { colorId: linkColor ? colorId : null } : {}), ...(d.size ? { size } : {}), ...(stock !== undefined ? { stock } : {}), price: price !== basePrice ? price : null },
              });
            } else {
              await tx.productVariant.create({
                data: { productId: product.id, sku: d.sku!, colorId: linkColor ? colorId : null, size, stock: stock ?? 0, price: price !== basePrice ? price : null, position: idx },
              });
            }
          }
          // keep base price consistent when overrides equal base
          await tx.productVariant.updateMany({ where: { productId: product.id, price: basePrice }, data: { price: null } });
        },
        { timeout: 60000, maxWait: 30000 },
      );
      if (existingProduct) result.updated++;
      else result.created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка імпорту";
      for (const r of groupRows) {
        result.errors++;
        result.errorRows.push({ row: r.row, sku: r.data.sku ?? "", error: msg.includes("Unique constraint") ? "Порушення унікальності (артикул або адреса вже використовуються)" : msg });
      }
    }
  });
  return result;
}

// ───────────────────────────── Template ─────────────────────────────

export function templateRows(): string[][] {
  return [
    [...IMPORT_COLUMNS],
    ["VL-TEST-001-BLK-S", "VL-TEST-001", "Легінси Studio в рубчик", "Одяг", "Легінси", "Базовий гардероб", "Чорний", "#1c1c1c", "S", "2190", "2590", "700", "15", "Легінси з високою посадкою.", "Легінси в рубчик", "https://example.com/images/leggings-black.jpg", "Опубліковано", "легінси, рубчик", "76% поліамід, 24% еластан", "Прання при 30°C", "VELLA", "", "", "ні", "так", "ні"],
    ["VL-TEST-001-BLK-M", "VL-TEST-001", "Легінси Studio в рубчик", "Одяг", "Легінси", "Базовий гардероб", "Чорний", "#1c1c1c", "M", "2190", "2590", "700", "21", "", "", "", "Опубліковано", "", "", "", "", "", "", "", "", ""],
    ["VL-TEST-001-WHT-S", "VL-TEST-001", "Легінси Studio в рубчик", "Одяг", "Легінси", "Базовий гардероб", "Білий", "#f4f2ee", "S", "2190", "2590", "700", "8", "", "", "", "Опубліковано", "", "", "", "", "", "", "", "", ""],
  ];
}
