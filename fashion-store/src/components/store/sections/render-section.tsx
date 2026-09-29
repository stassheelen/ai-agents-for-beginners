import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  getCategoryTiles,
  getCollectionTiles,
  getProductsBySource,
  type HomepageSectionData,
  type ProductSource,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ProductCard } from "../product-card";
import { ProductRail } from "../product-rail";
import { SectionHeading } from "./section-heading";
import { ResponsiveImage } from "./responsive-image";

type Config = {
  source?: ProductSource;
  limit?: number;
  slug?: string;
  slugs?: string[];
  layout?: "left" | "right";
  align?: "left" | "center";
  height?: "full" | "large" | "medium";
};

function cfg(section: HomepageSectionData): Config {
  return (section.config && typeof section.config === "object" ? section.config : {}) as Config;
}

function isVideoFile(url: string) {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

export async function RenderSection({ section, index }: { section: HomepageSectionData; index: number }) {
  const c = cfg(section);
  switch (section.type) {
    case "HERO":
      return <Hero section={section} config={c} priority={index === 0} />;
    case "PRODUCT_CAROUSEL":
    case "PRODUCT_GRID": {
      const products = await getProductsBySource(c.source ?? "latest", c.limit ?? 8, c.slug);
      if (!products.length) return null;
      return (
        <section className="container-page py-12 lg:py-16" style={{ background: section.background ?? undefined }}>
          <SectionHeading title={section.title} subtitle={section.subtitle} href={section.buttonLink} linkLabel={section.buttonLabel} />
          {section.type === "PRODUCT_CAROUSEL" ? (
            <ProductRail products={products} />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      );
    }
    case "CATEGORY_GRID": {
      const tiles = await getCategoryTiles(c.slugs);
      if (!tiles.length) return null;
      const ordered = c.slugs?.length ? c.slugs.map((s) => tiles.find((t) => t.slug === s)).filter((t): t is (typeof tiles)[number] => Boolean(t)) : tiles;
      return (
        <section className="container-page py-12 lg:py-16">
          <SectionHeading title={section.title} subtitle={section.subtitle} href={section.buttonLink} linkLabel={section.buttonLabel} />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-6 lg:gap-4">
            {ordered.map((t) => (
              <Link key={t.id} href={`/shop/${t.slug}`} className="group w-[40%] shrink-0 snap-start md:w-auto">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                  {t.image && <Image src={t.image} alt={t.name} fill sizes="(min-width:1024px) 16vw, (min-width:768px) 33vw, 40vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                </div>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em]">{t.name}</p>
              </Link>
            ))}
          </div>
        </section>
      );
    }
    case "COLLECTION": {
      const cols = c.slug ? (await getCollectionTiles()).filter((x) => x.slug === c.slug) : await getCollectionTiles();
      if (!cols.length) return null;
      return (
        <section className="container-page py-12 lg:py-16">
          <SectionHeading title={section.title} subtitle={section.subtitle} href={section.buttonLink ?? "/collections"} linkLabel={section.buttonLabel ?? "Усі колекції"} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {cols.slice(0, 3).map((col) => (
              <Link key={col.id} href={`/collections/${col.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {col.heroImage && <Image src={col.heroImage} alt={col.name} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                </div>
                <div className="flex items-baseline justify-between gap-4 pt-4">
                  <p className="font-display text-xl">{col.name}</p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] underline underline-offset-[6px]">Дослідити</p>
                </div>
                {col.description && <p className="mt-1 line-clamp-2 max-w-md text-sm text-muted-foreground">{col.description}</p>}
              </Link>
            ))}
          </div>
        </section>
      );
    }
    case "IMAGE_TEXT": {
      const right = c.layout === "right";
      return (
        <section className="py-12 lg:py-16" style={{ background: section.background ?? undefined }}>
          <div className="container-page grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
            <div className={cn("relative aspect-[4/5] overflow-hidden bg-muted", right && "lg:order-2")}>
              {section.image && <Image src={section.image} alt={section.title ?? ""} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
            </div>
            <div className="max-w-lg py-4 lg:py-0" style={{ color: section.textColor ?? undefined }}>
              {section.label && <p className="eyebrow mb-4">{section.label}</p>}
              {section.title && <h2 className="font-display text-3xl font-medium leading-[1.1] lg:text-5xl">{section.title}</h2>}
              {(section.body || section.subtitle) && <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{section.body ?? section.subtitle}</p>}
              {section.buttonLabel && section.buttonLink && (
                <Button asChild variant="outline" className="mt-8">
                  <Link href={section.buttonLink}>{section.buttonLabel}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      );
    }
    case "BANNER":
      return (
        <section className="container-page py-12 lg:py-16">
          <div className="relative flex min-h-[420px] items-end overflow-hidden bg-foreground lg:min-h-[520px]" style={{ background: section.background ?? undefined }}>
            {section.image && <ResponsiveImage desktop={section.image} mobile={section.mobileImage} alt={section.title ?? ""} className="object-cover" />}
            <div className="relative z-10 max-w-xl p-6 lg:p-12" style={{ color: section.textColor ?? "#fff" }}>
              {section.label && <p className="eyebrow mb-3">{section.label}</p>}
              {section.title && <h2 className="font-display text-3xl font-medium lg:text-5xl">{section.title}</h2>}
              {section.subtitle && <p className="mt-3 text-sm opacity-85 lg:text-base">{section.subtitle}</p>}
              {section.buttonLabel && section.buttonLink && (
                <Button asChild variant="white" className="mt-6">
                  <Link href={section.buttonLink}>{section.buttonLabel}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      );
    case "VIDEO":
      return (
        <section className="relative py-12 lg:py-16">
          <div className="container-page">
            <div className="relative aspect-[4/5] overflow-hidden bg-foreground md:aspect-video">
              {section.videoUrl && (isVideoFile(section.videoUrl) || section.videoUrl.startsWith("/")) ? (
                <video className="absolute inset-0 size-full object-cover" src={section.videoUrl} poster={section.image ?? undefined} autoPlay muted loop playsInline preload="metadata" />
              ) : section.image ? (
                <Image src={section.image} alt={section.title ?? ""} fill sizes="100vw" className="object-cover" />
              ) : null}
              {(section.title || section.buttonLabel) && (
                <div className="absolute inset-x-0 bottom-0 p-6 text-white lg:p-12" style={{ color: section.textColor ?? undefined }}>
                  {section.title && <h2 className="font-display text-3xl font-medium lg:text-5xl">{section.title}</h2>}
                  {section.subtitle && <p className="mt-2 text-sm opacity-85">{section.subtitle}</p>}
                  {section.buttonLabel && section.buttonLink && (
                    <Button asChild variant="white" className="mt-6">
                      <Link href={section.buttonLink}>{section.buttonLabel}</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    case "TEXT":
      return (
        <section className="py-16 lg:py-28" style={{ background: section.background ?? undefined, color: section.textColor ?? undefined }}>
          <div className={cn("container-page max-w-3xl", c.align !== "left" && "text-center")}>
            {section.label && <p className="eyebrow mb-5 text-muted-foreground">{section.label}</p>}
            {section.title && <h2 className="font-display text-3xl font-medium leading-[1.1] lg:text-5xl">{section.title}</h2>}
            {section.body && <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground lg:text-lg">{section.body}</p>}
            {section.buttonLabel && section.buttonLink && (
              <Button asChild variant="link" className="mt-6 px-0 text-xs uppercase tracking-[0.14em]">
                <Link href={section.buttonLink}>{section.buttonLabel}</Link>
              </Button>
            )}
          </div>
        </section>
      );
    default:
      return null;
  }
}

function Hero({ section, config, priority }: { section: HomepageSectionData; config: Config; priority: boolean }) {
  const height = { full: "h-[calc(100svh-5.75rem)] min-h-[520px]", large: "h-[75svh] min-h-[480px]", medium: "h-[60svh] min-h-[420px]" }[config.height ?? "full"];
  const center = config.align === "center";
  const light = (section.textColor ?? "#111111").toLowerCase() === "#ffffff";
  return (
    <section className={cn("relative w-full overflow-hidden bg-muted", height)} style={{ background: section.background ?? undefined }}>
      {section.videoUrl ? (
        <video className="absolute inset-0 size-full object-cover" src={section.videoUrl} poster={section.image ?? undefined} autoPlay muted loop playsInline preload="metadata" />
      ) : (
        section.image && <ResponsiveImage desktop={section.image} mobile={section.mobileImage} alt={section.title ?? ""} priority={priority} className="object-cover" />
      )}
      <div className={cn("container-page relative z-10 flex h-full flex-col justify-end pb-10 lg:pb-16", center && "items-center text-center")} style={{ color: section.textColor ?? undefined }}>
        <div className="max-w-2xl">
          {section.label && <p className="eyebrow mb-4">{section.label}</p>}
          {section.title && <h1 className="font-display text-[40px] font-medium leading-[1.02] sm:text-6xl lg:text-[84px]">{section.title}</h1>}
          {section.subtitle && <p className="mt-5 max-w-md text-[15px] leading-relaxed opacity-80 lg:text-base">{section.subtitle}</p>}
          <div className={cn("mt-8 flex flex-wrap gap-3", center && "justify-center")}>
            {section.buttonLabel && section.buttonLink && (
              <Button asChild size="lg" variant={light ? "white" : "default"}>
                <Link href={section.buttonLink}>{section.buttonLabel}</Link>
              </Button>
            )}
            {section.button2Label && section.button2Link && (
              <Button asChild size="lg" variant="outline" className={light ? "border-white text-white hover:bg-white hover:text-black" : ""}>
                <Link href={section.button2Link}>{section.button2Label}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
