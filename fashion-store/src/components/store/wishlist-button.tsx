"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "./store-context";

export function WishlistButton({ productId, className, withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWishlist } = useStore();
  const active = wishlist.has(productId);
  // Animate only on the user's own toggle, not when the saved wishlist hydrates.
  const [bump, setBump] = React.useState(0);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setBump((b) => b + 1);
        void toggleWishlist(productId);
      }}
      aria-pressed={active}
      aria-label={active ? "Видалити зі списку бажань" : "Додати до списку бажань"}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Heart key={bump} className={cn("size-[18px] transition-colors duration-200", bump > 0 && "animate-pop", active && "fill-foreground")} strokeWidth={1.5} />
      {withLabel && <span className="text-xs font-medium uppercase tracking-[0.12em]">{active ? "У списку бажань" : "В обране"}</span>}
    </button>
  );
}
