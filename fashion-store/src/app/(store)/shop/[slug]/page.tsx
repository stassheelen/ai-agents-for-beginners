import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/catalog-view";
import { parseCatalogParams } from "@/lib/catalog-params";
import { getCategoryBySlug } from "@/lib/queries";

export async function generateMetadata(props: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Не знайдено" };
  return {
    title: cat.seoTitle ?? cat.name,
    description: cat.seoDescription ?? cat.description ?? undefined,
    openGraph: { title: cat.seoTitle ?? cat.name, description: cat.seoDescription ?? cat.description ?? undefined, images: cat.image ? [cat.image] : undefined },
    alternates: { canonical: `/shop/${slug}` },
  };
}

export default async function CategoryPage(props: PageProps<"/shop/[slug]">) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const params = parseCatalogParams(sp);
  const crumbs = [{ name: "Головна", href: "/" }, { name: "Shop", href: "/shop" }];
  if (cat.parent) crumbs.push({ name: cat.parent.name, href: `/shop/${cat.parent.slug}` });
  crumbs.push({ name: cat.name, href: `/shop/${cat.slug}` });
  return (
    <CatalogView
      title={cat.name}
      description={cat.description}
      breadcrumbs={crumbs}
      scope={{ category: cat.slug }}
      params={{ ...params, categories: cat.children.length ? params.categories : [] }}
      subnav={cat.children.length ? [{ name: "Усі", href: `/shop/${cat.slug}`, active: true }, ...cat.children.map((c) => ({ name: c.name, href: `/shop/${c.slug}` }))] : undefined}
    />
  );
}
