"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { ProductCardData } from "@/lib/queries";
import { cn, pluralUk } from "@/lib/utils";
import { Price, Stars } from "./price";
import { WishlistButton } from "./wishlist-button";
import { useStore } from "./store-context";

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw",
  preferColors,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  preferColors?: string[];
}) {
  const { openQuickAdd } = useStore();
  const preferred = preferColors?.length ? product.colors.find((c) => preferColors.includes(c.slug))?.image ?? null : null;
  const [hoverImage, setSwatchImage] = React.useState<string | null>(null);
  const swatchImage = hoverImage ?? preferred;
  const primary = swatchImage ?? product.images[0]?.url;
  const secondary = swatchImage ? null : product.images[1]?.url;
  const badges = [product.isNew && "New", product.bestSeller && "Bestseller", product.onSale && "Sale"].filter(Boolean) as string[];

  return (
    <article className="group/card relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Link href={`/products/${product.slug}`} className="absolute inset-0" aria-label={product.name}>
          {primary && (
            <Image
              src={primary}
              alt={product.images[0]?.alt ?? product.name}
              fill
              sizes={sizes}
              priority={priority}
              className={cn("object-cover transition-opacity duration-500", secondary && "lg:group-hover/card:opacity-0")}
            />
          )}
          {secondary && (
            <Image src={secondary} alt="" fill sizes={sizes} className="hidden object-cover opacity-0 transition-opacity duration-500 lg:block lg:group-hover/card:opacity-100" />
          )}
        </Link>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            {badges.slice(0, 2).map((b) => (
              <span key={b} className={cn("bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] sm:text-[10px]", b === "Sale" && "text-destructive")}>
                {b}
              </span>
            ))}
          </div>
        )}

        <WishlistButton productId={product.id} className="absolute right-1.5 top-1.5 p-1.5 sm:right-2 sm:top-2" />

        {product.available ? (
          <button
            type="button"
            onClick={() => openQuickAdd(product.id)}
            className="absolute bottom-2 right-2 flex size-9 items-center justify-center bg-white/95 transition-all lg:inset-x-3 lg:bottom-3 lg:h-10 lg:w-auto lg:translate-y-2 lg:opacity-0 lg:group-hover/card:translate-y-0 lg:group-hover/card:opacity-100 lg:focus-visible:translate-y-0 lg:focus-visible:opacity-100"
            aria-label={`Швидко додати ${product.name}`}
          >
            <Plus className="size-4 lg:hidden" strokeWidth={1.5} />
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] lg:inline">Quick add</span>
          </button>
        ) : (
          <span className="absolute inset-x-2 bottom-2 bg-white/90 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:inset-x-3 lg:bottom-3">
            Немає в наявності
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3 text-[13px] leading-snug">
        {product.label && <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{product.label}</p>}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium hover:underline hover:underline-offset-4">
          {product.name}
        </Link>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Stars rating={product.rating} size={11} className="text-foreground" />
            <span>{product.rating.toFixed(1)}</span>
            <span className="hidden sm:inline">({product.reviewCount})</span>
          </div>
        )}
        <Price price={product.price} compareAt={product.compareAtPrice} currency={product.currency} className="text-[13px]" />
        {product.colors.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            {product.colors.slice(0, 5).map((c) => (
              <button
                key={c.slug}
                type="button"
                title={c.name}
                aria-label={c.name}
                onMouseEnter={() => c.image && setSwatchImage(c.image)}
                onMouseLeave={() => setSwatchImage(null)}
                onClick={() => c.image && setSwatchImage((cur) => (cur === c.image ? null : c.image))}
                className={cn("size-3.5 rounded-full border border-black/15 ring-offset-2 transition-shadow hover:ring-1 hover:ring-foreground", swatchImage === c.image && c.image && "ring-1 ring-foreground")}
                style={{ background: c.hex }}
              />
            ))}
            {product.colors.length > 1 && (
              <span className="ml-1 text-[11px] text-muted-foreground">
                {product.colors.length} {pluralUk(product.colors.length, ["колір", "кольори", "кольорів"])}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
