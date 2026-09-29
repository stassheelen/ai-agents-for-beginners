import { getSettings } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { blobEnabled } from "@/lib/storage";
import { novaPoshta } from "@/lib/providers/delivery";
import { getPaymentProvider } from "@/lib/providers/payment";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await prisma.settings.findUnique({ where: { id: "default" } }) ?? (await getSettings());
  return (
    <>
      <PageHeader title="Settings" description="Store identity, shipping, SEO defaults and informational content." />
      <SettingsForm
        initial={{
          storeName: s.storeName,
          tagline: s.tagline ?? "",
          accentColor: s.accentColor,
          currency: s.currency,
          freeShippingThreshold: String(s.freeShippingThreshold / 100),
          shippingFlatRate: String(s.shippingFlatRate / 100),
          lowStockThreshold: String(s.lowStockThreshold),
          contactEmail: s.contactEmail ?? "",
          contactPhone: s.contactPhone ?? "",
          instagramUrl: s.instagramUrl ?? "",
          seoTitle: s.seoTitle ?? "",
          seoDescription: s.seoDescription ?? "",
          ogImage: s.ogImage ?? "",
          sizeGuide: s.sizeGuide ?? "",
          deliveryInfo: s.deliveryInfo ?? "",
          returnsInfo: s.returnsInfo ?? "",
        }}
        integrations={[
          { name: "Vercel Blob storage", ok: blobEnabled(), hint: "BLOB_READ_WRITE_TOKEN" },
          { name: "Nova Poshta API (city / branch autocomplete)", ok: novaPoshta.isConfigured(), hint: "NOVA_POSHTA_API_KEY" },
          { name: `Online card payments (${getPaymentProvider("card").name})`, ok: getPaymentProvider("card").id !== "manual", hint: "LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY" },
        ]}
      />
    </>
  );
}
