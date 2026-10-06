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
import { swatchBackground } from "@/lib/color-names";

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
      <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-muted sm:aspect-[4/5]">
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

        {/* Caption on the photo: frosted-glass panel with name, price, colours and quick add. */}
        <div className="absolute inset-x-1.5 bottom-1.5 flex items-end gap-2 rounded-[10px] border border-white/50 bg-white/55 p-2 pl-2.5 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.35)] backdrop-blur-md backdrop-saturate-150 sm:inset-x-2.5 sm:bottom-2.5 sm:p-2.5 sm:pl-3">
          <div className="min-w-0 flex-1">
            <Link href={`/products/${product.slug}`} className="line-clamp-2 text-[12px] font-medium leading-snug decoration-1 underline-offset-4 hover:underline sm:text-[13px]">
              {product.name}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <Price price={product.price} compareAt={product.compareAtPrice} currency={product.currency} className="text-[12px] sm:text-[13px]" />
              {product.colors.length > 1 && (
                <div className="ml-auto hidden shrink-0 items-center sm:flex">
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
                      className="flex size-5 items-center justify-center rounded-full"
                    >
                      <span
                        className={cn("size-2.5 rounded-full border border-black/15 ring-offset-1 transition-shadow duration-200 hover:ring-1 hover:ring-foreground", swatchImage === c.image && c.image && "ring-1 ring-foreground")}
                        style={{ background: swatchBackground(c.name, c.hex) }}
                      />
                    </button>
                  ))}
                  {product.colors.length > 4 && <span className="pl-0.5 text-[10px] text-muted-foreground">+{product.colors.length - 4}</span>}
                </div>
              )}
            </div>
            {!product.available && <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Немає в наявності</p>}
          </div>
          {product.available && (
            <button
              type="button"
              onClick={() => openQuickAdd(product.id)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-white transition-transform duration-200 hover:scale-105 active:scale-95 sm:size-9"
              aria-label={`Швидко додати ${product.name}`}
            >
              <Plus className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
