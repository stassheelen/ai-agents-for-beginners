import { Badge } from "@/components/ui/misc";

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"] as const;

export function OrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === "DELIVERED" ? "success" : status === "CANCELLED" || status === "RETURNED" ? "danger" : status === "NEW" ? "default" : status === "SHIPPED" ? "muted" : "warning";
  return <Badge variant={variant}>{status.toLowerCase()}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const variant = status === "PAID" ? "success" : status === "FAILED" ? "danger" : status === "REFUNDED" ? "muted" : "warning";
  return <Badge variant={variant}>{status.toLowerCase()}</Badge>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge variant={status === "PUBLISHED" ? "success" : status === "DRAFT" ? "warning" : "muted"}>{status.toLowerCase()}</Badge>;
}
