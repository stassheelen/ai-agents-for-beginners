import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } }),
    prisma.category.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : siteUrl(u));
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/collections"), changeFrequency: "weekly", priority: 0.6 },
    ...["delivery", "returns", "size-guide"].map((s) => ({ url: siteUrl(`/help/${s}`), changeFrequency: "monthly" as const, priority: 0.3 })),
    ...categories.map((c) => ({ url: siteUrl(`/shop/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...collections.map((c) => ({ url: siteUrl(`/collections/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: siteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, images: p.images.map((i) => abs(i.url)) })),
  ];
}
