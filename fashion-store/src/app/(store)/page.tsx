import type { Metadata } from "next";
import Link from "next/link";
import { getHomepageSections, getSettings } from "@/lib/queries";
import { RenderSection } from "@/components/store/sections/render-section";
import { OrganizationJsonLd } from "@/components/store/json-ld";
import { Button } from "@/components/ui/button";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { Reveal } from "@/components/store/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { absolute: s.seoTitle ?? s.storeName },
    description: s.seoDescription ?? undefined,
    openGraph: {
      title: s.seoTitle ?? s.storeName,
      description: s.seoDescription ?? undefined,
      // The demo seed stored its placeholder image here; the branded card replaces it.
      images: [s.ogImage && s.ogImage !== "/demo/og-default.webp" ? s.ogImage : DEFAULT_OG_IMAGE],
      type: "website",
    },
    twitter: { card: "summary_large_image" },
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
        <>
          {/* A hero with a title renders the page's H1; without one, give search engines a hidden H1. */}
          {!sections.some((s) => s.type === "HERO" && s.title) && (
            <h1 className="sr-only">{settings.seoTitle ?? settings.storeName}</h1>
          )}
          <Reveal>
            {sections.map((s, i) => (
              <RenderSection key={s.id} section={s} index={i} />
            ))}
          </Reveal>
        </>
      )}
    </>
  );
}
