import { siteUrl } from "@/lib/utils";

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function OrganizationJsonLd({ name, email, phone, instagram }: { name: string; email?: string | null; phone?: string | null; instagram?: string | null }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url: siteUrl("/"),
        logo: siteUrl("/icon.svg"),
        ...(email ? { email } : {}),
        ...(phone ? { telephone: phone } : {}),
        ...(instagram ? { sameAs: [instagram] } : {}),
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.href) })),
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  images,
  sku,
  brand,
  price,
  currency,
  inStock,
  rating,
  reviewCount,
  slug,
}: {
  name: string;
  description?: string | null;
  images: string[];
  sku: string;
  brand?: string | null;
  price: number;
  currency: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  slug: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description: description ?? undefined,
        image: images.map((i) => (i.startsWith("http") ? i : siteUrl(i))),
        sku,
        brand: brand ? { "@type": "Brand", name: brand } : undefined,
        offers: {
          "@type": "Offer",
          url: siteUrl(`/products/${slug}`),
          priceCurrency: currency,
          price: (price / 100).toFixed(2),
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
        ...(reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount } } : {}),
      }}
    />
  );
}
