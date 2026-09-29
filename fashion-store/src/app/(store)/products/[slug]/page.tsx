import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, getSettings } from "@/lib/queries";
import { ProductDetailView } from "@/components/store/product-detail";
import { Breadcrumbs } from "@/components/store/catalog-view";
import { ProductRail } from "@/components/store/product-rail";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { ReviewForm } from "@/components/store/review-form";
import { ProductJsonLd } from "@/components/store/json-ld";
import { Stars } from "@/components/store/price";
import { formatDate, sortSizes } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Товар не знайдено" };
  const image = p.ogImage ?? p.images[0]?.url;
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.shortDescription ?? undefined,
    openGraph: { title: p.seoTitle ?? p.name, description: p.seoDescription ?? p.shortDescription ?? undefined, images: image ? [image] : undefined },
    alternates: { canonical: `/products/${p.slug}` },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([getSettings(), getRelatedProducts(product.id, product.categoryId)]);
  const crumbs = [{ name: "Головна", href: "/" }, { name: "Shop", href: "/shop" }];
  if (product.category) crumbs.push({ name: product.category.name, href: `/shop/${product.category.slug}` });
  if (product.subcategory) crumbs.push({ name: product.subcategory.name, href: `/shop/${product.subcategory.slug}` });
  crumbs.push({ name: product.name, href: `/products/${product.slug}` });
  const sizes = sortSizes([...new Set(product.variants.map((v) => v.size).filter((s): s is string => Boolean(s)))]);

  return (
    <div className="pb-24 lg:pb-0">
      <ProductJsonLd
        name={product.name}
        description={product.shortDescription ?? product.description}
        images={product.images.map((i) => i.url)}
        sku={product.sku}
        brand={product.brand}
        price={product.price}
        currency={product.currency}
        inStock={product.variants.some((v) => v.stock > 0)}
        rating={product.rating}
        reviewCount={product.reviewCount}
        slug={product.slug}
      />
      <div className="container-page hidden py-5 lg:block">
        <Breadcrumbs items={crumbs} />
      </div>
      <ProductDetailView product={product} sizeGuide={settings.sizeGuide} deliveryInfo={settings.deliveryInfo} returnsInfo={settings.returnsInfo} />

      <section id="reviews" className="container-page scroll-mt-24 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr] lg:gap-20">
          <div>
            <h2 className="font-display text-2xl font-medium lg:text-[32px]">Відгуки</h2>
            {product.reviewCount > 0 ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="font-display text-5xl">{product.rating.toFixed(1)}</span>
                <div>
                  <Stars rating={product.rating} size={14} />
                  <p className="mt-1 text-xs text-muted-foreground">{product.reviewCount} відгуків</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Поки що немає відгуків. Будьте першими!</p>
            )}
            <div className="mt-6">
              <ReviewForm productId={product.id} sizes={sizes} />
            </div>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mt-3 text-sm font-medium">{r.title}</p>}
                <p className="mt-2 text-sm leading-relaxed">{r.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {r.name}
                  {r.size && ` · розмір ${r.size}`}
                </p>
              </li>
            ))}
            {product.reviews.length === 0 && <li className="py-10 text-sm text-muted-foreground">Відгуки з&apos;являться тут після модерації.</li>}
          </ul>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-page py-12 lg:py-16">
          <h2 className="mb-6 font-display text-2xl font-medium lg:mb-8 lg:text-[32px]">Вам також може сподобатися</h2>
          <ProductRail products={related} />
        </section>
      )}
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
