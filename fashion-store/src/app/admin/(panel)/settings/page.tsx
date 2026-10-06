import { getSettings } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { blobEnabled, r2Enabled } from "@/lib/storage";
import { novaPoshta } from "@/lib/providers/delivery";
import { getPaymentProvider } from "@/lib/providers/payment";

export const metadata = { title: "Налаштування" };

export default async function SettingsPage() {
  const s = await prisma.settings.findUnique({ where: { id: "default" } }) ?? (await getSettings());
  return (
    <>
      <PageHeader title="Налаштування" description="Дані магазину, доставка, SEO за замовчуванням та інформаційні тексти." />
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
          { name: "Сховище фото Cloudflare R2", ok: r2Enabled(), hint: "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL" },
          { name: "Сховище файлів Vercel Blob", ok: blobEnabled(), hint: "BLOB_READ_WRITE_TOKEN" },
          { name: "API Нової Пошти (підказки міст і відділень)", ok: novaPoshta.isConfigured(), hint: "NOVA_POSHTA_API_KEY" },
          { name: `Онлайн-оплата карткою (${getPaymentProvider("card").name})`, ok: getPaymentProvider("card").id !== "manual", hint: "LIQPAY_PUBLIC_KEY / LIQPAY_PRIVATE_KEY" },
        ]}
      />
    </>
  );
}
