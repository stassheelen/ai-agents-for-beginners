import type { Metadata } from "next";
import Link from "next/link";
import { OrderLookup } from "@/components/store/order-lookup";

export const metadata: Metadata = { title: "Акаунт", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="container-page max-w-5xl py-8 lg:py-12">
      <h1 className="font-display text-4xl font-medium lg:text-6xl">Акаунт</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Перевірте статус будь-якого замовлення за номером та email. Збережені товари — у <Link href="/wishlist" className="underline">списку бажань</Link>.
      </p>
      <div className="mt-12">
        <OrderLookup />
      </div>
    </div>
  );
}
