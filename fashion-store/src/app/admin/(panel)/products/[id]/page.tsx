import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm, type ProductFormData } from "@/components/admin/product-form";
import { productFormOptions } from "@/lib/admin-data";

export const metadata = { title: "Редагування товару" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const [p, opts] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" }, include: { color: true } },
        collections: { orderBy: { position: "asc" } },
      },
    }),
    productFormOptions(),
  ]);
  if (!p) notFound();
  const initial: ProductFormData = {
    id: p.id,
    name: p.name,
    sku: p.sku,
    slug: p.slug,
    description: p.description ?? "",
    shortDescription: p.shortDescription ?? "",
    brand: p.brand ?? "",
    categoryId: p.categoryId ?? "",
    subcategoryId: p.subcategoryId ?? "",
    collectionIds: p.collections.map((c) => c.collectionId),
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    costPrice: p.costPrice,
    currency: p.currency,
    status: p.status,
    featured: p.featured,
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    onSale: p.onSale,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    ogImage: p.ogImage ?? "",
    tags: p.tags,
    details: p.details ?? "",
    material: p.material ?? "",
    careInstructions: p.careInstructions ?? "",
    shippingInfo: p.shippingInfo ?? "",
    returnInfo: p.returnInfo ?? "",
    images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "", colorName: i.colorName ?? "" })),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, color: v.color?.name ?? "", colorHex: v.color?.hex ?? "#888888", size: v.size ?? "", stock: v.stock, price: v.price })),
  };
  return <ProductForm key={p.updatedAt.toISOString()} initial={initial} {...opts} />;
}
