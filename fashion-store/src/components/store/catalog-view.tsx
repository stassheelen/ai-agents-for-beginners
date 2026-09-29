import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCatalog, getCatalogFacets, type CatalogParams } from "@/lib/queries";
import { CatalogGrid, CatalogSidebar, CatalogToolbar } from "./catalog-controls";
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
  subnav,
}: {
  title: string;
  description?: string | null;
  heroImage?: string | null;
  breadcrumbs: { name: string; href: string }[];
  scope: CatalogScope;
  params: CatalogParams;
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
      <div className="container-page pt-6 lg:pt-8">
        <Breadcrumbs items={breadcrumbs} />
        <div className="mt-6 flex flex-col gap-3 lg:mt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium lg:text-6xl">{title}</h1>
            {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          <p className="text-xs text-muted-foreground lg:hidden">{catalog.total} товарів</p>
        </div>
        {subnav && subnav.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {subnav.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`shrink-0 border px-4 py-2 text-xs ${s.active ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground"}`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
          <Suspense>
            <CatalogSidebar facets={facets} hide={hide} />
          </Suspense>
          <div>
            <Suspense>
              <CatalogToolbar total={catalog.total} facets={facets} hide={hide} />
            </Suspense>
            <div className="mt-6">
              <CatalogGrid key={gridKey} initial={catalog.items} hasMore={catalog.hasMore} params={{ ...merged, page: 1 }} total={catalog.total} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
