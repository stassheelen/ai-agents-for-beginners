import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { FLAG_TITLES, parseCatalogParams } from "@/lib/catalog-params";
import { catalogPills } from "@/lib/catalog-nav";

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
  const pills = await catalogPills(params.flag === "featured" ? null : params.flag ?? "all");
  const title = params.flag ? FLAG_TITLES[params.flag] : "Усі товари";
  return (
    <CatalogView
      title={title}
      breadcrumbs={[
        { name: "Головна", href: "/" },
        { name: "Каталог", href: "/shop" },
        ...(params.flag ? [{ name: title, href: `/shop?flag=${params.flag}` }] : []),
      ]}
      scope={{ flag: params.flag }}
      params={params}
      pills={pills}
    />
  );
}
