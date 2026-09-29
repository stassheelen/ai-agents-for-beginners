import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { FLAG_TITLES, parseCatalogParams } from "@/lib/catalog-params";
import { getNavigation } from "@/lib/queries";

export async function generateMetadata(props: PageProps<"/shop">): Promise<Metadata> {
  const sp = await props.searchParams;
  const flag = typeof sp.flag === "string" ? FLAG_TITLES[sp.flag] : undefined;
  return {
    title: flag ?? "Усі товари",
    description: "Каталог VELLA: activewear, худі, світшоти, легінси та аксесуари.",
    alternates: { canonical: flag ? `/shop?flag=${sp.flag}` : "/shop" },
  };
}

export default async function ShopPage(props: PageProps<"/shop">) {
  const sp = await props.searchParams;
  const params = parseCatalogParams(sp);
  const nav = await getNavigation();
  const title = params.flag ? FLAG_TITLES[params.flag] : "Усі товари";
  return (
    <CatalogView
      title={title}
      breadcrumbs={[
        { name: "Головна", href: "/" },
        { name: "Shop", href: "/shop" },
        ...(params.flag ? [{ name: title, href: `/shop?flag=${params.flag}` }] : []),
      ]}
      scope={{ flag: params.flag }}
      params={params}
      subnav={[
        { name: "Усі", href: "/shop", active: !params.flag },
        { name: "New", href: "/shop?flag=new", active: params.flag === "new" },
        { name: "Best sellers", href: "/shop?flag=bestseller", active: params.flag === "bestseller" },
        ...nav.categories.map((c) => ({ name: c.name, href: `/shop/${c.slug}` })),
        { name: "Sale", href: "/shop?flag=sale", active: params.flag === "sale" },
      ]}
    />
  );
}
