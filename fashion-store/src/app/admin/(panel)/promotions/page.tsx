import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata = { title: "Промокоди" };

export default async function PromotionsPage() {
  const promos = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Промокоди" description="Промокоди, які покупці вводять під час оформлення замовлення." />
      <PromotionsManager
        promotions={promos.map((p) => ({
          id: p.id,
          code: p.code,
          description: p.description ?? "",
          type: p.type,
          value: p.type === "FIXED" ? String(p.value / 100) : String(p.value),
          minSubtotal: String(p.minSubtotal / 100),
          usageLimit: p.usageLimit ? String(p.usageLimit) : "",
          usageCount: p.usageCount,
          active: p.active,
          startsAt: p.startsAt ? p.startsAt.toISOString().slice(0, 16) : "",
          endsAt: p.endsAt ? p.endsAt.toISOString().slice(0, 16) : "",
        }))}
      />
    </>
  );
}
