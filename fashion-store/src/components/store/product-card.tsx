"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { ProductCardData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { WishlistButton } from "./wishlist-button";
import { useStore } from "./store-context";

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw",
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
  const badges = [
    product.isNew && { label: "Новинка", tone: "light" },
    product.bestSeller && { label: "Бестселер", tone: "dark" },
    product.onSale && { label: "Знижка", tone: "sale" },
  ].filter(Boolean) as { label: string; tone: "light" | "dark" | "sale" }[];
  const shownColor = (swatchImage && product.colors.find((c) => c.image === swatchImage)) || product.colors[0];

  return (
    <article className="group/card relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-muted">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 overflow-hidden" aria-label={product.name}>
          <div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] lg:group-hover/card:scale-[1.03]">
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
          </div>
        </Link>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1 sm:left-3.5 sm:top-3.5">
            {badges.slice(0, 2).map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[9px] font-medium uppercase leading-none tracking-[0.14em] sm:text-[10px]",
                  b.tone === "dark" ? "bg-foreground/85 text-white backdrop-blur-sm" : "bg-white/90 text-foreground backdrop-blur-sm",
                  b.tone === "sale" && "text-destructive",
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        <WishlistButton
          productId={product.id}
          className="absolute right-1.5 top-1.5 size-10 justify-center rounded-full bg-white/0 transition-[background-color,transform] duration-300 hover:scale-105 active:scale-90 group-hover/card:bg-white/85 focus-visible:bg-white/85 sm:right-2 sm:top-2"
        />

        {product.available ? (
          <button
            type="button"
            onClick={() => openQuickAdd(product.id)}
            className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-[opacity,transform,background-color] duration-300 ease-out hover:bg-white active:scale-95 lg:inset-x-3 lg:bottom-3 lg:h-11 lg:w-auto lg:translate-y-2 lg:rounded-full lg:opacity-0 lg:group-hover/card:translate-y-0 lg:group-hover/card:opacity-100 lg:focus-visible:translate-y-0 lg:focus-visible:opacity-100"
            aria-label={`Швидко додати ${product.name}`}
          >
            <Plus className="size-4 lg:hidden" strokeWidth={1.5} />
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] lg:inline">Швидко додати</span>
          </button>
        ) : (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/90 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:inset-x-3 lg:bottom-3">
            Немає в наявності
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3.5 text-[13px] leading-snug sm:text-sm">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium decoration-1 underline-offset-4 hover:underline">
          {product.name}
        </Link>
        <div className="mt-0.5 flex min-h-5 items-center gap-2 text-[12px] text-muted-foreground sm:text-[13px]">
          {shownColor && <span className="truncate">{shownColor.name}</span>}
          {product.colors.length > 1 && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {product.colors.slice(0, 4).map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  title={c.name}
                  aria-label={`Колір: ${c.name}`}
                  aria-pressed={shownColor?.slug === c.slug && Boolean(swatchImage)}
                  onMouseEnter={() => c.image && setSwatchImage(c.image)}
                  onMouseLeave={() => setSwatchImage(null)}
                  onClick={() => c.image && setSwatchImage((cur) => (cur === c.image ? null : c.image))}
                  className="flex size-6 items-center justify-center rounded-full"
                >
                  <span
                    className={cn("size-3 rounded-full border border-black/15 ring-offset-1 transition-shadow duration-200 hover:ring-1 hover:ring-foreground", swatchImage === c.image && c.image && "ring-1 ring-foreground")}
                    style={{ background: c.hex }}
                  />
                </button>
              ))}
              {product.colors.length > 4 && <span className="text-[11px]">+{product.colors.length - 4}</span>}
            </div>
          )}
        </div>
        <Price price={product.price} compareAt={product.compareAtPrice} currency={product.currency} className="mt-1.5 text-[13px] sm:text-sm" />
      </div>
    </article>
  );
}
