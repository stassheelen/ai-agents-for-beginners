import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/admin/shell";
import { AdminFilters, Pagination } from "@/components/admin/filters";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata = { title: "Inventory" };
const PER_PAGE = 50;

export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const stock = typeof sp.stock === "string" ? sp.stock : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const settings = await getSettings();
  const where: Prisma.ProductVariantWhereInput = {
    ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(stock === "out" ? { stock: { lte: 0 } } : stock === "low" ? { stock: { gt: 0, lte: settings.lowStockThreshold } } : stock === "in" ? { stock: { gt: 0 } } : {}),
  };
  const [total, variants, sum] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, sku: true, size: true, stock: true, color: { select: { name: true, hex: true } }, product: { select: { id: true, name: true, status: true } } },
    }),
    prisma.productVariant.aggregate({ _sum: { stock: true } }),
  ]);
  return (
    <>
      <PageHeader title="Inventory" description={`${total} variants · ${sum._sum.stock ?? 0} units in stock · low stock ≤ ${settings.lowStockThreshold}`} />
      <AdminFilters
        search={{ placeholder: "SKU or product…" }}
        selects={[{ name: "stock", label: "All stock levels", options: [{ value: "in", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }] }]}
      />
      <InventoryTable
        variants={variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, stock: v.stock, color: v.color, productId: v.product.id, productName: v.product.name, status: v.product.status }))}
        lowThreshold={settings.lowStockThreshold}
      />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} />
    </>
  );
}
