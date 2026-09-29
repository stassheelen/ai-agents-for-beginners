import type { PaymentMethod, PaymentProvider } from "./types";
import { cashOnDelivery, manualCard } from "./cod";
import { liqpay } from "./liqpay";

export type { PaymentProvider, PaymentInit, PaymentMethod } from "./types";

/**
 * Register new gateways here (WayForPay, Monobank acquiring, Stripe …).
 * Each one implements PaymentProvider; the first configured provider for a method wins.
 */
const providers: PaymentProvider[] = [liqpay, manualCard, cashOnDelivery];

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const preferred = process.env.PAYMENT_CARD_PROVIDER;
  const candidates = providers.filter((p) => p.method === method && p.isConfigured());
  return candidates.find((p) => p.id === preferred) ?? candidates[0];
}

export function getPaymentProviderById(id: string) {
  return providers.find((p) => p.id === id);
}

export function cardPaymentIsOnline() {
  return getPaymentProvider("card").id !== "manual";
}
