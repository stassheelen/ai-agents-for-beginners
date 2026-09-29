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
        toast.success(res.message ?? "Готово");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const bulk = async (action: string) => {
    if (!action || !selected.length) return;
    if (action === "delete" && !confirm(`Видалити товари (${selected.length})? Цю дію не можна скасувати.`)) return;
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
          title="Товарів не знайдено"
          description="Змініть фільтри або додайте перший товар."
          action={
            <Button asChild size="sm">
              <Link href="/admin/products/new">Додати товар</Link>
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
            <option value="">Масові дії…</option>
            <option value="publish">Опублікувати</option>
            <option value="draft">У чернетки</option>
            <option value="archive">В архів</option>
            <option value="featured:1">Позначити «Рекомендований»</option>
            <option value="featured:0">Зняти «Рекомендований»</option>
            <option value="isNew:1">Позначити «Новинка»</option>
            <option value="isNew:0">Зняти «Новинка»</option>
            <option value="bestSeller:1">Позначити «Бестселер»</option>
            <option value="bestSeller:0">Зняти «Бестселер»</option>
            <option value="onSale:1">Позначити «Знижка»</option>
            <option value="onSale:0">Зняти «Знижка»</option>
            <option value="delete">Видалити</option>
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
                aria-label="Вибрати всі"
              />
            </TH>
            <TH className="w-14">Фото</TH>
            <TH>Товар</TH>
            <TH>Артикул</TH>
            <TH>Категорія</TH>
            <TH className="text-right">Ціна</TH>
            <TH className="text-right">Залишок</TH>
            <TH>Статус</TH>
            <TH>Створено</TH>
            <TH className="w-12" />
          </tr>
        </THead>
        <tbody>
          {products.map((p) => (
            <TR key={p.id}>
              <TD>
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} aria-label={`Вибрати ${p.name}`} />
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
                <span className="block text-[11px] text-muted-foreground">{p.variants} вар.</span>
              </TD>
              <TD>
                <ProductStatusBadge status={p.status} />
              </TD>
              <TD className="whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</TD>
              <TD>
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 hover:bg-muted" aria-label="Дії">
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => router.push(`/admin/products/${p.id}`)}>
                      <Pencil /> Редагувати
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
                      <Copy /> Дублювати
                    </DropdownMenuItem>
                    {p.status === "PUBLISHED" ? (
                      <DropdownMenuItem onSelect={() => run(() => setProductsStatus([p.id], "DRAFT"))}>
                        <EyeOff /> Зняти з публікації
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => run(() => setProductsStatus([p.id], "PUBLISHED"))}>
                        <Eye /> Опублікувати
                      </DropdownMenuItem>
                    )}
                    {p.status === "PUBLISHED" && (
                      <DropdownMenuItem onSelect={() => window.open(`/products/${p.slug}`, "_blank")}>
                        <ExternalLink /> Переглянути в магазині
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={() => confirm(`Видалити «${p.name}»?`) && run(() => deleteProducts([p.id]))}>
                      <Trash2 /> Видалити
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
