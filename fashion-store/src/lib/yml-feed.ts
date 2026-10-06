import "server-only";
import { SaxesParser } from "saxes";
import type { Field, ParsedRow } from "@/lib/importer";
import { assertPublicHttpUrl } from "@/lib/storage";

/**
 * Prom.ua / Yandex-style YML product feeds:
 * <yml_catalog><shop><categories><category id parentId>…</category></categories>
 * <offers><offer id available group_id><name/><price/><oldprice/><categoryId/><picture/>…<param name="Розмір">M</param></offer></offers>
 * Each <offer> is one variant; offers sharing group_id are one product.
 */

type Offer = {
  id: string;
  available: string;
  groupId: string;
  fields: Record<string, string>;
  pictures: string[];
  params: { name: string; value: string }[];
};

const COLOR_PARAM = /^(колір|цвет|color|колор)/i;
const SIZE_PARAM = /^(розмір|размер|size)/i;
const MATERIAL_PARAM = /^(склад|состав|матеріал|материал|тканина|ткань)/i;

function htmlToText(html: string) {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Худі oversize чорне, M" → "Худі oversize чорне" when M is the offer's size. */
function stripSize(name: string, size: string) {
  if (!size) return name;
  const re = new RegExp(`[\\s,/(-]+(?:розмір|размер|р\\.)?\\s*${escapeRe(size)}\\)?\\s*$`, "i");
  const out = name.replace(re, "").trim();
  return out || name;
}

export function parseYml(xml: string): ParsedRow[] {
  const categories = new Map<string, { name: string; parentId: string }>();
  const offers: Offer[] = [];
  const parser = new SaxesParser();
  const stack: string[] = [];
  let text = "";
  let offer: Offer | null = null;
  let category: { id: string; parentId: string } | null = null;
  let paramName = "";

  parser.on("opentag", (tag) => {
    const name = tag.name.toLowerCase();
    const attrs = tag.attributes as Record<string, string>;
    stack.push(name);
    text = "";
    if (name === "offer") offer = { id: attrs.id ?? "", available: attrs.available ?? "", groupId: attrs.group_id ?? "", fields: {}, pictures: [], params: [] };
    else if (name === "category" && stack.includes("categories")) category = { id: attrs.id ?? "", parentId: attrs.parentId ?? attrs.parentid ?? "" };
    else if (name === "param") paramName = attrs.name ?? "";
  });
  parser.on("text", (t) => (text += t));
  parser.on("cdata", (t) => (text += t));
  parser.on("closetag", (tag) => {
    const name = tag.name.toLowerCase();
    stack.pop();
    const value = text.trim();
    if (name === "category" && category) {
      categories.set(category.id, { name: value, parentId: category.parentId });
      category = null;
    } else if (name === "offer" && offer) {
      offers.push(offer);
      offer = null;
    } else if (offer) {
      if (name === "picture") {
        if (value) offer.pictures.push(value);
      } else if (name === "param") offer.params.push({ name: paramName, value });
      else if (stack[stack.length - 1] === "offer") offer.fields[name] = value;
    }
    text = "";
  });
  try {
    parser.write(xml).close();
  } catch (e) {
    throw new Error(`Не вдалося прочитати XML: ${e instanceof Error ? e.message.split("\n")[0] : "помилка формату"}`);
  }

  // Root → category, deepest → subcategory.
  const chain = (id: string) => {
    const out: string[] = [];
    for (let cur = categories.get(id), guard = 0; cur && guard < 10; cur = categories.get(cur.parentId), guard++) out.unshift(cur.name);
    return out;
  };
  const vendorCodeCount = new Map<string, number>();
  for (const o of offers) if (o.fields.vendorcode) vendorCodeCount.set(o.fields.vendorcode, (vendorCodeCount.get(o.fields.vendorcode) ?? 0) + 1);

  return offers.map((o, i) => {
    const f = o.fields;
    const param = (re: RegExp) => o.params.find((p) => re.test(p.name.trim()))?.value ?? "";
    const size = param(SIZE_PARAM);
    const vendorCode = f.vendorcode ?? "";
    // group_id-id keeps variant SKUs unique and stable between feed updates.
    const sku = o.groupId ? `${o.groupId}-${o.id}` : vendorCode && vendorCodeCount.get(vendorCode) === 1 ? vendorCode : o.id;
    const cats = chain(f.categoryid ?? "");
    const qty = f.quantity_in_stock ?? f.stock_quantity ?? f.quantity ?? "";
    const stock = o.available === "false" ? "0" : qty.replace(/\D/g, "") || "10";
    const data: Partial<Record<Field, string>> = {
      sku,
      parentSku: o.groupId || undefined,
      name: stripSize(f.name_ua || f.name || f.model || "", size),
      category: cats[0],
      subcategory: cats.length > 1 ? cats[cats.length - 1] : undefined,
      color: param(COLOR_PARAM) || undefined,
      size: size || undefined,
      price: (f.price ?? "").replace(",", "."),
      compareAt: (f.oldprice ?? f.price_old ?? f.old_price ?? "").replace(",", ".") || undefined,
      stock,
      description: htmlToText(f.description_ua || f.description || "") || undefined,
      images: o.pictures.join(" ") || undefined,
      status: "published",
      brand: f.vendor || undefined,
      material: param(MATERIAL_PARAM) || undefined,
      tags: f.keywords_ua || f.keywords || undefined,
    };
    for (const k of Object.keys(data) as Field[]) if (data[k] === undefined || data[k] === "") delete data[k];
    return { row: i + 1, data };
  });
}

const FEED_MAX_BYTES = 50 * 1024 * 1024;
const feedCache = new Map<string, { at: number; text: string }>();

/** Downloads a feed (cached for 10 minutes so chunked imports read the same snapshot). */
export async function fetchFeed(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Некоректне посилання на фід");
  }
  assertPublicHttpUrl(url);
  const cached = feedCache.get(url.href);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.text;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { accept: "application/xml,text/xml,*/*" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Фід недоступний (${res.status})`);
    if (Number(res.headers.get("content-length") || 0) > FEED_MAX_BYTES) throw new Error("Фід більше 50 МБ");
    const text = await res.text();
    if (text.length > FEED_MAX_BYTES) throw new Error("Фід більше 50 МБ");
    feedCache.clear();
    feedCache.set(url.href, { at: Date.now(), text });
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Фід не відповів за 60 секунд");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
