import "server-only";
import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
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

/**
 * Validates and stores a file. Uses Vercel Blob in production; falls back to
 * /public/uploads for local development when BLOB_READ_WRITE_TOKEN is not set.
 * Returns the created Media row.
 */
async function validateBuffer(buffer: Buffer) {
  const detected = sniff(buffer);
  if (!detected) throw new UploadError("Unsupported or corrupted file (allowed: JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM)");
  const isImage = detected in IMAGE_TYPES;
  const isVideo = detected in VIDEO_TYPES;
  if (!isImage && !isVideo) throw new UploadError("Unsupported file type");
  if (isImage && buffer.length > MAX_IMAGE_BYTES) throw new UploadError("Image is larger than 8 MB");
  if (isVideo && buffer.length > MAX_VIDEO_BYTES) throw new UploadError("Video is larger than 50 MB");

  let width: number | undefined;
  let height: number | undefined;
  if (isImage) {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
      if (!width || !height || width > 12000 || height > 12000) throw new Error("bad dimensions");
    } catch {
      throw new UploadError("File is not a valid image");
    }
  }
  return { detected, isImage, width, height };
}

export async function storeFile(input: { buffer: Buffer; filename: string; declaredType?: string; alt?: string }) {
  const { buffer } = input;
  const { detected, isImage, width, height } = await validateBuffer(buffer);
  const ext = IMAGE_TYPES[detected] ?? VIDEO_TYPES[detected];
  const base = path
    .basename(input.filename, path.extname(input.filename))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
  const key = `media/${base}-${crypto.randomBytes(5).toString("hex")}.${ext}`;

  let url: string;
  if (blobEnabled()) {
    const blob = await put(key, buffer, { access: "public", contentType: detected, addRandomSuffix: false });
    url = blob.url;
  } else {
    if (process.env.VERCEL) throw new UploadError("BLOB_READ_WRITE_TOKEN is not configured");
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
    throw new UploadError(`Invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UploadError("Only http(s) URLs are allowed");
  const host = url.hostname;
  if (
    host === "localhost" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.endsWith(".internal") ||
    host === "[::1]"
  ) {
    throw new UploadError("Private network URLs are not allowed");
  }

  // Already stored by us (or imported before) — reuse
  const existing = await prisma.media.findFirst({ where: { OR: [{ url: rawUrl }, { sourceUrl: rawUrl }] } });
  if (existing) return existing;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new UploadError(`Download failed (${res.status}) for ${rawUrl}`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MAX_IMAGE_BYTES) throw new UploadError("Remote image is larger than 8 MB");
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(url.pathname) || "image";
    const media = await storeFile({ buffer, filename, alt });
    return prisma.media.update({ where: { id: media.id }, data: { sourceUrl: rawUrl } });
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError(`Could not download ${rawUrl}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteStoredFile(url: string) {
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
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
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) throw new UploadError("Unknown storage host");
  const existing = await prisma.media.findUnique({ where: { url } });
  if (existing) return existing;
  const res = await fetch(url);
  if (!res.ok) throw new UploadError("Uploaded file not found");
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
