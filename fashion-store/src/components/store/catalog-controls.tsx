"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Checkbox, Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { loadCatalogPage } from "@/actions/catalog";
import type { CatalogParams, CatalogSort, ProductCardData } from "@/lib/queries";
import { SORT_LABELS } from "@/lib/catalog-params";
import { cn, formatMoney } from "@/lib/utils";
import { ProductCard } from "./product-card";

export type Facets = {
  sizes: string[];
  colors: { name: string; slug: string; hex: string }[];
  categories: { name: string; slug: string }[];
  collections: { name: string; slug: string }[];
  minPrice: number;
  maxPrice: number;
};

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();
  const update = React.useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      p.delete("page");
      const qs = p.toString();
      start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [router, pathname, sp],
  );
  return { sp, update, pending };
}

function toggleValue(p: URLSearchParams, key: string, value: string) {
  const values = (p.get(key)?.split(",") ?? []).filter(Boolean);
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  if (next.length) p.set(key, next.join(","));
  else p.delete(key);
}

function FilterPanel({ facets, hide }: { facets: Facets; hide: { category?: boolean; collection?: boolean } }) {
  const { sp, update } = useUpdateParams();
  const selected = (key: string) => (sp.get(key)?.split(",") ?? []).filter(Boolean);
  const [min, setMin] = React.useState(sp.get("min") ?? "");
  const [max, setMax] = React.useState(sp.get("max") ?? "");
  const [prevSp, setPrevSp] = React.useState(sp);
  if (prevSp !== sp) {
    setPrevSp(sp);
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }

  const groups = ["size", "color", "price", "category", "collection", "availability"].filter(
    (g) => !(g === "category" && (hide.category || !facets.categories.length)) && !(g === "collection" && (hide.collection || !facets.collections.length)),
  );

  return (
    <Accordion type="multiple" defaultValue={["size", "color", "category"]} className="w-full">
      {groups.includes("category") && (
        <AccordionItem value="category">
          <AccordionTrigger>Категорія</AccordionTrigger>
          <AccordionContent className="space-y-2.5 text-foreground">
            {facets.categories.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={selected("category").includes(c.slug)} onCheckedChange={() => update((p) => toggleValue(p, "category", c.slug))} />
                {c.name}
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem value="size">
        <AccordionTrigger>Розмір</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-4 gap-1.5">
            {facets.sizes.map((s) => {
              const on = selected("size").includes(s);
              return (
                <button
                  key={s}
                  onClick={() => update((p) => toggleValue(p, "size", s))}
                  aria-pressed={on}
                  className={cn("h-9 border text-[11px] font-medium text-foreground", on ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground", s.length > 4 && "col-span-2")}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="color">
        <AccordionTrigger>Колір</AccordionTrigger>
        <AccordionContent className="grid grid-cols-2 gap-2.5 text-foreground">
          {facets.colors.map((c) => {
            const on = selected("color").includes(c.slug);
            return (
              <button key={c.slug} onClick={() => update((p) => toggleValue(p, "color", c.slug))} aria-pressed={on} className="flex items-center gap-2.5 text-left text-sm">
                <span className={cn("size-5 rounded-full border border-black/15 ring-offset-2", on && "ring-1 ring-foreground")} style={{ background: c.hex }} />
                <span className={cn(on && "font-medium")}>{c.name}</span>
              </button>
            );
          })}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="price">
        <AccordionTrigger>Ціна</AccordionTrigger>
        <AccordionContent>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update((p) => {
                if (min) p.set("min", min);
                else p.delete("min");
                if (max) p.set("max", max);
                else p.delete("max");
              });
            }}
          >
            <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={String(Math.floor(facets.minPrice / 100))} className="h-9 w-full border border-border px-2 text-sm text-foreground outline-none focus:border-foreground" aria-label="Мінімальна ціна" />
            <span>—</span>
            <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={String(Math.ceil(facets.maxPrice / 100))} className="h-9 w-full border border-border px-2 text-sm text-foreground outline-none focus:border-foreground" aria-label="Максимальна ціна" />
            <Button type="submit" size="sm" variant="outline" className="h-9 px-3">
              OK
            </Button>
          </form>
          <p className="mt-2 text-[11px]">
            {formatMoney(facets.minPrice)} — {formatMoney(facets.maxPrice)}
          </p>
        </AccordionContent>
      </AccordionItem>
      {groups.includes("collection") && (
        <AccordionItem value="collection">
          <AccordionTrigger>Колекція</AccordionTrigger>
          <AccordionContent className="space-y-2.5 text-foreground">
            {facets.collections.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={selected("collection").includes(c.slug)} onCheckedChange={() => update((p) => toggleValue(p, "collection", c.slug))} />
                {c.name}
              </label>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem value="availability">
        <AccordionTrigger>Наявність</AccordionTrigger>
        <AccordionContent className="text-foreground">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={sp.get("stock") === "1"} onCheckedChange={(v) => update((p) => (v ? p.set("stock", "1") : p.delete("stock")))} />
            Лише в наявності
          </label>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const FILTER_KEYS = ["size", "color", "category", "collection", "min", "max", "stock"];

function ActiveFilters({ facets }: { facets: Facets }) {
  const { sp, update } = useUpdateParams();
  const chips: { key: string; value: string; label: string }[] = [];
  for (const key of ["size", "color", "category", "collection"]) {
    for (const v of sp.get(key)?.split(",").filter(Boolean) ?? []) {
      const label =
        key === "color"
          ? facets.colors.find((c) => c.slug === v)?.name ?? v
          : key === "category"
            ? facets.categories.find((c) => c.slug === v)?.name ?? v
            : key === "collection"
              ? facets.collections.find((c) => c.slug === v)?.name ?? v
              : v;
      chips.push({ key, value: v, label });
    }
  }
  if (sp.get("min") || sp.get("max")) chips.push({ key: "price", value: "", label: `${sp.get("min") ?? 0} — ${sp.get("max") ?? "∞"} ₴` });
  if (sp.get("stock") === "1") chips.push({ key: "stock", value: "", label: "В наявності" });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key + c.value}
          onClick={() =>
            update((p) => {
              if (c.key === "price") {
                p.delete("min");
                p.delete("max");
              } else if (c.key === "stock") p.delete("stock");
              else toggleValue(p, c.key, c.value);
            })
          }
          className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 text-xs hover:bg-[#ebe9e4]"
        >
          {c.label} <X className="size-3" />
        </button>
      ))}
      <button onClick={() => update((p) => FILTER_KEYS.forEach((k) => p.delete(k)))} className="text-xs underline underline-offset-4">
        Скинути все
      </button>
    </div>
  );
}

export function CatalogToolbar({ total, facets, hide }: { total: number; facets: Facets; hide: { category?: boolean; collection?: boolean } }) {
  const { sp, update, pending } = useUpdateParams();
  const [open, setOpen] = React.useState(false);
  const activeCount = FILTER_KEYS.filter((k) => sp.get(k)).length;
  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-4 border-b border-border bg-white px-4 py-3 md:-mx-6 md:px-6 lg:static lg:mx-0 lg:border-0 lg:px-0 lg:py-0">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] lg:hidden">
          <SlidersHorizontal className="size-4" strokeWidth={1.5} /> Фільтри {activeCount > 0 && `(${activeCount})`}
        </button>
        <p className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
          {total} {total === 1 ? "товар" : "товарів"} {pending && <Loader2 className="size-3 animate-spin" />}
        </p>
        <label className="flex items-center gap-2 text-xs">
          <span className="hidden text-muted-foreground sm:inline">Сортувати:</span>
          <select
            value={sp.get("sort") ?? "featured"}
            onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
            className="cursor-pointer bg-transparent text-xs font-medium uppercase tracking-[0.1em] outline-none"
            aria-label="Сортування"
          >
            {(Object.keys(SORT_LABELS) as CatalogSort[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 lg:hidden">
        <ActiveFilters facets={facets} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[88vh]">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
            <DialogTitle className="text-xs font-medium uppercase tracking-[0.14em]">Фільтри</DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto px-5">
            <FilterPanel facets={facets} hide={hide} />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={() => update((p) => FILTER_KEYS.forEach((k) => p.delete(k)))}>
              Скинути
            </Button>
            <Button onClick={() => setOpen(false)}>
              {pending ? <Loader2 className="animate-spin" /> : `Показати ${total}`}
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </>
  );
}

export function CatalogSidebar({ facets, hide }: { facets: Facets; hide: { category?: boolean; collection?: boolean } }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <ActiveFilters facets={facets} />
        <FilterPanel facets={facets} hide={hide} />
      </div>
    </aside>
  );
}

export function CatalogGrid({ initial, hasMore: initialHasMore, params, total }: { initial: ProductCardData[]; hasMore: boolean; params: CatalogParams; total: number }) {
  const [items, setItems] = React.useState(initial);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [page, setPage] = React.useState(params.page ?? 1);
  const [loading, setLoading] = React.useState(false);
  const sentinel = React.useRef<HTMLDivElement>(null);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await loadCatalogPage({ ...params, page: page + 1 });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
      });
      setHasMore(res.hasMore);
      setPage(res.page);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, params, page]);

  // Infinite scroll after the first manual "load more" click keeps the footer reachable.
  const [auto, setAuto] = React.useState(false);
  React.useEffect(() => {
    if (!auto || !sentinel.current) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [auto, loadMore]);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-display text-2xl">Нічого не знайдено</p>
        <p className="max-w-sm text-sm text-muted-foreground">Спробуйте змінити або скинути фільтри.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:gap-x-4 xl:grid-cols-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} preferColors={params.colors} />
        ))}
      </div>
      <div ref={sentinel} className="mt-14 flex flex-col items-center gap-4">
        <p className="text-xs text-muted-foreground">
          Показано {items.length} з {total}
        </p>
        <div className="h-px w-48 bg-muted">
          <div className="h-full bg-foreground" style={{ width: `${Math.min(100, (items.length / Math.max(total, 1)) * 100)}%` }} />
        </div>
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => {
              setAuto(true);
              void loadMore();
            }}
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />} Завантажити ще
          </Button>
        )}
      </div>
    </div>
  );
}
