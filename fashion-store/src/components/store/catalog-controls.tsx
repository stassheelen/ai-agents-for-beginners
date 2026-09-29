"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover as P, DropdownMenu as M } from "radix-ui";
import { Check, ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Checkbox, Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { loadCatalogPage } from "@/actions/catalog";
import type { CatalogParams, CatalogSort, ProductCardData } from "@/lib/queries";
import { SORT_LABELS } from "@/lib/catalog-params";
import { cn, formatMoney, pluralUk } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { useReveal } from "./use-reveal";

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

type Hide = { category?: boolean; collection?: boolean };
type GroupKey = "category" | "size" | "color" | "price" | "collection";

const GROUP_LABELS: Record<GroupKey, string> = { category: "Категорія", size: "Розмір", color: "Колір", price: "Ціна", collection: "Колекція" };

function visibleGroups(facets: Facets, hide: Hide): GroupKey[] {
  const groups: GroupKey[] = ["category", "size", "color", "price", "collection"];
  return groups.filter(
    (g) =>
      !(g === "category" && (hide.category || !facets.categories.length)) &&
      !(g === "collection" && (hide.collection || !facets.collections.length)) &&
      !(g === "size" && !facets.sizes.length) &&
      !(g === "color" && !facets.colors.length),
  );
}

function useSelected() {
  const { sp, update, pending } = useUpdateParams();
  const selected = (key: string) => (sp.get(key)?.split(",") ?? []).filter(Boolean);
  return { sp, update, pending, selected };
}

function selectedCount(sp: URLSearchParams, g: GroupKey) {
  if (g === "price") return sp.get("min") || sp.get("max") ? 1 : 0;
  return (sp.get(g)?.split(",") ?? []).filter(Boolean).length;
}

function CheckList({ name, options }: { name: "category" | "collection"; options: { name: string; slug: string }[] }) {
  const { update, selected } = useSelected();
  return (
    <div className="space-y-1">
      {options.map((c) => (
        <label key={c.slug} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm transition-colors duration-200 hover:bg-soft">
          <Checkbox checked={selected(name).includes(c.slug)} onCheckedChange={() => update((p) => toggleValue(p, name, c.slug))} />
          {c.name}
        </label>
      ))}
    </div>
  );
}

function SizeOptions({ facets }: { facets: Facets }) {
  const { update, selected } = useSelected();
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {facets.sizes.map((s) => {
        const on = selected("size").includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => update((p) => toggleValue(p, "size", s))}
            aria-pressed={on}
            className={cn(
              "h-11 rounded-md border text-xs font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95",
              on ? "border-foreground bg-foreground text-white" : "border-border text-foreground hover:border-foreground",
              s.length > 4 && "col-span-2",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

function ColorOptions({ facets }: { facets: Facets }) {
  const { update, selected } = useSelected();
  return (
    <div className="grid grid-cols-2 gap-1">
      {facets.colors.map((c) => {
        const on = selected("color").includes(c.slug);
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => update((p) => toggleValue(p, "color", c.slug))}
            aria-pressed={on}
            className="flex min-h-10 items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors duration-200 hover:bg-soft"
          >
            <span className={cn("size-5 shrink-0 rounded-full border border-black/15 ring-offset-2 transition-shadow duration-200", on && "ring-1 ring-foreground")} style={{ background: c.hex }} />
            <span className={cn(on && "font-medium")}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PriceOptions({ facets, onApplied }: { facets: Facets; onApplied?: () => void }) {
  const { sp, update } = useSelected();
  const [min, setMin] = React.useState(sp.get("min") ?? "");
  const [max, setMax] = React.useState(sp.get("max") ?? "");
  const [prevSp, setPrevSp] = React.useState(sp);
  if (prevSp !== sp) {
    setPrevSp(sp);
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }
  const input = "h-11 w-full rounded-md border border-border px-3 text-sm text-foreground outline-none transition-colors duration-200 focus:border-foreground";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update((p) => {
          if (min) p.set("min", min);
          else p.delete("min");
          if (max) p.set("max", max);
          else p.delete("max");
        });
        onApplied?.();
      }}
    >
      <div className="flex items-center gap-2">
        <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`від ${Math.floor(facets.minPrice / 100)}`} className={input} aria-label="Мінімальна ціна" />
        <span className="text-muted-foreground">—</span>
        <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`до ${Math.ceil(facets.maxPrice / 100)}`} className={input} aria-label="Максимальна ціна" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatMoney(facets.minPrice)} — {formatMoney(facets.maxPrice)}
      </p>
      <Button type="submit" size="sm" className="mt-3 h-10 w-full">
        Застосувати
      </Button>
    </form>
  );
}

function GroupBody({ group, facets, onApplied }: { group: GroupKey; facets: Facets; onApplied?: () => void }) {
  if (group === "category") return <CheckList name="category" options={facets.categories} />;
  if (group === "collection") return <CheckList name="collection" options={facets.collections} />;
  if (group === "size") return <SizeOptions facets={facets} />;
  if (group === "color") return <ColorOptions facets={facets} />;
  return <PriceOptions facets={facets} onApplied={onApplied} />;
}

function StockToggle({ className }: { className?: string }) {
  const { sp, update } = useSelected();
  const on = sp.get("stock") === "1";
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-3 text-sm", className)}>
      <Checkbox checked={on} onCheckedChange={(v) => update((p) => (v ? p.set("stock", "1") : p.delete("stock")))} />
      Лише в наявності
    </label>
  );
}

/** Mobile sheet: every group as an accordion section. */
function FilterPanel({ facets, hide }: { facets: Facets; hide: Hide }) {
  const groups = visibleGroups(facets, hide);
  return (
    <Accordion type="multiple" defaultValue={["category", "size", "color"]} className="w-full">
      {groups.map((g) => (
        <AccordionItem key={g} value={g}>
          <AccordionTrigger>{GROUP_LABELS[g]}</AccordionTrigger>
          <AccordionContent className="text-foreground">
            <GroupBody group={g} facets={facets} />
          </AccordionContent>
        </AccordionItem>
      ))}
      <AccordionItem value="availability">
        <AccordionTrigger>Наявність</AccordionTrigger>
        <AccordionContent className="text-foreground">
          <StockToggle />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const toolbarTrigger =
  "group inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-[background-color,color] duration-200 hover:bg-black/[0.04] data-[state=open]:bg-black/[0.05] lg:max-xl:gap-1.5 lg:max-xl:px-2.5 lg:max-xl:tracking-[0.14em]";
const popoverPanel =
  "z-50 rounded-lg border border-border bg-white p-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.22)] outline-none data-[state=closed]:animate-dropdown-out data-[state=open]:animate-dropdown-in";

function FilterDropdown({ group, facets }: { group: GroupKey; facets: Facets }) {
  const { sp } = useSelected();
  const [open, setOpen] = React.useState(false);
  const count = selectedCount(sp, group);
  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger className={cn(toolbarTrigger, count > 0 && "text-foreground")}>
        {GROUP_LABELS[group]}
        {count > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] tracking-normal text-white">{count}</span>}
        <ChevronDown className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180" strokeWidth={1.5} />
      </P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={8} collisionPadding={16} className={cn(popoverPanel, group === "size" ? "w-72" : group === "price" ? "w-80" : "w-64", "max-h-[60vh] overflow-y-auto")}>
          <GroupBody group={group} facets={facets} onApplied={() => setOpen(false)} />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

function SortMenu() {
  const { sp, update } = useSelected();
  const value = (sp.get("sort") ?? "featured") as CatalogSort;
  return (
    <M.Root>
      <M.Trigger className={cn(toolbarTrigger, "-mr-3.5 gap-2.5")} aria-label={`Сортувати: ${SORT_LABELS[value]}`}>
        <span className="hidden font-normal normal-case tracking-normal text-muted-foreground sm:inline lg:max-xl:hidden">Сортувати:</span>
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180" strokeWidth={1.5} />
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={8} collisionPadding={16} className={cn(popoverPanel, "min-w-60 p-1.5")}>
          <M.RadioGroup value={value} onValueChange={(v) => update((p) => (v === "featured" ? p.delete("sort") : p.set("sort", v)))}>
            {(Object.keys(SORT_LABELS) as CatalogSort[]).map((k) => (
              <M.RadioItem
                key={k}
                value={k}
                className="flex min-h-10 cursor-pointer select-none items-center justify-between gap-6 rounded-md px-3 text-sm outline-none transition-colors duration-150 data-[highlighted]:bg-soft data-[state=checked]:font-medium"
              >
                {SORT_LABELS[k]}
                <M.ItemIndicator>
                  <Check className="size-4" strokeWidth={1.5} />
                </M.ItemIndicator>
              </M.RadioItem>
            ))}
          </M.RadioGroup>
        </M.Content>
      </M.Portal>
    </M.Root>
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
              : key === "size"
                ? `Розмір ${v}`
                : v;
      chips.push({ key, value: v, label });
    }
  }
  if (sp.get("min") || sp.get("max")) chips.push({ key: "price", value: "", label: `${sp.get("min") ?? 0} — ${sp.get("max") ?? "∞"} ₴` });
  if (sp.get("stock") === "1") chips.push({ key: "stock", value: "", label: "В наявності" });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in">
      {chips.map((c) => (
        <button
          key={c.key + c.value}
          type="button"
          onClick={() =>
            update((p) => {
              if (c.key === "price") {
                p.delete("min");
                p.delete("max");
              } else if (c.key === "stock") p.delete("stock");
              else toggleValue(p, c.key, c.value);
            })
          }
          aria-label={`Прибрати фільтр ${c.label}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs text-white transition-[opacity,transform] duration-200 hover:opacity-85 active:scale-95"
        >
          {c.label} <X className="size-3" />
        </button>
      ))}
      <button type="button" onClick={() => update((p) => FILTER_KEYS.forEach((k) => p.delete(k)))} className="h-9 px-2 text-xs underline underline-offset-4 transition-opacity hover:opacity-70">
        Скинути все
      </button>
    </div>
  );
}

export function CatalogToolbar({ total, facets, hide }: { total: number; facets: Facets; hide: Hide }) {
  const { sp, update, pending } = useUpdateParams();
  const [open, setOpen] = React.useState(false);
  const activeCount = FILTER_KEYS.filter((k) => sp.get(k)).length;
  const groups = visibleGroups(facets, hide);
  const stockOn = sp.get("stock") === "1";
  const countLabel = (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
      {total} {pluralUk(total, ["товар", "товари", "товарів"])}
      {pending && <Loader2 className="size-3 animate-spin" />}
    </span>
  );
  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 border-b border-border/70 bg-white px-4 md:-mx-6 md:px-6 lg:top-16 lg:mx-0 lg:px-0">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" onClick={() => setOpen(true)} className={cn(toolbarTrigger, "-ml-3.5")}>
              <SlidersHorizontal className="size-4" strokeWidth={1.5} /> Фільтри
              {activeCount > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] tracking-normal text-white">{activeCount}</span>}
            </button>
            {countLabel}
          </div>
          {/* Desktop */}
          <div className="hidden min-w-0 items-center gap-1 lg:flex">
            <div className="-ml-3.5 flex items-center gap-0.5">
              {groups.map((g) => (
                <FilterDropdown key={g} group={g} facets={facets} />
              ))}
              <button
                type="button"
                aria-pressed={stockOn}
                onClick={() => update((p) => (stockOn ? p.delete("stock") : p.set("stock", "1")))}
                className={cn(toolbarTrigger, stockOn && "bg-foreground text-white hover:bg-foreground/85")}
              >
                В наявності
              </button>
            </div>
            <span className="ml-4 whitespace-nowrap xl:ml-6">{countLabel}</span>
          </div>
          <SortMenu />
        </div>
      </div>
      <div className="mt-4 empty:hidden">
        <ActiveFilters facets={facets} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-2xl">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
            <DialogTitle className="text-xs font-medium uppercase tracking-[0.14em]">Фільтри</DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto px-5">
            <FilterPanel facets={facets} hide={hide} />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
            <Button variant="outline" className="h-12" onClick={() => update((p) => FILTER_KEYS.forEach((k) => p.delete(k)))}>
              Скинути
            </Button>
            <Button className="h-12" onClick={() => setOpen(false)}>
              {pending ? <Loader2 className="animate-spin" /> : `Показати ${total}`}
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </>
  );
}

export function CatalogGrid({ initial, hasMore: initialHasMore, params, total }: { initial: ProductCardData[]; hasMore: boolean; params: CatalogParams; total: number }) {
  const [items, setItems] = React.useState(initial);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [page, setPage] = React.useState(params.page ?? 1);
  const [loading, setLoading] = React.useState(false);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const gridRef = useReveal<HTMLDivElement>(items.length);

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
      <div ref={gridRef} className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-14">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} preferColors={params.colors} sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" />
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
