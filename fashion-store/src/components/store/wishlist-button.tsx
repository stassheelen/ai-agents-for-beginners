"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "./store-context";

export function WishlistButton({ productId, className, withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWishlist } = useStore();
  const active = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleWishlist(productId);
      }}
      aria-pressed={active}
      aria-label={active ? "Видалити зі списку бажань" : "Додати до списку бажань"}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Heart className={cn("size-[18px] transition-colors", active && "fill-foreground")} strokeWidth={1.5} />
      {withLabel && <span className="text-xs font-medium uppercase tracking-[0.12em]">{active ? "У списку бажань" : "В обране"}</span>}
    </button>
  );
}
