import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z", и: "y",
  і: "i", ї: "yi", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu",
  я: "ya", ё: "yo", ы: "y", э: "e", ъ: "",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Money is stored in minor units (kopiyky / cents). */
export function formatMoney(minor: number, currency = "UAH") {
  const major = minor / 100;
  if (currency === "UAH") {
    return `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: major % 1 === 0 ? 0 : 2 }).format(major)} ₴`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(major);
}

export function toMinor(major: number | string | null | undefined): number | null {
  if (major === null || major === undefined || major === "") return null;
  const n = typeof major === "number" ? major : Number(String(major).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function fromMinor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 100).toString();
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function pluralUk(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function siteUrl(path = "") {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "ONE SIZE"];

export function sortSizes<T extends string | null>(sizes: T[]): T[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf((a ?? "").toUpperCase());
    const ib = SIZE_ORDER.indexOf((b ?? "").toUpperCase());
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function formatDate(d: Date | string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
