import type { Metadata } from "next";
import Link from "next/link";
import { getHomepageSections, getSettings } from "@/lib/queries";
import { RenderSection } from "@/components/store/sections/render-section";
import { OrganizationJsonLd } from "@/components/store/json-ld";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { absolute: s.seoTitle ?? s.storeName },
    description: s.seoDescription ?? undefined,
    openGraph: { title: s.seoTitle ?? s.storeName, description: s.seoDescription ?? undefined, images: s.ogImage ? [s.ogImage] : undefined, type: "website" },
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [sections, settings] = await Promise.all([getHomepageSections(), getSettings()]);
  return (
    <>
      <OrganizationJsonLd name={settings.storeName} email={settings.contactEmail} phone={settings.contactPhone} instagram={settings.instagramUrl} />
      {sections.length === 0 ? (
        <section className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="font-display text-4xl">{settings.storeName}</h1>
          <p className="text-sm text-muted-foreground">Головна сторінка ще не налаштована. Додайте секції в адмін-панелі → Головна сторінка.</p>
          <Button asChild>
            <Link href="/shop">До каталогу</Link>
          </Button>
        </section>
      ) : (
        sections.map((s, i) => <RenderSection key={s.id} section={s} index={i} />)
      )}
    </>
  );
}
