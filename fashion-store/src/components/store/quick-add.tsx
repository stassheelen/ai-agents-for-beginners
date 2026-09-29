"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { getQuickAddProduct, type QuickAddProduct } from "@/actions/catalog";
import { useStore } from "./store-context";
import { Price } from "./price";
import { ColorSwatches, SizeSelector, stockLabel } from "./variant-picker";
import { useMediaQuery } from "./use-media-query";

export function QuickAdd() {
  const { quickAddId, openQuickAdd, add, pending } = useStore();
  const [loaded, setLoaded] = React.useState<{ id: string; product: QuickAddProduct | null } | null>(null);
  const [color, setColor] = React.useState<string | null>(null);
  const [size, setSize] = React.useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const loading = Boolean(quickAddId) && loaded?.id !== quickAddId;
  const product = loaded?.id === quickAddId ? loaded.product : null;

  React.useEffect(() => {
    if (!quickAddId) return;
    let alive = true;
    getQuickAddProduct(quickAddId).then((p) => {
      if (!alive) return;
      const firstInStock = p?.variants.find((v) => v.stock > 0);
      setColor(firstInStock?.color ?? p?.colors[0]?.name ?? null);
      setSize(p && p.sizes.length === 1 ? p.sizes[0] : null);
      setLoaded({ id: quickAddId, product: p });
    });
    return () => {
      alive = false;
    };
  }, [quickAddId]);

  const variant = product?.variants.find((v) => (product.colors.length ? v.color === color : true) && (product.sizes.length ? v.size === size : true));
  const images = product ? product.images.filter((i) => !color || !i.colorName || i.colorName === color) : [];
  const stock = stockLabel(variant?.stock);

  const onAdd = async () => {
    if (!variant) return;
    const ok = await add(variant.id, 1);
    if (ok) openQuickAdd(null);
  };

  return (
    <Dialog open={Boolean(quickAddId)} onOpenChange={(o) => !o && openQuickAdd(null)}>
      <SheetContent side={isDesktop ? "right" : "bottom"} className="overflow-y-auto">
        <DialogTitle className="sr-only">Швидке додавання</DialogTitle>
        {loading || !product ? (
          <div className="space-y-4 p-6">
            {loading ? (
              <>
                <Skeleton className="aspect-[4/5] w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-11 w-full" />
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Товар недоступний.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto pt-12 lg:pt-14">
              {images.slice(0, 4).map((img, i) => (
                <div key={img.url + i} className="relative aspect-[4/5] w-[62%] shrink-0 snap-start bg-muted first:ml-5 last:mr-5 lg:w-[70%]">
                  <Image src={img.url} alt={img.alt ?? product.name} fill sizes="(min-width:1024px) 320px, 60vw" className="object-cover" />
                </div>
              ))}
            </div>
            <div className="space-y-6 p-5 lg:p-6">
              <div>
                <h2 className="font-display text-xl">{product.name}</h2>
                <Price price={variant?.price ?? product.price} compareAt={product.compareAtPrice} currency={product.currency} className="mt-1 text-sm" showDiscount />
              </div>
              <ColorSwatches colors={product.colors} value={color} onChange={(c) => { setColor(c); setSize(product.sizes.length === 1 ? product.sizes[0] : null); }} />
              <SizeSelector sizes={product.sizes} variants={product.variants} color={product.colors.length ? color : null} value={size} onChange={setSize} />
              {stock && <p className={`text-xs ${stock.tone}`}>{stock.text}</p>}
              <div className="space-y-3">
                <Button className="w-full" size="lg" disabled={!variant || variant.stock <= 0 || pending} onClick={onAdd}>
                  {pending && <Loader2 className="animate-spin" />}
                  {!size && product.sizes.length > 1 ? "Оберіть розмір" : "Add to bag"}
                </Button>
                <Link href={`/products/${product.slug}`} className="block text-center text-xs underline underline-offset-4" onClick={() => openQuickAdd(null)}>
                  Детальніше про товар
                </Link>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Dialog>
  );
}
