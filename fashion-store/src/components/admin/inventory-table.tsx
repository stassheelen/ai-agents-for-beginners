"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { updateVariantStock } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { ProductStatusBadge } from "./status";
import { useAdminAction } from "./use-action";

type V = { id: string; sku: string; size: string | null; stock: number; color: { name: string; hex: string } | null; productId: string; productName: string; status: string };

export function InventoryTable({ variants, lowThreshold }: { variants: V[]; lowThreshold: number }) {
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const { run, pending } = useAdminAction();
  const [prevVariants, setPrevVariants] = React.useState(variants);
  if (prevVariants !== variants) {
    setPrevVariants(variants);
    setEdits({});
  }
  const changed = Object.entries(edits).filter(([id, v]) => v !== "" && Number(v) !== variants.find((x) => x.id === id)?.stock);
  if (!variants.length) return <Card><EmptyState title="No variants" /></Card>;
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{changed.length ? `${changed.length} unsaved change(s)` : "Edit stock inline, then save"}</span>
        <Button size="sm" disabled={!changed.length || pending} onClick={() => run(() => updateVariantStock(changed.map(([id, v]) => ({ id, stock: Number(v) }))))}>
          <Save /> Save stock
        </Button>
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            <TH>SKU</TH>
            <TH>Color</TH>
            <TH>Size</TH>
            <TH>Status</TH>
            <TH className="w-44">Stock</TH>
          </tr>
        </THead>
        <tbody>
          {variants.map((v) => {
            const val = edits[v.id] ?? String(v.stock);
            const n = Number(val);
            return (
              <TR key={v.id}>
                <TD>
                  <Link href={`/admin/products/${v.productId}`} className="hover:underline">
                    {v.productName}
                  </Link>
                </TD>
                <TD className="font-mono text-xs">{v.sku}</TD>
                <TD>
                  {v.color && (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-3 rounded-full border border-black/15" style={{ background: v.color.hex }} /> {v.color.name}
                    </span>
                  )}
                </TD>
                <TD>{v.size}</TD>
                <TD>
                  <ProductStatusBadge status={v.status} />
                </TD>
                <TD>
                  <div className="flex items-center gap-1">
                    <button type="button" className="h-8 w-8 border border-border hover:border-foreground" onClick={() => setEdits({ ...edits, [v.id]: String(Math.max(0, n - 1)) })} aria-label="Decrease">
                      −
                    </button>
                    <Input
                      value={val}
                      onChange={(e) => setEdits({ ...edits, [v.id]: e.target.value.replace(/\D/g, "") })}
                      className={cn("h-8 w-16 text-center", n === 0 && "text-destructive", n > 0 && n <= lowThreshold && "text-[#9a6200]", edits[v.id] !== undefined && n !== v.stock && "border-foreground")}
                      inputMode="numeric"
                      aria-label="Stock"
                    />
                    <button type="button" className="h-8 w-8 border border-border hover:border-foreground" onClick={() => setEdits({ ...edits, [v.id]: String(n + 1) })} aria-label="Increase">
                      +
                    </button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
