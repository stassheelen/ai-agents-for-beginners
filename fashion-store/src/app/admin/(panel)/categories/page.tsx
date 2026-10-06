import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { RegroupCategoriesButton } from "@/components/admin/regroup-categories-button";
import { regroupPreview } from "@/lib/regroup-categories";

export const metadata = { title: "Категорії" };

export default async function CategoriesPage() {
  const [cats, regroup] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
    regroupPreview(),
  ]);
  return (
    <>
      <PageHeader
        title="Категорії"
        description="Вкладені категорії. Категорії верхнього рівня з позначкою «Показувати в меню» зʼявляються в мега-меню шапки."
        actions={<RegroupCategoriesButton summary={regroup} />}
      />
      <CategoriesManager
        categories={cats.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId,
          description: c.description ?? "",
          image: c.image,
          seoTitle: c.seoTitle ?? "",
          seoDescription: c.seoDescription ?? "",
          published: c.published,
          showInNav: c.showInNav,
          products: c._count.products,
        }))}
      />
    </>
  );
}
