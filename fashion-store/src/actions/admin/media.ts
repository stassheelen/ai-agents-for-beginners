"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { actionError, requireAdmin, type ActionResult } from "@/lib/admin";
import { deleteStoredFile, importRemoteFile, registerBlobUpload } from "@/lib/storage";

export type MediaItem = { id: string; url: string; filename: string; mimeType: string; size: number; width: number | null; height: number | null; type: "IMAGE" | "VIDEO"; alt: string | null; createdAt: string };

function toItem(m: { id: string; url: string; filename: string; mimeType: string; size: number; width: number | null; height: number | null; type: "IMAGE" | "VIDEO"; alt: string | null; createdAt: Date }): MediaItem {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

export async function listMedia(input: { q?: string; type?: "IMAGE" | "VIDEO" | "ALL"; cursor?: string; take?: number }) {
  await requireAdmin();
  const take = Math.min(input.take ?? 48, 96);
  const rows = await prisma.media.findMany({
    where: {
      ...(input.q ? { OR: [{ filename: { contains: input.q, mode: "insensitive" } }, { alt: { contains: input.q, mode: "insensitive" } }] } : {}),
      ...(input.type && input.type !== "ALL" ? { type: input.type } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  return { items: rows.slice(0, take).map(toItem), nextCursor: rows.length > take ? rows[take - 1].id : null };
}

export async function registerUploadedBlob(url: string, filename: string): Promise<ActionResult<MediaItem>> {
  try {
    await requireAdmin();
    const m = await registerBlobUpload(url, filename);
    return { ok: true, data: toItem(m) };
  } catch (e) {
    return actionError(e);
  }
}

export async function importMediaFromUrl(url: string): Promise<ActionResult<MediaItem>> {
  try {
    await requireAdmin();
    const m = await importRemoteFile(z.string().url().parse(url));
    return { ok: true, data: toItem(m) };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.media.update({ where: { id }, data: { alt: alt.slice(0, 200) } });
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteMedia(ids: string[]): Promise<ActionResult<{ inUse: number }>> {
  try {
    await requireAdmin();
    const rows = await prisma.media.findMany({ where: { id: { in: ids } } });
    let inUse = 0;
    for (const m of rows) {
      const used =
        (await prisma.productImage.count({ where: { url: m.url } })) +
        (await prisma.homepageSection.count({ where: { OR: [{ image: m.url }, { mobileImage: m.url }, { videoUrl: m.url }] } })) +
        (await prisma.banner.count({ where: { OR: [{ image: m.url }, { mobileImage: m.url }] } })) +
        (await prisma.category.count({ where: { image: m.url } })) +
        (await prisma.collection.count({ where: { heroImage: m.url } }));
      if (used > 0) {
        inUse++;
        continue;
      }
      await prisma.media.delete({ where: { id: m.id } });
      if (!m.url.startsWith("/demo/")) await deleteStoredFile(m.url);
    }
    return { ok: true, data: { inUse }, message: inUse ? `${inUse} file(s) are in use and were kept` : undefined };
  } catch (e) {
    return actionError(e);
  }
}
