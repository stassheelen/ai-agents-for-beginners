"use client";

import * as React from "react";
import { toast } from "sonner";
import { addToCart, getCart, removeCartItem, updateCartItem, type CartView } from "@/actions/cart";
import { getWishlistIds, toggleWishlist as toggleWishlistAction } from "@/actions/wishlist";

type StoreCtx = {
  cart: CartView;
  cartLoaded: boolean;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  add: (variantId: string, qty?: number, opts?: { openCart?: boolean }) => Promise<boolean>;
  update: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  pending: boolean;
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  quickAddId: string | null;
  openQuickAdd: (productId: string | null) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
};

const Ctx = React.createContext<StoreCtx | null>(null);

export function useStore() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

const EMPTY: CartView = { items: [], count: 0, subtotal: 0 };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartView>(EMPTY);
  const [cartLoaded, setCartLoaded] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [wishlist, setWishlist] = React.useState<Set<string>>(new Set());
  const [quickAddId, setQuickAddId] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    Promise.all([getCart(), getWishlistIds()])
      .then(([c, w]) => {
        if (!alive) return;
        setCart(c);
        setWishlist(new Set(w));
      })
      .catch(() => {})
      .finally(() => alive && setCartLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const add = React.useCallback<StoreCtx["add"]>(async (variantId, qty = 1, opts) => {
    setPending(true);
    try {
      const res = await addToCart(variantId, qty);
      if (!res.ok) {
        toast.error(res.error);
        if (res.cart) setCart(res.cart);
        return false;
      }
      setCart(res.cart);
      if (res.message) toast.message(res.message);
      if (opts?.openCart !== false) setCartOpen(true);
      return true;
    } catch {
      toast.error("Не вдалося додати товар. Спробуйте ще раз.");
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const update = React.useCallback(async (itemId: string, qty: number) => {
    setPending(true);
    try {
      const res = await updateCartItem(itemId, qty);
      if (res.ok) {
        setCart(res.cart);
        if (res.message) toast.message(res.message);
      } else {
        toast.error(res.error);
        if (res.cart) setCart(res.cart);
      }
    } finally {
      setPending(false);
    }
  }, []);

  const remove = React.useCallback(async (itemId: string) => {
    setPending(true);
    try {
      const res = await removeCartItem(itemId);
      if (res.ok) setCart(res.cart);
    } finally {
      setPending(false);
    }
  }, []);

  const toggleWishlist = React.useCallback(async (productId: string) => {
    // optimistic
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      const res = await toggleWishlistAction(productId);
      setWishlist(new Set(res.ids));
      if (!res.ok && res.error) toast.error(res.error);
      else if (res.added) toast.success("Додано до списку бажань");
    } catch {
      toast.error("Не вдалося оновити список бажань");
    }
  }, []);

  const value = React.useMemo<StoreCtx>(
    () => ({
      cart,
      cartLoaded,
      cartOpen,
      setCartOpen,
      add,
      update,
      remove,
      pending,
      wishlist,
      toggleWishlist,
      quickAddId,
      openQuickAdd: setQuickAddId,
      searchOpen,
      setSearchOpen,
    }),
    [cart, cartLoaded, cartOpen, add, update, remove, pending, wishlist, toggleWishlist, quickAddId, searchOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
