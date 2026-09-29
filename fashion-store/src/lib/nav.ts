import "server-only";
import { getNavigation } from "@/lib/queries";

export type NavLink = { label: string; href: string; swatch?: string };
export type NavColumn = { title: string; links: NavLink[] };
export type NavPromo = { id: string; title: string; subtitle: string | null; image: string | null; link: string | null; buttonLabel: string | null };
export type NavItem = { label: string; href: string; columns: NavColumn[]; promos: NavPromo[]; highlight?: boolean };

export async function buildNav(): Promise<{ items: NavItem[]; announcements: { id: string; title: string; link: string | null }[] }> {
  const nav = await getNavigation();
  const promos = nav.megaBanners.slice(0, 2);
  const colorCol = (base: string): NavColumn => ({
    title: "Shop by color",
    links: nav.colors.map((c) => ({ label: c.name, href: `${base}${base.includes("?") ? "&" : "?"}color=${c.slug}`, swatch: c.hex })),
  });
  const clothing = nav.categories.find((c) => c.slug === "clothing");

  const items: NavItem[] = [
    {
      label: "New",
      href: "/shop?flag=new",
      columns: [
        {
          title: "New",
          links: [
            { label: "New arrivals", href: "/shop?flag=new" },
            { label: "Trending", href: "/shop?flag=featured" },
            { label: "New collections", href: "/collections" },
          ],
        },
        { title: "Collections", links: nav.collections.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })) },
      ],
      promos,
    },
    {
      label: "Shop",
      href: "/shop",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "All products", href: "/shop" },
            { label: "Best sellers", href: "/shop?flag=bestseller" },
            { label: "Sets", href: "/shop/sets" },
            { label: "Sale", href: "/shop?flag=sale" },
          ],
        },
        ...(clothing ? [{ title: "Clothing", links: clothing.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` })) }] : []),
        colorCol("/shop"),
      ],
      promos: promos.slice(0, 1),
    },
    ...nav.categories.map<NavItem>((cat) => ({
      label: cat.name,
      href: `/shop/${cat.slug}`,
      columns: [
        { title: cat.name, links: [{ label: `All ${cat.name.toLowerCase()}`, href: `/shop/${cat.slug}` }, ...cat.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` }))] },
        colorCol(`/shop/${cat.slug}`),
      ],
      promos: promos.slice(0, 1),
    })),
    { label: "Sale", href: "/shop?flag=sale", columns: [], promos: [], highlight: true },
  ];
  return { items, announcements: nav.announcements };
}
