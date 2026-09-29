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
    title: "Кольори",
    links: nav.colors.map((c) => ({ label: c.name, href: `${base}${base.includes("?") ? "&" : "?"}color=${c.slug}`, swatch: c.hex })),
  });
  const clothing = nav.categories.find((c) => c.slug === "clothing");

  const items: NavItem[] = [
    {
      label: "Новинки",
      href: "/shop?flag=new",
      columns: [
        {
          title: "Новинки",
          links: [
            { label: "Нові надходження", href: "/shop?flag=new" },
            { label: "У тренді", href: "/shop?flag=featured" },
            { label: "Нові колекції", href: "/collections" },
          ],
        },
        { title: "Колекції", links: nav.collections.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })) },
      ],
      promos,
    },
    {
      label: "Магазин",
      href: "/shop",
      columns: [
        {
          title: "Магазин",
          links: [
            { label: "Усі товари", href: "/shop" },
            { label: "Бестселери", href: "/shop?flag=bestseller" },
            { label: "Комплекти", href: "/shop/sets" },
            { label: "Розпродаж", href: "/shop?flag=sale" },
          ],
        },
        ...(clothing ? [{ title: clothing.name, links: clothing.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` })) }] : []),
        colorCol("/shop"),
      ],
      promos: promos.slice(0, 1),
    },
    ...nav.categories.map<NavItem>((cat) => ({
      label: cat.name,
      href: `/shop/${cat.slug}`,
      columns: [
        { title: cat.name, links: [{ label: "Переглянути все", href: `/shop/${cat.slug}` }, ...cat.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` }))] },
        colorCol(`/shop/${cat.slug}`),
      ],
      promos: promos.slice(0, 1),
    })),
    { label: "Розпродаж", href: "/shop?flag=sale", columns: [], promos: [], highlight: true },
  ];
  return { items, announcements: nav.announcements };
}
