"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Search, X } from "lucide-react";
import { searchProductsForPicker } from "@/actions/admin/catalog";
import { Input } from "@/components/ui/input";

export type PickedProduct = { id: string; name: string; sku: string; image: string | null };

export function ProductPicker({ value, onChange }: { value: PickedProduct[]; onChange: (v: PickedProduct[]) => void }) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<PickedProduct[]>([]);
  React.useEffect(() => {
    const t = setTimeout(
      () =>
        searchProductsForPicker(q).then((rows) => setResults(rows.map((r) => ({ id: r.id, name: r.name, sku: r.sku, image: r.images[0]?.url ?? null })))),
      250,
    );
    return () => clearTimeout(t);
  }, [q]);
  const selected = new Set(value.map((v) => v.id));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="border border-border">
        <div className="relative border-b border-border">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук товарів…" className="h-9 border-0 pl-9" />
        </div>
        <ul className="max-h-64 overflow-y-auto">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={selected.has(p.id)} onClick={() => onChange([...value, p])} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40">
                <span className="relative size-8 shrink-0 bg-muted">{p.image && <Image src={p.image} alt="" fill sizes="32px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <Plus className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="border border-border">
        <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">Вибрано: {value.length}</p>
        <ul className="max-h-64 overflow-y-auto">
          {value.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="relative size-8 shrink-0 bg-muted">{p.image && <Image src={p.image} alt="" fill sizes="32px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== p.id))} aria-label="Прибрати" className="p-1 hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
