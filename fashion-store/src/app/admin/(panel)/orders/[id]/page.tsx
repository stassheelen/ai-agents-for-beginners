import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/misc";
import { OrderEditor } from "@/components/admin/order-editor";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/status";
import { DELIVERY_METHODS } from "@/lib/providers/delivery";
import { formatDate, formatMoney } from "@/lib/utils";
import { SupplierLine } from "@/components/admin/supplier-line";

export const metadata = { title: "Замовлення" };

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { supplier: true, supplierSku: true, supplierUrl: true } } } }, customer: { select: { id: true, ordersCount: true } } } });
  if (!o) notFound();
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="p-1.5 hover:bg-muted" aria-label="Назад">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl font-medium">Замовлення #{o.number}</h1>
        <OrderStatusBadge status={o.status} />
        <PaymentBadge status={o.paymentStatus} />
        <span className="text-muted-foreground">{formatDate(o.createdAt, true)}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Товари</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="relative size-14 shrink-0 bg-muted">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    {i.productId ? (
                      <Link href={`/admin/products/${i.productId}`} className="font-medium hover:underline">
                        {i.name}
                      </Link>
                    ) : (
                      <p className="font-medium">{i.name}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {i.sku} · {[i.color, i.size].filter(Boolean).join(" / ")}
                    </p>
                    <SupplierLine item={i} product={i.product} />
                  </div>
                  <p className="w-28 text-right text-muted-foreground">
                    {formatMoney(i.unitPrice, o.currency)} × {i.quantity}
                  </p>
                  <p className="w-24 text-right font-medium">{formatMoney(i.total, o.currency)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-border bg-soft px-5 py-4">
              <div className="flex justify-between"><dt className="text-muted-foreground">Підсумок</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Знижка {o.promotionCode && `(${o.promotionCode})`}</dt><dd>−{formatMoney(o.discount, o.currency)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Доставка</dt><dd>{o.shippingCost ? formatMoney(o.shippingCost, o.currency) : "Безкоштовно"}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-medium"><dt>Разом</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
            </dl>
          </Card>
          <OrderEditor order={{ id: o.id, status: o.status, paymentStatus: o.paymentStatus, trackingNumber: o.trackingNumber ?? "", adminNote: o.adminNote ?? "" }} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Клієнт</CardTitle>
              {o.customer && (
                <Link href={`/admin/customers/${o.customer.id}`} className="text-xs underline">
                  Замовлень: {o.customer.ordersCount}
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">
                {o.firstName} {o.lastName}
              </p>
              <p>
                <a href={`mailto:${o.email}`} className="hover:underline">{o.email}</a>
              </p>
              <p>
                <a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Доставка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p>{DELIVERY_METHODS.find((d) => d.id === o.deliveryMethod)?.label ?? o.deliveryMethod}</p>
              <p className="text-muted-foreground">{o.city}</p>
              <p className="text-muted-foreground">{o.deliveryAddress}</p>
              {o.trackingNumber && <p className="pt-2">ТТН: <strong>{o.trackingNumber}</strong></p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Оплата</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p>{o.paymentMethod === "cod" ? "Накладений платіж" : "Оплата карткою"}</p>
              <p className="text-muted-foreground">Провайдер: {o.paymentProvider === "manual" ? "рахунок від менеджера" : o.paymentProvider === "cod" ? "при отриманні" : o.paymentProvider}</p>
              {o.paymentRef && <p className="text-muted-foreground">ID платежу: {o.paymentRef}</p>}
            </CardContent>
          </Card>
          {o.comment && (
            <Card>
              <CardHeader>
                <CardTitle>Коментар клієнта</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line">{o.comment}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
