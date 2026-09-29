import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { importRemoteFile } from "@/lib/storage";
import { slugify, toMinor } from "@/lib/utils";

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

type Field =
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
  } else {
    throw new Error("Непідтримуваний тип файлу. Завантажте .csv або .xlsx");
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

  for (const r of rows) {
    const d = r.data;
    const groupKey = groupKeyOf(d);
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

async function uniqueProductSlug(name: string) {
  const base = slugify(name) || "product";
  let slug = base;
  for (let i = 2; await prisma.product.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

async function resolveImages(urls: string[], alt: string, warn: (w: string) => void) {
  const out: string[] = [];
  for (const url of urls) {
    if (url.startsWith("/")) {
      out.push(url);
      continue;
    }
    try {
      const m = await importRemoteFile(url, alt);
      out.push(m.url);
    } catch (e) {
      warn(`Фото не імпортовано (${url}): ${e instanceof Error ? e.message : "помилка"}`);
    }
  }
  return out;
}

export async function commitImport(rows: ParsedRow[]): Promise<ImportResult> {
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

  for (const [, groupRows] of groups) {
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

      const warn = (w: string) => result.warnings.push({ row: groupRows[0].row, sku: first.sku!, warning: w });
      const imageRows: { url: string; colorName: string | null }[] = [];
      for (const r of groupRows) {
        const urls = splitImages(r.data.images);
        if (!urls.length) continue;
        const stored = await resolveImages(urls, first.name!, warn);
        for (const u of stored) if (!imageRows.some((x) => x.url === u)) imageRows.push({ url: u, colorName: r.data.color || null });
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
                  slug: await uniqueProductSlug(first.name!),
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
          for (const [idx, r] of groupRows.entries()) {
            const d = r.data;
            const colorId = d.color ? await findOrCreateColor(d.color, d.colorHex, colorCache) : null;
            const price = toMinor(d.price)!;
            const stock = d.stock ? Math.max(0, parseInt(d.stock.replace(/\s/g, ""), 10)) : undefined;
            const existing = await tx.productVariant.findFirst({ where: { sku: { equals: d.sku!, mode: "insensitive" } } });
            if (existing) {
              await tx.productVariant.update({
                where: { id: existing.id },
                data: { productId: product.id, ...(d.color ? { colorId } : {}), ...(d.size ? { size: d.size.toUpperCase() } : {}), ...(stock !== undefined ? { stock } : {}), price: price !== basePrice ? price : null },
              });
            } else {
              // A variant with the same color/size may already exist under another SKU
              const clash = await tx.productVariant.findFirst({ where: { productId: product.id, colorId, size: d.size ? d.size.toUpperCase() : null } });
              if (clash) throw new Error(`Рядок ${r.row}: у товару вже є варіант ${[d.color, d.size].filter(Boolean).join(" / ")} (артикул ${clash.sku})`);
              await tx.productVariant.create({
                data: { productId: product.id, sku: d.sku!, colorId, size: d.size ? d.size.toUpperCase() : null, stock: stock ?? 0, price: price !== basePrice ? price : null, position: idx },
              });
            }
          }
          // keep base price consistent when overrides equal base
          await tx.productVariant.updateMany({ where: { productId: product.id, price: basePrice }, data: { price: null } });
        },
        { timeout: 60000 },
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
  }
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
