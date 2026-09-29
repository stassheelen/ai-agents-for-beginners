import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const metadata = { title: "Категорії" };

export default async function CategoriesPage() {
  const cats = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      <PageHeader title="Категорії" description="Вкладені категорії. Категорії верхнього рівня з позначкою «Показувати в меню» зʼявляються в мега-меню шапки." />
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
