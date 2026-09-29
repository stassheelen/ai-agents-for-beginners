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

  await prisma.order.updateMany({
    where: { id: result.orderId, paymentProvider: provider.id },
    data: { paymentStatus: result.status, paymentRef: result.ref, ...(result.status === "PAID" ? { status: "CONFIRMED" } : {}) },
  });
  return Response.json({ ok: true });
}
