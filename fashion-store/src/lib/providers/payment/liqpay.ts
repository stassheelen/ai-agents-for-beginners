import crypto from "node:crypto";
import type { PaymentProvider } from "./types";

// https://www.liqpay.ua/documentation/api/aquiring/checkout/doc
const PUBLIC_KEY = () => process.env.LIQPAY_PUBLIC_KEY ?? "";
const PRIVATE_KEY = () => process.env.LIQPAY_PRIVATE_KEY ?? "";

function sign(data: string) {
  return crypto.createHash("sha1").update(PRIVATE_KEY() + data + PRIVATE_KEY()).digest("base64");
}

export const liqpay: PaymentProvider = {
  id: "liqpay",
  name: "LiqPay",
  method: "card",
  isConfigured: () => Boolean(PUBLIC_KEY() && PRIVATE_KEY()),
  async createPayment(order, ctx) {
    const payload = {
      version: 3,
      public_key: PUBLIC_KEY(),
      action: "pay",
      amount: (order.total / 100).toFixed(2),
      currency: order.currency,
      description: `Order #${order.number}`,
      order_id: order.id,
      result_url: ctx.resultUrl,
      server_url: ctx.callbackUrl,
      language: "uk",
    };
    const data = Buffer.from(JSON.stringify(payload)).toString("base64");
    return { kind: "form", action: "https://www.liqpay.ua/api/3/checkout", fields: { data, signature: sign(data) } };
  },
  async handleCallback(body) {
    const { data, signature } = body;
    if (!data || !signature) return null;
    const expected = sign(data);
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const json = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as { order_id: string; status: string; payment_id?: number };
    const status = ["success", "sandbox"].includes(json.status) ? "PAID" : ["failure", "error", "reversed"].includes(json.status) ? "FAILED" : "PENDING";
    return { orderId: json.order_id, status, ref: json.payment_id ? String(json.payment_id) : undefined };
  },
};
