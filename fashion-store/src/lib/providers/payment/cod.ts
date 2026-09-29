import type { PaymentProvider } from "./types";

export const cashOnDelivery: PaymentProvider = {
  id: "cod",
  name: "Cash on delivery (накладений платіж)",
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
  name: "Card — manual invoice",
  method: "card",
  isConfigured: () => true,
  async createPayment() {
    return { kind: "none" };
  },
};
