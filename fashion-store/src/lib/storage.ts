import "server-only";
import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { prisma } from "@/lib/db";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export class UploadError extends Error {}

/** Only public http(s) URLs: blocks localhost and private / link-local networks (SSRF guard for server-side fetches). */
export function assertPublicHttpUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UploadError("Дозволені лише посилання http(s)");
  const host = url.hostname;
  if (
    host === "localhost" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.endsWith(".internal") ||
    host === "[::1]"
  ) {
    throw new UploadError("Посилання на приватну мережу заборонені");
  }
}

function sniff(buf: Buffer): string | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("47494638")) return "image/gif";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString() === "ftypavif" || buf.subarray(4, 12).toString() === "ftypavis") return "image/avif";
  if (buf.subarray(4, 8).toString() === "ftyp") return "video/mp4";
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  return null;
}

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// ── Cloudflare R2 (S3-compatible). Preferred over Vercel Blob when configured. ──
const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"] as const;
export const r2Enabled = () => R2_VARS.every((k) => Boolean(process.env[k]?.trim()));
const r2PublicBase = () => (process.env.R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
let r2Client: AwsClient | null = null;
function r2() {
  r2Client ??= new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    service: "s3",
    region: "auto",
  });
  return r2Client;
}
const r2ObjectUrl = (key: string) =>
  `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com/${encodeURIComponent(process.env.R2_BUCKET!.trim())}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function r2Put(key: string, buffer: Buffer, contentType: string) {
  const res = await r2().fetch(r2ObjectUrl(key), {
    method: "PUT",
    body: new Uint8Array(buffer),
    headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) throw new UploadError(`Сховище R2 відхилило файл (${res.status})`);
  return `${r2PublicBase()}/${key}`;
}

/** Browser → Vercel Blob direct uploads are only used while Blob is the active storage. */
export const directUploadEnabled = () => blobEnabled() && !r2Enabled();

/**
 * Validates and stores a file. Uses Vercel Blob in production; falls back to
 * /public/uploads for local development when BLOB_READ_WRITE_TOKEN is not set.
 * Returns the created Media row.
 */
async function validateBuffer(buffer: Buffer) {
  const detected = sniff(buffer);
  if (!detected) throw new UploadError("Непідтримуваний або пошкоджений файл (дозволено: JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM)");
  const isImage = detected in IMAGE_TYPES;
  const isVideo = detected in VIDEO_TYPES;
  if (!isImage && !isVideo) throw new UploadError("Непідтримуваний тип файлу");
  if (isImage && buffer.length > MAX_IMAGE_BYTES) throw new UploadError("Зображення більше 8 МБ");
  if (isVideo && buffer.length > MAX_VIDEO_BYTES) throw new UploadError("Відео більше 50 МБ");

  let width: number | undefined;
  let height: number | undefined;
  if (isImage) {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
      if (!width || !height || width > 12000 || height > 12000) throw new Error("bad dimensions");
    } catch {
      throw new UploadError("Файл не є коректним зображенням");
    }
  }
  return { detected, isImage, width, height };
}

/** Longest side of stored photos. Images are served straight from storage, so they are sized for the web on upload. */
const WEB_IMAGE_MAX = 1600;
const WEB_IMAGE_BYTES = 400 * 1024;

/** Big or AVIF photos → WEBP up to 1600px (EXIF rotation applied); small JPG/PNG/WEBP and GIFs are kept as they are. */
async function webReady(buffer: Buffer, v: Awaited<ReturnType<typeof validateBuffer>>) {
  const large = (v.width ?? 0) > WEB_IMAGE_MAX || (v.height ?? 0) > WEB_IMAGE_MAX || buffer.length > WEB_IMAGE_BYTES;
  if (!v.isImage || v.detected === "image/gif" || (!large && v.detected !== "image/avif")) return { buffer, ...v };
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: WEB_IMAGE_MAX, height: WEB_IMAGE_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, detected: "image/webp", isImage: true, width: info.width, height: info.height };
}

export async function storeFile(input: { buffer: Buffer; filename: string; declaredType?: string; alt?: string }) {
  const { buffer, detected, isImage, width, height } = await webReady(input.buffer, await validateBuffer(input.buffer));
  const ext = IMAGE_TYPES[detected] ?? VIDEO_TYPES[detected];
  const base = path
    .basename(input.filename, path.extname(input.filename))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
  const key = `media/${base}-${crypto.randomBytes(5).toString("hex")}.${ext}`;

  let url: string;
  if (r2Enabled()) {
    url = await r2Put(key, buffer, detected);
  } else if (blobEnabled()) {
    const blob = await put(key, buffer, { access: "public", contentType: detected, addRandomSuffix: false });
    url = blob.url;
  } else {
    if (process.env.VERCEL) throw new UploadError("Не налаштовано BLOB_READ_WRITE_TOKEN");
    const dir = path.join(process.cwd(), "public", "uploads", "media");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(process.cwd(), "public", "uploads", key), buffer);
    url = `/uploads/${key}`;
  }

  return prisma.media.create({
    data: {
      url,
      pathname: key,
      filename: `${base}.${ext}`,
      mimeType: detected,
      size: buffer.length,
      width,
      height,
      alt: input.alt,
      type: isImage ? "IMAGE" : "VIDEO",
    },
  });
}

/** Downloads a remote image (e.g. from a CSV import) and stores it. SSRF-hardened. */
export async function importRemoteFile(rawUrl: string, alt?: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UploadError(`Некоректне посилання: ${rawUrl}`);
  }
  assertPublicHttpUrl(url);

  // Already stored by us (or imported before) — reuse, unless it sits in an old storage we have moved away from
  const existing = await prisma.media.findFirst({ where: { OR: [{ url: rawUrl }, { sourceUrl: rawUrl }] }, orderBy: { createdAt: "desc" } });
  if (existing && (!r2Enabled() || existing.url.startsWith(`${r2PublicBase()}/`) || existing.url.startsWith("/"))) return existing;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new UploadError(`Не вдалося завантажити (${res.status}): ${rawUrl}`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_IMAGE_BYTES) throw new UploadError("Зображення за посиланням більше 8 МБ");
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(url.pathname) || "image";
    const media = await storeFile({ buffer, filename, alt });
    return prisma.media.update({ where: { id: media.id }, data: { sourceUrl: rawUrl } });
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError(`Не вдалося завантажити ${rawUrl}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteStoredFile(url: string) {
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
    } else if (r2Enabled() && url.startsWith(`${r2PublicBase()}/`)) {
      await r2().fetch(r2ObjectUrl(decodeURIComponent(url.slice(r2PublicBase().length + 1))), { method: "DELETE" });
    } else if (blobEnabled() && url.includes(".blob.vercel-storage.com")) {
      await del(url);
    }
  } catch (e) {
    console.warn("deleteStoredFile", e);
  }
}

/**
 * Registers a file that the browser uploaded directly to Vercel Blob (client upload,
 * bypasses the 4.5 MB function body limit). The blob is re-downloaded and validated;
 * invalid files are deleted.
 */
export async function registerBlobUpload(url: string, filename: string) {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) throw new UploadError("Невідоме сховище");
  const existing = await prisma.media.findUnique({ where: { url } });
  if (existing) return existing;
  const res = await fetch(url);
  if (!res.ok) throw new UploadError("Завантажений файл не знайдено");
  const buffer = Buffer.from(await res.arrayBuffer());
  try {
    const { detected, isImage, width, height } = await validateBuffer(buffer);
    return await prisma.media.create({
      data: {
        url,
        pathname: parsed.pathname.slice(1),
        filename: path.basename(filename).slice(0, 120),
        mimeType: detected,
        size: buffer.length,
        width,
        height,
        type: isImage ? "IMAGE" : "VIDEO",
      },
    });
  } catch (e) {
    await del(url).catch(() => {});
    throw e;
  }
}
