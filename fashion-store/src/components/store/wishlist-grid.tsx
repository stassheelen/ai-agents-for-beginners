"use client";

import type { ProductCardData } from "@/lib/queries";
import { ProductCard } from "./product-card";
import { useStore } from "./store-context";

/** Hides items as soon as they're removed (optimistic) while the server list stays the source of truth. */
export function WishlistGrid({ products }: { products: ProductCardData[] }) {
  const { wishlist, cartLoaded } = useStore();
  const visible = cartLoaded ? products.filter((p) => wishlist.has(p.id)) : products;
  return (
    <>
      <p className="mt-3 text-sm text-muted-foreground">{visible.length} товарів</p>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:gap-x-4 xl:grid-cols-4">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
