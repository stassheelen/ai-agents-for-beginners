import type { PaymentProvider } from "./types";

export const cashOnDelivery: PaymentProvider = {
  id: "cod",
  name: "Накладений платіж",
  method: "cod",
  isConfigured: () => true,
  async createPayment() {
    return { kind: "none" };
  },
};

/**
 * Card payment without an online gateway: the order is created with
 * paymentStatus=PENDING and a manager sends a payment link / invoice.
 * Used automatically when no card gateway is configured.
 */
export const manualCard: PaymentProvider = {
  id: "manual",
  name: "Картка — рахунок від менеджера",
  method: "card",
  isConfigured: () => true,
  async createPayment() {
    return { kind: "none" };
  },
};
