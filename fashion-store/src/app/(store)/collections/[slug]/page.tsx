import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, listingSeoDescription, pageSuffix, withoutStoreSuffix } from "@/lib/seo";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/catalog-view";
import { parseCatalogParams } from "@/lib/catalog-params";
import { getCollectionBySlug } from "@/lib/queries";

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const col = await getCollectionBySlug(slug);
  if (!col) return { title: "Не знайдено" };
  return {
    title: withoutStoreSuffix(col.seoTitle ?? col.name),
    description: listingSeoDescription(col.name, col.seoDescription ?? col.description),
    openGraph: {
      title: withoutStoreSuffix(col.seoTitle ?? col.name),
      description: listingSeoDescription(col.name, col.seoDescription ?? col.description),
      images: [col.heroImage ?? DEFAULT_OG_IMAGE],
    },
    alternates: { canonical: `/collections/${slug}${pageSuffix(sp)}` },
  };
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const col = await getCollectionBySlug(slug);
  if (!col) notFound();
  return (
    <CatalogView
      title={col.name}
      description={col.description}
      heroImage={col.heroImage}
      breadcrumbs={[
        { name: "Головна", href: "/" },
        { name: "Колекції", href: "/collections" },
        { name: col.name, href: `/collections/${col.slug}` },
      ]}
      scope={{ collection: col.slug }}
      params={parseCatalogParams(sp)}
    />
  );
}
