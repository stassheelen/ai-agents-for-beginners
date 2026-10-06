"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Ruler, RotateCcw, Truck } from "lucide-react";
import type { ProductDetail as ProductData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Dialog, DialogContent, DialogTitle } from "@/components/ui/overlay";
import { cn, sortSizes } from "@/lib/utils";
import { useStore } from "./store-context";
import { Price, Stars } from "./price";
import { ColorSwatches, SizeSelector, stockLabel } from "./variant-picker";
import { WishlistButton } from "./wishlist-button";
import { BackButton } from "./back-button";

function Text({ value }: { value: string }) {
  return <div className="whitespace-pre-line">{value}</div>;
}

export function ProductDetailView({
  product,
  sizeGuide,
  deliveryInfo,
  returnsInfo,
}: {
  product: ProductData;
  sizeGuide: string | null;
  deliveryInfo: string | null;
  returnsInfo: string | null;
}) {
  const { add, pending } = useStore();
  const router = useRouter();
  const colors = React.useMemo(() => {
    const m = new Map<string, { name: string; hex: string }>();
    for (const v of product.variants) if (v.color) m.set(v.color.name, { name: v.color.name, hex: v.color.hex });
    return [...m.values()];
  }, [product.variants]);
  const sizes = React.useMemo(() => sortSizes([...new Set(product.variants.map((v) => v.size).filter((s): s is string => Boolean(s)))]), [product.variants]);
  const initialColor = product.variants.find((v) => v.stock > 0)?.color?.name ?? colors[0]?.name ?? null;
  const [color, setColor] = React.useState<string | null>(initialColor);
  const [size, setSize] = React.useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [sizeGuideOpen, setSizeGuideOpen] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const [slide, setSlide] = React.useState(0);
  const addRef = React.useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = React.useState(false);

  const pickerVariants = product.variants.map((v) => ({ id: v.id, color: v.color?.name ?? null, size: v.size, stock: v.stock }));
  const variant = product.variants.find((v) => (colors.length ? v.color?.name === color : true) && (sizes.length ? v.size === size : true));
  const images = React.useMemo(() => {
    const own = product.images.filter((i) => !color || !i.colorName || i.colorName === color);
    return own.length ? own : product.images;
  }, [product.images, color]);
  const stock = stockLabel(variant?.stock);
  const price = variant?.price ?? product.price;
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;
  const colorAvailable = !color || product.variants.some((v) => v.color?.name === color && v.stock > 0);

  React.useEffect(() => {
    // recently viewed (per-browser convenience only)
    try {
      const key = "nf_recent";
      const ids: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([product.id, ...ids.filter((i) => i !== product.id)].slice(0, 12)));
    } catch {}
  }, [product.id]);

  React.useEffect(() => {
    const el = addRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const needsSize = sizes.length > 1 && !size;

  const onAdd = async (buyNow = false) => {
    setAttempted(true);
    if (!variant || needsSize) {
      addRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (buyNow) setBuying(true);
    const ok = await add(variant.id, 1, { openCart: !buyNow });
    if (ok && buyNow) router.push("/checkout");
    else setBuying(false);
  };

  const collection = product.collections[0]?.collection;
  const sections = [
    { key: "description", title: "Опис", content: product.description },
    { key: "details", title: "Деталі", content: product.details },
    { key: "material", title: "Склад", content: product.material },
    { key: "care", title: "Догляд", content: product.careInstructions },
    { key: "size", title: "Розмірна сітка", content: sizeGuide },
    { key: "delivery", title: "Доставка", content: product.shippingInfo ? `${product.shippingInfo}\n\n${deliveryInfo ?? ""}` : deliveryInfo },
    { key: "returns", title: "Повернення", content: product.returnInfo ? `${product.returnInfo}\n\n${returnsInfo ?? ""}` : returnsInfo },
  ].filter((s) => s.content);

  const backHref = product.subcategory ? `/shop/${product.subcategory.slug}` : product.category ? `/shop/${product.category.slug}` : "/shop";

  return (
    <div className="lg:container-page lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)] lg:gap-12 xl:gap-20">
      {/* Gallery */}
      <div>
        {/* mobile / tablet: swipe carousel */}
        <div className="relative lg:hidden">
          <BackButton fallback={backHref} className="absolute left-3 top-3 z-10" />
          <div
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {images.map((img, i) => (
              <div key={img.id} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-muted md:w-1/2">
                <Image src={img.url} alt={img.alt ?? product.name} fill priority={i === 0} sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
              {images.map((img, i) => (
                <span key={img.id} className={cn("h-0.5 w-5 bg-black/20 transition-colors", i === slide && "bg-black")} />
              ))}
            </div>
          )}
        </div>
        {/* desktop: editorial grid */}
        <div className="hidden grid-cols-2 gap-1 lg:grid">
          {images.map((img, i) => (
            <div key={img.id} className={cn("relative aspect-[4/5] bg-muted", images.length % 2 === 1 && i === 0 && "col-span-2 aspect-[8/7]")}>
              <Image src={img.url} alt={img.alt ?? product.name} fill priority={i < 2} sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="container-page lg:px-0">
        <div className="py-6 lg:sticky lg:top-24 lg:py-0">
          {collection && (
            <Link href={`/collections/${collection.slug}`} className="eyebrow text-muted-foreground hover:text-foreground">
              {collection.name}
            </Link>
          )}
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-medium leading-tight lg:text-[32px]">{product.name}</h1>
            <WishlistButton productId={product.id} className="mt-1 shrink-0 p-1" />
          </div>
          {product.reviewCount > 0 && (
            <a href="#reviews" className="mt-2 flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Stars rating={product.rating} className="text-foreground" /> {product.rating.toFixed(1)} · {product.reviewCount} відгуків
            </a>
          )}
          <div className="mt-4">
            <Price price={price} compareAt={compareAt} currency={product.currency} className="text-lg" showDiscount />
          </div>
          {product.shortDescription && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.shortDescription}</p>}

          <div className="mt-8 space-y-7" ref={addRef}>
            <ColorSwatches colors={colors} value={color} onChange={(c) => { setColor(c); setSlide(0); if (sizes.length > 1) setSize(null); }} />
            <SizeSelector
              sizes={sizes}
              variants={pickerVariants}
              color={colors.length ? color : null}
              value={size}
              onChange={(s) => setSize(s)}
              extra={
                sizeGuide ? (
                  <button onClick={() => setSizeGuideOpen(true)} className="inline-flex items-center gap-1.5 underline underline-offset-4">
                    <Ruler className="size-3.5" strokeWidth={1.5} /> Таблиця розмірів
                  </button>
                ) : null
              }
            />
            {attempted && needsSize && <p className="-mt-4 text-xs text-destructive">Будь ласка, оберіть розмір</p>}
            <p className={cn("text-xs", !colorAvailable ? "text-destructive" : stock?.tone ?? "text-muted-foreground")}>
              {!colorAvailable ? "Цього кольору немає в наявності" : stock ? stock.text : "Оберіть розмір, щоб перевірити наявність"}
            </p>
            <div className="space-y-2.5">
              <Button size="lg" className="w-full" disabled={pending || (variant ? variant.stock <= 0 : !colorAvailable)} onClick={() => onAdd(false)}>
                {pending && !buying && <Loader2 className="animate-spin" />}
                {variant && variant.stock <= 0 ? "Немає в наявності" : "Додати в кошик"}
              </Button>
              <div className="grid grid-cols-[1fr_auto] gap-2.5">
                <Button size="lg" variant="outline" className="w-full" disabled={pending || (variant ? variant.stock <= 0 : !colorAvailable)} onClick={() => onAdd(true)}>
                  {buying && <Loader2 className="animate-spin" />}
                  Купити зараз
                </Button>
                <WishlistButton productId={product.id} className="h-13 border border-border px-4 hover:border-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y border-border py-4 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-2">
                <Truck className="size-4 shrink-0 text-foreground" strokeWidth={1.5} /> Доставка 1–3 дні
              </p>
              <p className="flex items-center gap-2">
                <RotateCcw className="size-4 shrink-0 text-foreground" strokeWidth={1.5} /> Повернення 14 днів
              </p>
            </div>
          </div>

          <Accordion type="multiple" defaultValue={["description"]} className="mt-4">
            {sections.map((s) => (
              <AccordionItem key={s.key} value={s.key}>
                <AccordionTrigger>{s.title}</AccordionTrigger>
                <AccordionContent>
                  <Text value={s.content!} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-4 text-[11px] text-muted-foreground">SKU: {variant?.sku ?? product.sku}</p>
        </div>
      </div>

      {/* Mobile sticky add-to-bag */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 transition-transform duration-300 lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              <Price price={price} compareAt={compareAt} currency={product.currency} /> {color && `· ${color}`} {size && `· ${size}`}
            </p>
          </div>
          <Button onClick={() => onAdd(false)} disabled={pending || Boolean(variant && variant.stock <= 0)} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : needsSize ? "Оберіть розмір" : "Додати в кошик"}
          </Button>
        </div>
      </div>

      <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
        <DialogContent>
          <DialogTitle>Таблиця розмірів</DialogTitle>
          <div className="mt-4 text-sm leading-7">
            <Text value={sizeGuide ?? ""} />
          </div>
          <Link href="/help/size-guide" className="mt-4 inline-block text-xs underline underline-offset-4">
            Як зняти мірки
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
