import "server-only";
import { getNavigation } from "@/lib/queries";

export type NavLink = { label: string; href: string; swatch?: string };
export type NavColumn = { title: string; links: NavLink[] };
export type NavPromo = { id: string; title: string; subtitle: string | null; image: string | null; link: string | null; buttonLabel: string | null };
export type NavItem = { label: string; href: string; columns: NavColumn[]; promos: NavPromo[]; highlight?: boolean };

export async function buildNav(): Promise<{ items: NavItem[]; announcements: { id: string; title: string; link: string | null }[] }> {
  const nav = await getNavigation();
  const promos = nav.megaBanners.slice(0, 2);
  // Keep the menu compact: one entry per colour name, first few only, then a link to the full catalog filter.
  const MAX_COLORS = 8;
  const uniqueColors = nav.colors.filter((c, i, all) => all.findIndex((o) => o.name.trim().toLowerCase() === c.name.trim().toLowerCase()) === i);
  const colorCol = (base: string): NavColumn => ({
    title: "Кольори",
    links: [
      ...uniqueColors.slice(0, MAX_COLORS).map((c) => ({ label: c.name, href: `${base}${base.includes("?") ? "&" : "?"}color=${c.slug}`, swatch: c.hex })),
      ...(uniqueColors.length > MAX_COLORS ? [{ label: "Усі кольори →", href: base }] : []),
    ],
  });
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
        ...(nav.collections.length ? [{ title: "Колекції", links: nav.collections.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })) }] : []),
        colorCol("/shop?flag=new"),
      ],
      promos,
    },
    {
      // All main categories live here, each with its product types, so the header stays three items wide.
      label: "Магазин",
      href: "/shop",
      columns: [
        {
          title: "Магазин",
          links: [
            { label: "Усі товари", href: "/shop" },
            { label: "Бестселери", href: "/shop?flag=bestseller" },
            { label: "Розпродаж", href: "/shop?flag=sale" },
          ],
        },
        ...nav.categories.map<NavColumn>((cat) => ({
          title: cat.name,
          links: [{ label: "Переглянути все", href: `/shop/${cat.slug}` }, ...cat.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` }))],
        })),
      ],
      promos: promos.slice(0, 1),
    },
    { label: "Розпродаж", href: "/shop?flag=sale", columns: [], promos: [], highlight: true },
  ];
  return { items, announcements: nav.announcements };
}
