import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FileSpreadsheet, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";
import { AdminFilters } from "@/components/admin/filters";
import { DeleteBrokenPhotoProducts, DeleteEmptyProducts, RoundPricesButton } from "@/components/admin/delete-empty-products";
import { countUnroundedPrices } from "@/lib/round-prices";
import { DeleteDemoContent } from "@/components/admin/delete-demo-content";
import { countDemoContent } from "@/lib/demo-content";

export const metadata = { title: "Товари" };
/** Photos in the old Vercel Blob store (suspended) no longer load. */
const BROKEN_PHOTO: Prisma.ProductWhereInput = { images: { some: { url: { contains: ".blob.vercel-storage.com" } } } };
const PER_PAGE = 25;

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const stock = typeof sp.stock === "string" ? sp.stock : "";
  const content = typeof sp.content === "string" ? sp.content : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "created-desc";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? { status: status as "DRAFT" } : {}),
    ...(category ? { categories: { some: { categoryId: category } } } : {}),
    ...(content === "no-photo"
      ? { images: { none: {} } }
      : content === "no-variants"
        ? { variants: { none: {} } }
        : content === "broken-photo"
          ? BROKEN_PHOTO
          : {}),
    ...(stock === "out" ? { variants: { every: { stock: { lte: 0 } } } } : stock === "low" ? { variants: { some: { stock: { gt: 0, lte: 5 } } } } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "name" ? { name: "asc" } : sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : sort === "created-asc" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [total, rows, categories, emptyCount, demo, brokenCount, unrounded] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        price: true,
        currency: true,
        status: true,
        createdAt: true,
        featured: true,
        isNew: true,
        bestSeller: true,
        onSale: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        variants: { select: { stock: true } },
      },
    }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { position: "asc" }], select: { id: true, name: true, parent: { select: { name: true } } } }),
    prisma.product.count({ where: { OR: [{ images: { none: {} } }, { variants: { none: {} } }] } }),
    countDemoContent(),
    prisma.product.count({ where: BROKEN_PHOTO }),
    countUnroundedPrices(),
  ]);

  const products = rows.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    slug: p.slug,
    price: p.price,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    image: p.images[0]?.url ?? null,
    category: [p.category?.name, p.subcategory?.name].filter(Boolean).join(" › "),
    stock: p.variants.reduce((a, v) => a + v.stock, 0),
    variants: p.variants.length,
    flags: [p.featured && "рекомендований", p.isNew && "новинка", p.bestSeller && "бестселер", p.onSale && "знижка"].filter(Boolean) as string[],
  }));

  return (
    <>
      <PageHeader
        title="Товари"
        description={`${total} товарів${brokenCount ? ` · зі зламаними фото: ${brokenCount}` : ""}`}
        actions={
          <>
            <RoundPricesButton count={unrounded} />
            <DeleteDemoContent summary={demo} />
            {content === "broken-photo" && <DeleteBrokenPhotoProducts count={brokenCount} />}
            <DeleteEmptyProducts count={emptyCount} />
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products/import">
                <FileSpreadsheet /> Імпорт CSV / XLSX
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/products/new">
                <Plus /> Додати товар
              </Link>
            </Button>
          </>
        }
      />
      <AdminFilters
        search={{ placeholder: "Пошук за назвою або артикулом…" }}
        selects={[
          { name: "status", label: "Усі статуси", options: [{ value: "PUBLISHED", label: "Опубліковано" }, { value: "DRAFT", label: "Чернетка" }, { value: "ARCHIVED", label: "Архів" }] },
          { name: "category", label: "Усі категорії", options: categories.map((c) => ({ value: c.id, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name })) },
          { name: "content", label: "Усі товари", options: [{ value: "broken-photo", label: "Зламані фото" }, { value: "no-photo", label: "Без фото" }, { value: "no-variants", label: "Без варіантів" }] },
          { name: "stock", label: "Будь-який залишок", options: [{ value: "low", label: "Закінчується" }, { value: "out", label: "Немає в наявності" }] },
          { name: "sort", label: "Спершу нові", options: [{ value: "created-asc", label: "Спершу старі" }, { value: "name", label: "Назва А–Я" }, { value: "price-asc", label: "Ціна ↑" }, { value: "price-desc", label: "Ціна ↓" }] },
        ]}
      />
      <ProductsTable products={products} page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} />
    </>
  );
}
