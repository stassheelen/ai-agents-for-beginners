import { Badge } from "@/components/ui/misc";

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Нове",
  CONFIRMED: "Підтверджене",
  PROCESSING: "В обробці",
  PACKED: "Зібране",
  SHIPPED: "Відправлене",
  DELIVERED: "Доставлене",
  CANCELLED: "Скасоване",
  RETURNED: "Повернення",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Очікує оплати",
  PAID: "Оплачено",
  FAILED: "Помилка оплати",
  REFUNDED: "Повернено кошти",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Чернетка",
  PUBLISHED: "Опубліковано",
  ARCHIVED: "Архів",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === "DELIVERED" ? "success" : status === "CANCELLED" || status === "RETURNED" ? "danger" : status === "NEW" ? "default" : status === "SHIPPED" ? "muted" : "warning";
  return <Badge variant={variant}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const variant = status === "PAID" ? "success" : status === "FAILED" ? "danger" : status === "REFUNDED" ? "muted" : "warning";
  return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge variant={status === "PUBLISHED" ? "success" : status === "DRAFT" ? "warning" : "muted"}>{PRODUCT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function paymentMethodLabel(method: string, provider: string) {
  if (method === "cod") return "Накладений платіж (оплата при отриманні)";
  const via = provider === "manual" ? "рахунок від менеджера" : provider === "liqpay" ? "LiqPay" : provider;
  return `Оплата карткою · ${via}`;
}
