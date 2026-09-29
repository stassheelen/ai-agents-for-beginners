import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/catalog-view";
import { parseCatalogParams } from "@/lib/catalog-params";
import { getCategoryBySlug } from "@/lib/queries";
import { catalogPills } from "@/lib/catalog-nav";

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
  // Subcategory links: this category's children, or its siblings when it is itself a subcategory.
  const parent = cat.parent ? await getCategoryBySlug(cat.parent.slug) : null;
  const family = parent ?? cat;
  const pills = await catalogPills(family.slug);
  const crumbs = [{ name: "Головна", href: "/" }, { name: "Каталог", href: "/shop" }];
  if (cat.parent) crumbs.push({ name: cat.parent.name, href: `/shop/${cat.parent.slug}` });
  crumbs.push({ name: cat.name, href: `/shop/${cat.slug}` });
  return (
    <CatalogView
      title={cat.name}
      description={cat.description}
      breadcrumbs={crumbs}
      scope={{ category: cat.slug }}
      params={{ ...params, categories: cat.children.length ? params.categories : [] }}
      pills={pills}
      subnav={
        family.children.length
          ? [
              { name: "Усі", href: `/shop/${family.slug}`, active: family.slug === cat.slug },
              ...family.children.map((c) => ({ name: c.name, href: `/shop/${c.slug}`, active: c.slug === cat.slug })),
            ]
          : undefined
      }
    />
  );
}
