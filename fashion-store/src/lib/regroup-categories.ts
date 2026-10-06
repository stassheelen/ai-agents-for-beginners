import "server-only";
import { prisma } from "@/lib/db";
import { CATEGORY_GROUPS, classifyProduct } from "@/lib/category-groups";
import { slugify } from "@/lib/utils";

type Plan = {
  productCount: number;
  categoriesBefore: number;
  groups: { name: string; products: number; types: { name: string; products: number }[] }[];
  assignments: { productId: string; group: string; type: string | null }[];
};

/** Works out where every product goes in the fixed structure (see CATEGORY_GROUPS). */
export async function planRegroup(): Promise<Plan> {
  const [products, categoriesBefore] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, category: { select: { name: true } }, subcategory: { select: { name: true } } } }),
    prisma.category.count(),
  ]);
  const assignments = products.map((p) => {
    const { group, type } = classifyProduct(p.name, [p.subcategory?.name, p.category?.name]);
    return { productId: p.id, group, type };
  });
  const groups = CATEGORY_GROUPS.map((name) => {
    const inGroup = assignments.filter((a) => a.group === name);
    const types = [...new Set(inGroup.map((a) => a.type).filter((t): t is string => Boolean(t)))].map((t) => ({ name: t, products: inGroup.filter((a) => a.type === t).length }));
    return { name, products: inGroup.length, types: types.sort((a, b) => b.products - a.products) };
  }).filter((g) => g.products > 0);
  return { productCount: products.length, categoriesBefore, groups, assignments };
}

export type RegroupSummary = Omit<Plan, "assignments">;

export async function regroupPreview(): Promise<RegroupSummary> {
  const { productCount, categoriesBefore, groups } = await planRegroup();
  return { productCount, categoriesBefore, groups };
}

/**
 * Moves every product into the fixed structure, then deletes the categories left empty.
 * Top-level groups are shown in the header menu in CATEGORY_GROUPS order.
 */
export async function regroupCategories(): Promise<RegroupSummary> {
  const { assignments, ...summary } = await planRegroup();
  await prisma.$transaction(
    async (tx) => {
      const usedSlugs = new Set((await tx.category.findMany({ select: { slug: true } })).map((c) => c.slug));
      const uniqueSlug = (name: string) => {
        const base = slugify(name) || "category";
        let s = base;
        for (let i = 2; usedSlugs.has(s); i++) s = `${base}-${i}`;
        usedSlugs.add(s);
        return s;
      };
      const ensure = async (name: string, parentId: string | null, position: number, showInNav: boolean) => {
        const found = await tx.category.findFirst({ where: { parentId, name: { equals: name, mode: "insensitive" } }, select: { id: true } });
        if (found) {
          await tx.category.update({ where: { id: found.id }, data: { position, showInNav, published: true } });
          return found.id;
        }
        return (await tx.category.create({ data: { name, slug: uniqueSlug(name), parentId, position, showInNav, published: true } })).id;
      };

      const keep = new Set<string>();
      const target = new Map<string, { categoryId: string; subcategoryId: string | null; productIds: string[] }>();
      for (const g of summary.groups) {
        const groupId = await ensure(g.name, null, CATEGORY_GROUPS.indexOf(g.name as (typeof CATEGORY_GROUPS)[number]), true);
        keep.add(groupId);
        target.set(`${g.name}|`, { categoryId: groupId, subcategoryId: null, productIds: [] });
        for (const [i, t] of g.types.entries()) {
          const typeId = await ensure(t.name, groupId, i, false);
          keep.add(typeId);
          target.set(`${g.name}|${t.name}`, { categoryId: groupId, subcategoryId: typeId, productIds: [] });
        }
      }
      for (const a of assignments) target.get(`${a.group}|${a.type ?? ""}`)!.productIds.push(a.productId);

      const allIds = assignments.map((a) => a.productId);
      await tx.productCategory.deleteMany({ where: { productId: { in: allIds } } });
      for (const t of target.values()) {
        if (!t.productIds.length) continue;
        await tx.product.updateMany({ where: { id: { in: t.productIds } }, data: { categoryId: t.categoryId, subcategoryId: t.subcategoryId } });
        const links = t.productIds.flatMap((productId) => [t.categoryId, t.subcategoryId].filter((c): c is string => Boolean(c)).map((categoryId) => ({ productId, categoryId })));
        await tx.productCategory.createMany({ data: links, skipDuplicates: true });
      }

      // Old categories: nothing points at them any more.
      const unused = { id: { notIn: [...keep] }, products: { none: {} }, primaryFor: { none: {} }, subFor: { none: {} } };
      await tx.category.updateMany({ where: { id: { notIn: [...keep] } }, data: { parentId: null, showInNav: false } });
      await tx.category.deleteMany({ where: unused });

      // Homepage category grid pointing at removed categories → show the new ones.
      for (const s of await tx.homepageSection.findMany({ where: { type: "CATEGORY_GRID" }, select: { id: true, config: true } })) {
        const slugs = (s.config as { slugs?: string[] } | null)?.slugs;
        if (slugs?.length && (await tx.category.count({ where: { slug: { in: slugs } } })) < slugs.length) {
          await tx.homepageSection.update({ where: { id: s.id }, data: { config: {} } });
        }
      }
    },
    { timeout: 120000, maxWait: 30000 },
  );
  return summary;
}
