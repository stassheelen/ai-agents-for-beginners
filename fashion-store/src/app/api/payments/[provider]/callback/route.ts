import { prisma } from "@/lib/db";
import { getPaymentProviderById } from "@/lib/providers/payment";

// Server-to-server payment notifications (e.g. LiqPay server_url).
export async function POST(req: Request, ctx: RouteContext<"/api/payments/[provider]/callback">) {
  const { provider: providerId } = await ctx.params;
  const provider = getPaymentProviderById(providerId);
  if (!provider?.handleCallback || !provider.isConfigured()) return Response.json({ error: "Unknown provider" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, string> = {};
  if (contentType.includes("application/json")) body = (await req.json()) as Record<string, string>;
  else body = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;

  const result = await provider.handleCallback(body);
  if (!result) return Response.json({ error: "Invalid signature" }, { status: 400 });

  const order = await prisma.order.findFirst({ where: { id: result.orderId, paymentProvider: provider.id }, select: { id: true, total: true, currency: true, status: true } });
  if (!order) return Response.json({ error: "Unknown order" }, { status: 404 });
  // A "paid" notice for a different sum or currency than the order is not trusted.
  if (result.status === "PAID" && ((result.amount !== undefined && result.amount !== order.total) || (result.currency && result.currency !== order.currency))) {
    console.error("payment callback amount mismatch", { order: order.id, amount: result.amount, currency: result.currency });
    return Response.json({ error: "Amount mismatch" }, { status: 400 });
  }
  await prisma.order.update({
    where: { id: order.id },
    // Only a new order moves to "confirmed"; a cancelled or later-stage order keeps its status.
    data: { paymentStatus: result.status, paymentRef: result.ref, ...(result.status === "PAID" && order.status === "NEW" ? { status: "CONFIRMED" } : {}) },
  });
  return Response.json({ ok: true });
}
