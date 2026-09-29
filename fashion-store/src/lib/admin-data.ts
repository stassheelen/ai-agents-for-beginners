import "server-only";
import { prisma } from "@/lib/db";

export async function productFormOptions() {
  const [categories, collections, colors] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }], select: { id: true, name: true, parentId: true } }),
    prisma.collection.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    prisma.color.findMany({ orderBy: { position: "asc" }, select: { name: true, hex: true } }),
  ]);
  return { categories, collections, colors };
}
