import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { CollectionsManager } from "@/components/admin/collections-manager";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const cols = await prisma.collection.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      products: { orderBy: { position: "asc" }, select: { product: { select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } } },
    },
  });
  return (
    <>
      <PageHeader title="Collections" description="Curated product groups with their own landing page at /collections/[slug]." />
      <CollectionsManager
        collections={cols.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          heroImage: c.heroImage,
          seoTitle: c.seoTitle ?? "",
          seoDescription: c.seoDescription ?? "",
          published: c.published,
          products: c.products.map((p) => ({ id: p.product.id, name: p.product.name, sku: p.product.sku, image: p.product.images[0]?.url ?? null })),
        }))}
      />
    </>
  );
}
