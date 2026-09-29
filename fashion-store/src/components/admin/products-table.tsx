"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteProducts, duplicateProduct, setProductsFlag, setProductsStatus } from "@/actions/admin/products";
import { Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { Card, EmptyState, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/utils";
import { ProductStatusBadge } from "./status";
import { Pagination } from "./filters";

type Row = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
  image: string | null;
  category: string;
  stock: number;
  variants: number;
  flags: string[];
};

export function ProductsTable({ products, page, pages }: { products: Row[]; page: number; pages: number }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [prevProducts, setPrevProducts] = React.useState(products);
  if (prevProducts !== products) {
    setPrevProducts(products);
    setSelected([]);
  }

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message ?? "Done");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const bulk = async (action: string) => {
    if (!action || !selected.length) return;
    if (action === "delete" && !confirm(`Delete ${selected.length} product(s)? This cannot be undone.`)) return;
    const ids = selected;
    await run(() => {
      switch (action) {
        case "publish":
          return setProductsStatus(ids, "PUBLISHED");
        case "draft":
          return setProductsStatus(ids, "DRAFT");
        case "archive":
          return setProductsStatus(ids, "ARCHIVED");
        case "delete":
          return deleteProducts(ids);
        default: {
          const [flag, v] = action.split(":");
          return setProductsFlag(ids, flag as "featured", v === "1");
        }
      }
    });
  };

  if (!products.length)
    return (
      <Card>
        <EmptyState
          title="No products found"
          description="Try other filters or add your first product."
          action={
            <Button asChild size="sm">
              <Link href="/admin/products/new">Add product</Link>
            </Button>
          }
        />
      </Card>
    );

  return (
    <Card>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
          <span className="text-xs font-medium">{selected.length} selected</span>
          <NativeSelect className="h-8 w-56" value="" onChange={(e) => bulk(e.target.value)} disabled={busy}>
            <option value="">Bulk actions…</option>
            <option value="publish">Publish</option>
            <option value="draft">Move to draft</option>
            <option value="archive">Archive</option>
            <option value="featured:1">Mark featured</option>
            <option value="featured:0">Unmark featured</option>
            <option value="isNew:1">Mark as new</option>
            <option value="isNew:0">Unmark new</option>
            <option value="bestSeller:1">Mark bestseller</option>
            <option value="bestSeller:0">Unmark bestseller</option>
            <option value="onSale:1">Mark sale</option>
            <option value="onSale:0">Unmark sale</option>
            <option value="delete">Delete</option>
          </NativeSelect>
        </div>
      )}
      <Table>
        <THead>
          <tr>
            <TH className="w-10">
              <Checkbox
                checked={selected.length === products.length ? true : selected.length ? "indeterminate" : false}
                onCheckedChange={(v) => setSelected(v ? products.map((p) => p.id) : [])}
                aria-label="Select all"
              />
            </TH>
            <TH className="w-14">Image</TH>
            <TH>Product</TH>
            <TH>SKU</TH>
            <TH>Category</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Stock</TH>
            <TH>Status</TH>
            <TH>Created</TH>
            <TH className="w-12" />
          </tr>
        </THead>
        <tbody>
          {products.map((p) => (
            <TR key={p.id}>
              <TD>
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} aria-label={`Select ${p.name}`} />
              </TD>
              <TD>
                <div className="relative size-11 bg-muted">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</div>
              </TD>
              <TD>
                <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                {p.flags.length > 0 && <p className="mt-0.5 text-[11px] text-muted-foreground">{p.flags.join(" · ")}</p>}
              </TD>
              <TD className="font-mono text-[12px] text-muted-foreground">{p.sku}</TD>
              <TD className="text-muted-foreground">{p.category || "—"}</TD>
              <TD className="text-right">{formatMoney(p.price, p.currency)}</TD>
              <TD className="text-right">
                <span className={p.stock === 0 ? "text-destructive" : p.stock <= 5 ? "text-[#9a6200]" : ""}>{p.stock}</span>
                <span className="block text-[11px] text-muted-foreground">{p.variants} var.</span>
              </TD>
              <TD>
                <ProductStatusBadge status={p.status} />
              </TD>
              <TD className="whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</TD>
              <TD>
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 hover:bg-muted" aria-label="Actions">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => router.push(`/admin/products/${p.id}`)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(async () => {
                          const r = await duplicateProduct(p.id);
                          if (r.ok && r.data) router.push(`/admin/products/${r.data.id}`);
                          return r;
                        })
                      }
                    >
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    {p.status === "PUBLISHED" ? (
                      <DropdownMenuItem onSelect={() => run(() => setProductsStatus([p.id], "DRAFT"))}>
                        <EyeOff /> Unpublish
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => run(() => setProductsStatus([p.id], "PUBLISHED"))}>
                        <Eye /> Publish
                      </DropdownMenuItem>
                    )}
                    {p.status === "PUBLISHED" && (
                      <DropdownMenuItem onSelect={() => window.open(`/products/${p.slug}`, "_blank")}>
                        <ExternalLink /> View in store
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={() => confirm(`Delete “${p.name}”?`) && run(() => deleteProducts([p.id]))}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} pages={pages} />
    </Card>
  );
}
