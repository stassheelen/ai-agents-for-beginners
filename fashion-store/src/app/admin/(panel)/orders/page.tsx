import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { AdminFilters, Pagination } from "@/components/admin/filters";
import { OrderStatusBadge, PaymentBadge, ORDER_STATUSES } from "@/components/admin/status";
import { Card, EmptyState, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PER_PAGE = 30;

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as (typeof ORDER_STATUSES)[number]) : undefined;
  const payment = typeof sp.payment === "string" ? sp.payment : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const num = Number(q.replace(/^#/, ""));
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(payment && ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(payment) ? { paymentStatus: payment as "PAID" } : {}),
    ...(q
      ? {
          OR: [
            ...(Number.isInteger(num) && num > 0 ? [{ number: num }] : []),
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { lastName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, orders, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { items: { select: { quantity: true } } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title="Orders" description={`${total} orders`} />
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        <Link href="/admin/orders" className={cn("shrink-0 border px-3 py-1.5 text-xs", !status ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={cn("shrink-0 border px-3 py-1.5 text-xs capitalize", status === s ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
            {s.toLowerCase()} <span className="opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>
      <AdminFilters
        search={{ placeholder: "Order #, email, phone, name…" }}
        selects={[{ name: "payment", label: "Any payment", options: ["PENDING", "PAID", "FAILED", "REFUNDED"].map((p) => ({ value: p, label: p.toLowerCase() })) }]}
      />
      <Card>
        {orders.length === 0 ? (
          <EmptyState title="No orders" description="Orders placed in the store appear here." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Order #</TH>
                  <TH>Date</TH>
                  <TH>Customer</TH>
                  <TH className="text-right">Items</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {orders.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                        #{o.number}
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt, true)}</TD>
                    <TD>
                      <p>
                        {o.firstName} {o.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{o.email}</p>
                    </TD>
                    <TD className="text-right">{o.items.reduce((a, i) => a + i.quantity, 0)}</TD>
                    <TD className="text-right">{formatMoney(o.total, o.currency)}</TD>
                    <TD>
                      <p className="text-[11px] text-muted-foreground">{o.paymentMethod === "cod" ? "Cash on delivery" : `Card · ${o.paymentProvider}`}</p>
                      <PaymentBadge status={o.paymentStatus} />
                    </TD>
                    <TD>
                      <OrderStatusBadge status={o.status} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} />
          </>
        )}
      </Card>
    </>
  );
}
