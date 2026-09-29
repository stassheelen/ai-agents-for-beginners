import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { AdminFilters, Pagination } from "@/components/admin/filters";
import { OrderStatusBadge, PaymentBadge, ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, paymentMethodLabel } from "@/components/admin/status";
import { ExpandableRow } from "@/components/admin/expandable-row";
import { DELIVERY_METHODS } from "@/lib/providers/delivery";
import { Card, EmptyState, Table, TD, TH, THead } from "@/components/ui/misc";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Замовлення" };
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
      include: { items: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title="Замовлення" description={`Усього: ${total}`} />
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        <Link href="/admin/orders" className={cn("shrink-0 border px-3 py-1.5 text-xs", !status ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
          Усі
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={cn("shrink-0 border px-3 py-1.5 text-xs", status === s ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
            {ORDER_STATUS_LABELS[s]} <span className="opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>
      <AdminFilters
        search={{ placeholder: "№ замовлення, email, телефон, імʼя…" }}
        selects={[{ name: "payment", label: "Будь-яка оплата", options: ["PENDING", "PAID", "FAILED", "REFUNDED"].map((p) => ({ value: p, label: PAYMENT_STATUS_LABELS[p] })) }]}
      />
      <Card>
        {orders.length === 0 ? (
          <EmptyState title="Замовлень немає" description="Тут зʼявляться замовлення з магазину." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH className="w-8 pl-3"><span className="sr-only">Деталі</span></TH>
                  <TH>№</TH>
                  <TH>Дата</TH>
                  <TH>Клієнт</TH>
                  <TH className="text-right">Товарів</TH>
                  <TH className="text-right">Сума</TH>
                  <TH>Оплата</TH>
                  <TH>Статус</TH>
                </tr>
              </THead>
              <tbody>
                {orders.map((o) => (
                  <ExpandableRow key={o.id} colSpan={7} details={<OrderQuickView order={o} />}>
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
                      <p className="text-[11px] text-muted-foreground">{o.paymentMethod === "cod" ? "Накладений платіж" : `Картка · ${o.paymentProvider === "manual" ? "рахунок" : o.paymentProvider}`}</p>
                      <PaymentBadge status={o.paymentStatus} />
                    </TD>
                    <TD>
                      <OrderStatusBadge status={o.status} />
                    </TD>
                  </ExpandableRow>
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

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function OrderQuickView({ order: o }: { order: OrderWithItems }) {
  const delivery = DELIVERY_METHODS.find((d) => d.id === o.deliveryMethod)?.label ?? o.deliveryMethod;
  return (
    <div className="grid gap-4 border border-border bg-white p-4 max-lg:sticky max-lg:left-3 max-lg:w-[calc(100vw-3.75rem)] sm:grid-cols-2 lg:grid-cols-[1fr_280px_260px]">
      <section className="sm:col-span-2 lg:col-span-1">
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Товари ({o.items.length})</h3>
        <ul className="divide-y divide-border">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2">
              <div className="relative size-12 shrink-0 bg-muted">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[i.color, i.size && `розмір ${i.size}`].filter(Boolean).join(" · ")} · {i.sku}
                </p>
              </div>
              <div className="text-right sm:flex sm:items-center sm:gap-4">
                <p className="whitespace-nowrap text-[11px] text-muted-foreground sm:text-sm">
                  {i.quantity} × {formatMoney(i.unitPrice, o.currency)}
                </p>
                <p className="whitespace-nowrap font-medium sm:w-24">{formatMoney(i.total, o.currency)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
          {o.discount > 0 && (
            <div className="flex justify-between"><dt className="text-muted-foreground">Знижка {o.promotionCode && `(${o.promotionCode})`}</dt><dd>−{formatMoney(o.discount, o.currency)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted-foreground">Доставка</dt><dd>{o.shippingCost ? formatMoney(o.shippingCost, o.currency) : "Безкоштовно"}</dd></div>
          <div className="flex justify-between text-sm font-medium"><dt>Разом</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
        </dl>
      </section>
      <section className="space-y-1">
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Доставка</h3>
        <p>{delivery}</p>
        <p>{o.city}</p>
        <p className="text-muted-foreground">{o.deliveryAddress}</p>
        {o.trackingNumber && <p className="pt-1">ТТН: <strong>{o.trackingNumber}</strong></p>}
        <p className="pt-2">
          {o.firstName} {o.lastName}
        </p>
        <p><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></p>
      </section>
      <section className="space-y-1">
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Оплата</h3>
        <p>{paymentMethodLabel(o.paymentMethod, o.paymentProvider)}</p>
        <div>
          <PaymentBadge status={o.paymentStatus} />
        </div>
        {o.comment && (
          <div className="pt-3">
            <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Коментар</h3>
            <p className="whitespace-pre-line">{o.comment}</p>
          </div>
        )}
        <Link href={`/admin/orders/${o.id}`} className="!mt-4 inline-block border border-foreground px-3 py-1.5 text-xs font-medium hover:bg-foreground hover:text-white">
          Відкрити та змінити статус
        </Link>
      </section>
    </div>
  );
}
