import "server-only";
import { getNavigation } from "@/lib/queries";
import { swatchBackground } from "@/lib/color-names";

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
      ...uniqueColors.slice(0, MAX_COLORS).map((c) => ({ label: c.name, href: `${base}${base.includes("?") ? "&" : "?"}color=${c.slug}`, swatch: swatchBackground(c.name, c.hex) })),
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
            ...(nav.flags.new ? [{ label: "Нові надходження", href: "/shop?flag=new" }] : []),
            ...(nav.flags.featured ? [{ label: "У тренді", href: "/shop?flag=featured" }] : []),
            ...(nav.collections.length ? [{ label: "Нові колекції", href: "/collections" }] : []),
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
            ...(nav.flags.bestseller ? [{ label: "Бестселери", href: "/shop?flag=bestseller" }] : []),
            ...(nav.flags.sale ? [{ label: "Розпродаж", href: "/shop?flag=sale" }] : []),
          ],
        },
        ...nav.categories.map<NavColumn>((cat) => ({
          title: cat.name,
          links: [{ label: "Переглянути все", href: `/shop/${cat.slug}` }, ...cat.children.map((c) => ({ label: c.name, href: `/shop/${c.slug}` }))],
        })),
      ],
      promos: promos.slice(0, 1),
    },
    // Links to flag listings are left out while nothing carries that flag ("Нічого не знайдено" otherwise).
    ...(nav.flags.sale ? [{ label: "Розпродаж", href: "/shop?flag=sale", columns: [], promos: [], highlight: true }] : []),
  ];
  // A column whose links were all hidden would show a lone heading.
  for (const item of items) item.columns = item.columns.filter((col) => col.links.length > 0);
  return { items, announcements: nav.announcements };
}
