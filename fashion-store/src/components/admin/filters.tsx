"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AdminFilters({
  search,
  selects = [],
}: {
  search?: { placeholder: string };
  selects?: { name: string; label: string; options: { value: string; label: string }[] }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");

  const push = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };

  React.useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    const t = setTimeout(() => push((p) => (q ? p.set("q", q) : p.delete("q"))), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // On phones the selects sit behind a "Фільтри" button so the list starts on the first screen.
  const [open, setOpen] = React.useState(false);
  const active = selects.filter((s) => sp.get(s.name)).length;

  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <div className="flex gap-2 md:contents">
        {search && (
          <div className="relative flex-1 md:w-72 md:flex-none">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={search.placeholder} className="h-9 pl-9" />
          </div>
        )}
        {selects.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex h-9 shrink-0 items-center gap-2 border border-border bg-white px-3 text-xs md:hidden"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.6} /> Фільтри{active > 0 && ` (${active})`}
          </button>
        )}
      </div>
      {selects.map((s) => (
        <NativeSelect
          key={s.name}
          value={sp.get(s.name) ?? ""}
          onChange={(e) => push((p) => (e.target.value ? p.set(s.name, e.target.value) : p.delete(s.name)))}
          className={cn("h-9 md:block md:w-48", !open && "max-md:hidden")}
        >
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      ))}
    </div>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
      <span className="text-muted-foreground">
        Сторінка {page} з {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="border border-border bg-white px-3 py-1.5 hover:border-foreground">
            Назад
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="border border-border bg-white px-3 py-1.5 hover:border-foreground">
            Далі
          </Link>
        )}
      </div>
    </div>
  );
}

/** Secondary page actions: inline on desktop, behind a "Ще" toggle on phones. */
export function MoreActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="h-8 border border-border bg-white px-3 text-xs md:hidden">
        {open ? "Сховати дії" : "Ще дії…"}
      </button>
      <div className={cn("flex w-full flex-col gap-2 md:contents", !open && "max-md:hidden")}>{children}</div>
    </>
  );
}
