import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getSettings } from "@/lib/queries";
import { novaPoshta, DELIVERY_METHODS } from "@/lib/providers/delivery";
import { cardPaymentIsOnline } from "@/lib/providers/payment";

export const metadata: Metadata = { title: "Оформлення замовлення", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="container-page max-w-[1280px] py-8 lg:py-12">
      <h1 className="mb-8 font-display text-3xl font-medium lg:mb-12 lg:text-5xl">Оформлення замовлення</h1>
      <CheckoutForm
        freeShippingThreshold={settings.freeShippingThreshold}
        shippingFlatRate={settings.shippingFlatRate}
        npEnabled={novaPoshta.isConfigured()}
        cardOnline={cardPaymentIsOnline()}
        deliveryMethods={DELIVERY_METHODS.map((d) => ({ id: d.id, label: d.label }))}
      />
    </div>
  );
}
