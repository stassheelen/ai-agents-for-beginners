import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCatalog, getCatalogFacets, type CatalogParams } from "@/lib/queries";
import { CatalogGrid, CatalogToolbar } from "./catalog-controls";
import { CategoryPills, type Pill } from "./category-pills";
import { BreadcrumbJsonLd } from "./json-ld";

export type CatalogScope = Pick<CatalogParams, "category" | "collection" | "q" | "flag">;

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <>
      <BreadcrumbJsonLd items={items} />
      <nav aria-label="Breadcrumb" className="text-[11px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((it, i) => (
            <li key={it.href} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {i === items.length - 1 ? <span className="text-foreground">{it.name}</span> : <Link href={it.href} className="hover:text-foreground">{it.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export async function CatalogView({
  title,
  description,
  heroImage,
  breadcrumbs,
  scope,
  params,
  pills,
  subnav,
}: {
  title: string;
  description?: string | null;
  heroImage?: string | null;
  breadcrumbs: { name: string; href: string }[];
  scope: CatalogScope;
  params: CatalogParams;
  /** Main category pill row. */
  pills?: Pill[];
  /** Secondary text links, e.g. subcategories of the current category. */
  subnav?: { name: string; href: string; active?: boolean }[];
}) {
  const merged: CatalogParams = { ...params, ...Object.fromEntries(Object.entries(scope).filter(([, v]) => v !== undefined)) };
  const [catalog, facets] = await Promise.all([getCatalog({ ...merged, page: 1 }), getCatalogFacets(scope)]);
  const hide = { category: false, collection: Boolean(scope.collection) };
  const gridKey = JSON.stringify(merged);

  return (
    <div>
      {heroImage ? (
        <section className="relative h-[46svh] min-h-[320px] w-full overflow-hidden bg-muted lg:h-[56svh]">
          <Image src={heroImage} alt={title} fill priority sizes="100vw" className="object-cover" />
        </section>
      ) : null}
      <div className="container-page pt-5 lg:pt-8">
        <Breadcrumbs items={breadcrumbs} />
        <div className="mt-5 max-w-3xl lg:mt-7">
          <h1 className="font-display text-[44px] font-medium leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-[88px]">{title}</h1>
          {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {pills && pills.length > 0 && (
          <div className="mt-6 lg:mt-9">
            <CategoryPills items={pills} />
          </div>
        )}
        {subnav && subnav.length > 0 && (
          <nav aria-label="Підкатегорії" className="no-scrollbar -mx-4 mt-3 flex gap-6 overflow-x-auto px-4 md:mx-0 md:px-0">
            {subnav.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                scroll={false}
                aria-current={s.active ? "page" : undefined}
                className={`relative shrink-0 py-2.5 text-[13px] transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:bg-foreground after:transition-transform after:duration-300 ${s.active ? "text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100"}`}
              >
                {s.name}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-4 lg:mt-6">
          <Suspense>
            <CatalogToolbar total={catalog.total} facets={facets} hide={hide} />
          </Suspense>
          <div className="mt-6 lg:mt-8">
            <CatalogGrid key={gridKey} initial={catalog.items} hasMore={catalog.hasMore} params={{ ...merged, page: 1 }} total={catalog.total} />
          </div>
        </div>
      </div>
    </div>
  );
}
