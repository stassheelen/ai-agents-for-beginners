import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { OrderStatusBadge } from "@/components/admin/status";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Клієнт" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const c = await prisma.customer.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/customers" className="p-1.5 hover:bg-muted" aria-label="Назад">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl font-medium">
          {c.firstName} {c.lastName}
        </h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="space-y-3">
            <div><p className="text-[11px] uppercase text-muted-foreground">Email</p><p>{c.email}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Телефон</p><p>{c.phone ?? "—"}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Місто</p><p>{c.city ?? "—"}</p></div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div><p className="text-[11px] uppercase text-muted-foreground">Замовлень</p><p className="font-display text-xl">{c.ordersCount}</p></div>
              <div><p className="text-[11px] uppercase text-muted-foreground">Витрачено</p><p className="font-display text-xl">{formatMoney(c.totalSpent)}</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground">Клієнт з {formatDate(c.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Замовлення</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Замовлення</TH>
                <TH>Дата</TH>
                <TH>Статус</TH>
                <TH className="text-right">Сума</TH>
              </tr>
            </THead>
            <tbody>
              {c.orders.map((o) => (
                <TR key={o.id}>
                  <TD><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">#{o.number}</Link></TD>
                  <TD className="text-muted-foreground">{formatDate(o.createdAt)}</TD>
                  <TD><OrderStatusBadge status={o.status} /></TD>
                  <TD className="text-right">{formatMoney(o.total, o.currency)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
