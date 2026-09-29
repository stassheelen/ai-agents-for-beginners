"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Dialog, SheetContent, DialogTitle, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { useStore } from "./store-context";

export function HeaderClient({ items, storeName }: { items: NavItem[]; storeName: string }) {
  const { cart, setCartOpen, setSearchOpen, wishlist } = useStore();
  const [active, setActive] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevPath, setPrevPath] = React.useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setActive(null);
    setMobileOpen(false);
  }

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(items[i]?.columns.length ? i : null);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 120);
  };

  const activeItem = active !== null ? items[active] : null;

  return (
    <header
      className={cn("sticky top-0 z-40 bg-white transition-[border-color] duration-200", scrolled || activeItem ? "border-b border-border" : "border-b border-transparent")}
      onMouseLeave={scheduleClose}
    >
      <div className="container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center lg:h-16 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
        {/* Mobile: menu + search */}
        <div className="flex items-center gap-1 lg:hidden">
          <button className="-ml-2 p-2" aria-label="Відкрити меню" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <button className="p-2" aria-label="Пошук" onClick={() => setSearchOpen(true)}>
            <Search className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        <Link href="/" className="font-display text-lg font-semibold tracking-[0.28em] lg:text-xl" aria-label={`${storeName} — головна`}>
          {storeName}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden h-full items-stretch lg:flex" aria-label="Головна навігація">
          {items.map((item, i) => (
            <div key={item.label} className="flex items-stretch" onMouseEnter={() => open(i)}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center px-3.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors",
                  item.highlight && "text-destructive",
                  "after:absolute after:inset-x-3.5 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform",
                  active === i && "after:scale-x-100",
                )}
                aria-expanded={item.columns.length ? active === i : undefined}
                onFocus={() => open(i)}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-0.5 lg:gap-1">
          <button className="hidden p-2 lg:inline-flex" aria-label="Пошук" onClick={() => setSearchOpen(true)}>
            <Search className="size-5" strokeWidth={1.5} />
          </button>
          <Link href="/account" className="hidden p-2 lg:inline-flex" aria-label="Акаунт">
            <User className="size-5" strokeWidth={1.5} />
          </Link>
          <Link href="/wishlist" className="relative hidden p-2 sm:inline-flex" aria-label="Список бажань">
            <Heart className="size-5" strokeWidth={1.5} />
            {wishlist.size > 0 && <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] text-white">{wishlist.size}</span>}
          </Link>
          <button className="relative -mr-2 p-2 lg:mr-0" aria-label={`Кошик, ${cart.count} товарів`} onClick={() => setCartOpen(true)}>
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {cart.count > 0 && <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] text-white">{cart.count}</span>}
          </button>
        </div>
      </div>

      {/* Mega menu */}
      {activeItem && (
        <div
          className="absolute inset-x-0 top-full hidden border-b border-border bg-white animate-fade-in lg:block"
          onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
          onMouseLeave={scheduleClose}
        >
          <div className="container-page grid grid-cols-12 gap-10 py-10">
            <div className="col-span-7 grid grid-cols-3 gap-10">
              {activeItem.columns.map((col) => (
                <div key={col.title}>
                  <p className="eyebrow mb-4 text-muted-foreground">{col.title}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link href={l.href} className="group inline-flex items-center gap-2.5 text-sm hover:underline hover:underline-offset-4">
                          {l.swatch && <span className="size-3 rounded-full border border-black/10" style={{ background: l.swatch }} />}
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="col-span-5 grid grid-cols-2 gap-4">
              {activeItem.promos.map((p) => (
                <Link key={p.id} href={p.link ?? "/shop"} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    {p.image && (
                      <Image src={p.image} alt={p.title} fill sizes="20vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium">{p.title}</p>
                  {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="overflow-y-auto">
          <DialogTitle className="sr-only">Меню</DialogTitle>
          <div className="flex h-14 items-center border-b border-border px-5">
            <span className="font-display text-base font-semibold tracking-[0.28em]">{storeName}</span>
          </div>
          <Accordion type="single" collapsible className="px-5">
            {items.map((item) =>
              item.columns.length ? (
                <AccordionItem key={item.label} value={item.label}>
                  <AccordionTrigger className={cn("py-5 text-sm", item.highlight && "text-destructive")}>{item.label}</AccordionTrigger>
                  <AccordionContent className="pb-6 text-foreground">
                    <Link href={item.href} className="mb-4 block text-sm font-medium underline underline-offset-4">
                      Переглянути все
                    </Link>
                    {item.columns.map((col) => (
                      <div key={col.title} className="mb-5">
                        <p className="eyebrow mb-2.5 text-muted-foreground">{col.title}</p>
                        <ul className={cn(col.links.some((l) => l.swatch) ? "flex flex-wrap gap-2" : "space-y-2.5")}>
                          {col.links.map((l) => (
                            <li key={l.href + l.label}>
                              {l.swatch ? (
                                <Link href={l.href} className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs">
                                  <span className="size-3 rounded-full border border-black/10" style={{ background: l.swatch }} />
                                  {l.label}
                                </Link>
                              ) : (
                                <Link href={l.href} className="text-sm">
                                  {l.label}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <div key={item.label} className="border-b border-border">
                  <Link href={item.href} className={cn("block py-5 text-sm font-medium uppercase tracking-[0.12em]", item.highlight && "text-destructive")}>
                    {item.label}
                  </Link>
                </div>
              ),
            )}
          </Accordion>
          <div className="mt-auto space-y-1 border-t border-border bg-soft px-5 py-6 text-sm">
            <Link href="/account" className="flex items-center gap-3 py-2">
              <User className="size-4" strokeWidth={1.5} /> Акаунт та замовлення
            </Link>
            <Link href="/wishlist" className="flex items-center gap-3 py-2">
              <Heart className="size-4" strokeWidth={1.5} /> Список бажань {wishlist.size > 0 && `(${wishlist.size})`}
            </Link>
            <Link href="/help/delivery" className="block py-2 text-muted-foreground">
              Доставка та оплата
            </Link>
            <Link href="/help/returns" className="block py-2 text-muted-foreground">
              Обмін та повернення
            </Link>
          </div>
        </SheetContent>
      </Dialog>
    </header>
  );
}
