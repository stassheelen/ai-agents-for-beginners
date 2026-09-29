import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/admin/shell";
import { SalesChart } from "@/components/admin/sales-chart";
import { OrderStatusBadge } from "@/components/admin/status";
import { Card, CardContent, CardHeader, CardTitle, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const RANGES = {
  today: { label: "Today", days: 1 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "12m": { label: "12 months", days: 365 },
} as const;
type Range = keyof typeof RANGES;

function buckets(range: Range, now: Date) {
  const out: { key: string; label: string; start: Date }[] = [];
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    for (let h = 0; h < 24; h++) {
      const s = new Date(d.getTime() + h * 3600000);
      out.push({ key: `h${h}`, label: `${String(h).padStart(2, "0")}:00`, start: s });
    }
  } else if (range === "12m") {
    for (let m = 11; m >= 0; m--) {
      const s = new Date(now.getFullYear(), now.getMonth() - m, 1);
      out.push({ key: `m${s.getFullYear()}-${s.getMonth()}`, label: s.toLocaleString("en", { month: "short" }), start: s });
    }
  } else {
    const days = RANGES[range].days;
    for (let i = days - 1; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({ key: `d${s.toDateString()}`, label: `${s.getDate()}.${String(s.getMonth() + 1).padStart(2, "0")}`, start: s });
    }
  }
  return out;
}

export default async function Dashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const range: Range = typeof sp.range === "string" && sp.range in RANGES ? (sp.range as Range) : "30d";
  const now = new Date();
  const bs = buckets(range, now);
  const from = bs[0].start;
  const settings = await getSettings();

  const validOrder = { createdAt: { gte: from }, status: { notIn: ["CANCELLED" as const] } };
  const [agg, orders, productCount, customerCount, newCustomers, recent, topItems, lowStock, outOfStock] = await Promise.all([
    prisma.order.aggregate({ where: validOrder, _sum: { total: true }, _count: true }),
    prisma.order.findMany({ where: validOrder, select: { createdAt: true, total: true } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: from } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, number: true, firstName: true, lastName: true, total: true, status: true, createdAt: true, currency: true } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: validOrder, productId: { not: null } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: settings.lowStockThreshold }, product: { status: "PUBLISHED" } },
      orderBy: { stock: "asc" },
      take: 8,
      select: { id: true, sku: true, stock: true, size: true, color: { select: { name: true } }, product: { select: { id: true, name: true } } },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 0 }, product: { status: "PUBLISHED" } },
      take: 8,
      select: { id: true, sku: true, size: true, color: { select: { name: true } }, product: { select: { id: true, name: true } } },
    }),
  ]);
  const outOfStockCount = await prisma.productVariant.count({ where: { stock: { lte: 0 }, product: { status: "PUBLISHED" } } });
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topItems.map((t) => t.productId!) } },
    select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });

  const series = bs.map((b) => ({ label: b.label, sales: 0, orders: 0 }));
  for (const o of orders) {
    let idx = -1;
    for (let i = bs.length - 1; i >= 0; i--) {
      if (o.createdAt >= bs[i].start) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      series[idx].sales += o.total;
      series[idx].orders += 1;
    }
  }

  const totalSales = agg._sum.total ?? 0;
  const count = agg._count;
  const stats = [
    { label: "Total sales", value: formatMoney(totalSales) },
    { label: "Orders", value: String(count) },
    { label: "Average order value", value: formatMoney(count ? Math.round(totalSales / count) : 0) },
    { label: "Products", value: String(productCount), hint: "published" },
    { label: "Customers", value: String(customerCount), hint: `+${newCustomers} in period` },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Store performance overview (cancelled orders excluded)"
        actions={
          <div className="flex border border-border bg-white">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <Link key={r} href={`/admin?range=${r}`} className={cn("px-3 py-1.5 text-xs", r === range ? "bg-foreground text-white" : "hover:bg-muted")}>
                {RANGES[r].label}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl">{s.value}</p>
            {s.hint && <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sales · {RANGES[range].label}</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={series} />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <Link href="/admin/orders" className="text-xs underline">
              View all
            </Link>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
              </tr>
            </THead>
            <tbody>
              {recent.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.number}
                    </Link>
                  </TD>
                  <TD>
                    {o.firstName} {o.lastName}
                  </TD>
                  <TD className="text-muted-foreground">{formatDate(o.createdAt)}</TD>
                  <TD>
                    <OrderStatusBadge status={o.status} />
                  </TD>
                  <TD className="text-right">{formatMoney(o.total, o.currency)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {topItems.map((t) => {
              const p = topProducts.find((x) => x.id === t.productId);
              if (!p) return null;
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="relative size-10 shrink-0 bg-muted">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</div>
                  <Link href={`/admin/products/${p.id}`} className="flex-1 truncate hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-muted-foreground">{t._sum.quantity} sold</span>
                  <span className="w-24 text-right">{formatMoney(t._sum.total ?? 0)}</span>
                </li>
              );
            })}
            {topItems.length === 0 && <li className="px-5 py-8 text-center text-muted-foreground">No sales in this period</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StockCard title="Low stock" items={lowStock.map((v) => ({ ...v, stockLabel: `${v.stock} left` }))} />
        <StockCard title={`Out of stock (${outOfStockCount})`} items={outOfStock.map((v) => ({ ...v, stockLabel: "0" }))} />
      </div>
    </>
  );
}

function StockCard({
  title,
  items,
}: {
  title: string;
  items: { id: string; sku: string; size: string | null; color: { name: string } | null; product: { id: string; name: string }; stockLabel: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Link href="/admin/inventory" className="text-xs underline">
          Inventory
        </Link>
      </CardHeader>
      <ul className="divide-y divide-border">
        {items.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0">
              <Link href={`/admin/products/${v.product.id}`} className="block truncate hover:underline">
                {v.product.name}
              </Link>
              <p className="text-[11px] text-muted-foreground">
                {v.sku} · {[v.color?.name, v.size].filter(Boolean).join(" / ")}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium">{v.stockLabel}</span>
          </li>
        ))}
        {items.length === 0 && <li className="px-5 py-8 text-center text-muted-foreground">All good</li>}
      </ul>
    </Card>
  );
}
