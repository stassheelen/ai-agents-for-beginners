"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus, X } from "lucide-react";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { useStore } from "./store-context";
import { Price } from "./price";

export function CartDrawer({ freeShippingThreshold, shippingFlatRate }: { freeShippingThreshold: number; shippingFlatRate: number }) {
  const { cart, cartOpen, setCartOpen, update, remove, pending, toggleWishlist, wishlist } = useStore();
  const shipping = cart.subtotal === 0 || cart.subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const left = Math.max(0, freeShippingThreshold - cart.subtotal);
  const progress = Math.min(100, (cart.subtotal / freeShippingThreshold) * 100);

  return (
    <Dialog open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" hideClose>
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <DialogTitle className="text-xs font-medium uppercase tracking-[0.14em]">Кошик ({cart.count})</DialogTitle>
          <button onClick={() => setCartOpen(false)} aria-label="Закрити" className="-mr-1 p-1">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-display text-2xl">Ваш кошик порожній</p>
            <p className="text-sm text-muted-foreground">Додайте щось, що вам подобається — ми збережемо це тут.</p>
            <Button asChild className="mt-2" onClick={() => setCartOpen(false)}>
              <Link href="/shop">Перейти до покупок</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs">
                {left > 0 ? (
                  <>
                    До безкоштовної доставки залишилось <strong>{formatMoney(left)}</strong>
                  </>
                ) : (
                  <>Вам доступна безкоштовна доставка</>
                )}
              </p>
              <div className="mt-2 h-0.5 w-full bg-muted">
                <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link href={`/products/${item.slug}`} onClick={() => setCartOpen(false)} className="relative aspect-[4/5] w-24 shrink-0 bg-muted">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/products/${item.slug}`} onClick={() => setCartOpen(false)} className="text-sm font-medium leading-snug hover:underline">
                        {item.name}
                      </Link>
                      <button onClick={() => remove(item.id)} disabled={pending} aria-label="Видалити" className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
                        <X className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                    <Price price={item.unitPrice} compareAt={item.compareAtPrice} className="mt-1 text-xs" />
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex h-9 items-center border border-border">
                        <button className="flex h-full w-9 items-center justify-center disabled:opacity-40" onClick={() => update(item.id, item.quantity - 1)} disabled={pending} aria-label="Зменшити кількість">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs tabular-nums">{item.quantity}</span>
                        <button
                          className="flex h-full w-9 items-center justify-center disabled:opacity-40"
                          onClick={() => update(item.id, item.quantity + 1)}
                          disabled={pending || item.quantity >= item.stock}
                          aria-label="Збільшити кількість"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => !wishlist.has(item.productId) && toggleWishlist(item.productId)}
                        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Heart className={`size-3.5 ${wishlist.has(item.productId) ? "fill-foreground text-foreground" : ""}`} strokeWidth={1.5} />
                        {wishlist.has(item.productId) ? "У списку бажань" : "В обране"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border bg-soft px-5 py-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Підсумок</span>
                <span>{formatMoney(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Доставка</span>
                <span>{shipping === 0 ? "Безкоштовно" : formatMoney(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-medium">
                <span>Разом</span>
                <span>{formatMoney(cart.subtotal + shipping)}</span>
              </div>
              <Button asChild size="lg" className="mt-3 w-full" onClick={() => setCartOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <p className="pt-1 text-center text-[11px] text-muted-foreground">Промокод можна застосувати на наступному кроці</p>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
