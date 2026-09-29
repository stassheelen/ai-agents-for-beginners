import "server-only";
import { getNavigation } from "@/lib/queries";
import type { Pill } from "@/components/store/category-pills";

/** The main catalog pill row. `active` is "all", a flag ("new" | "bestseller" | "sale") or a top-level category slug. */
export async function catalogPills(active: string | null): Promise<Pill[]> {
  const nav = await getNavigation();
  const pills = [
    { key: "all", name: "Усі", href: "/shop" },
    { key: "new", name: "Новинки", href: "/shop?flag=new" },
    { key: "bestseller", name: "Бестселери", href: "/shop?flag=bestseller" },
    ...nav.categories.map((c) => ({ key: c.slug, name: c.name, href: `/shop/${c.slug}` })),
    { key: "sale", name: "Розпродаж", href: "/shop?flag=sale" },
  ];
  return pills.map(({ key, ...p }) => ({ ...p, active: key === active }));
}
