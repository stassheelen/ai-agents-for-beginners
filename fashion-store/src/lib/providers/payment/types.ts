import type { Order } from "@prisma/client";

export type PaymentMethod = "card" | "cod";

/** What the storefront should do after the order has been created. */
export type PaymentInit =
  | { kind: "none" } // nothing to pay online now (COD / manual invoice)
  | { kind: "redirect"; url: string } // redirect to hosted payment page
  | { kind: "form"; action: string; fields: Record<string, string> }; // auto-submitted POST form

export interface PaymentProvider {
  id: string;
  /** Label shown in admin */
  name: string;
  method: PaymentMethod;
  isConfigured(): boolean;
  createPayment(order: Order, ctx: { resultUrl: string; callbackUrl: string }): Promise<PaymentInit>;
  /** Verify a provider callback; return the order id + new status, or null if invalid. */
  handleCallback?(body: Record<string, string>): Promise<{ orderId: string; status: "PAID" | "FAILED" | "PENDING"; ref?: string } | null>;
}
