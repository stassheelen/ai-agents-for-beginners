import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { verifyOrderToken } from "@/lib/visitor";
import { formatDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DELIVERY_METHODS } from "@/lib/providers/delivery";

export const metadata: Metadata = { title: "Дякуємо за замовлення", robots: { index: false } };

const PAYMENT_LABEL: Record<string, string> = { cod: "Оплата при отриманні", card: "Оплата карткою" };

export default async function SuccessPage(props: PageProps<"/checkout/success">) {
  const sp = await props.searchParams;
  const orderId = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!orderId || !verifyOrderToken(orderId, token)) notFound();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) notFound();

  return (
    <div className="container-page max-w-3xl py-12 lg:py-20">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10" strokeWidth={1.2} />
        <p className="eyebrow mt-6 text-muted-foreground">Замовлення #{order.number}</p>
        <h1 className="mt-3 font-display text-3xl font-medium lg:text-5xl">Дякуємо, {order.firstName}!</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Ми отримали ваше замовлення. Менеджер зв&apos;яжеться з вами найближчим часом.
          {order.paymentMethod === "card" && order.paymentStatus !== "PAID" && " Посилання на оплату буде надіслано після підтвердження."}
        </p>
      </div>
      <div className="mt-12 border border-border">
        <ul className="divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 p-5">
              <div className="relative aspect-[4/5] w-16 shrink-0 bg-muted">{i.image && <Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" />}</div>
              <div className="flex flex-1 justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[i.color, i.size].filter(Boolean).join(" / ")} · {i.quantity} шт.
                  </p>
                </div>
                <p>{formatMoney(i.total, order.currency)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="grid gap-6 border-t border-border bg-soft p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow mb-2 text-muted-foreground">Доставка</dt>
            <dd>{DELIVERY_METHODS.find((d) => d.id === order.deliveryMethod)?.label}</dd>
            <dd className="text-muted-foreground">
              {order.city}, {order.deliveryAddress}
            </dd>
          </div>
          <div>
            <dt className="eyebrow mb-2 text-muted-foreground">Оплата</dt>
            <dd>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</dd>
            <dd className="text-muted-foreground">{formatDate(order.createdAt, true)}</dd>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Підсумок</span><span>{formatMoney(order.subtotal, order.currency)}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Знижка ({order.promotionCode})</span><span>−{formatMoney(order.discount, order.currency)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Доставка</span><span>{order.shippingCost === 0 ? "Безкоштовно" : formatMoney(order.shippingCost, order.currency)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Разом</span><span>{formatMoney(order.total, order.currency)}</span></div>
          </div>
        </dl>
      </div>
      <div className="mt-10 text-center">
        <Button asChild>
          <Link href="/shop">Продовжити покупки</Link>
        </Button>
      </div>
    </div>
  );
}
