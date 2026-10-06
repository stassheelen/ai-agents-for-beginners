"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import {
  Dialog,
  SheetContent,
  DialogTitle,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { useStore } from "./store-context";

export function HeaderClient({
  items,
  storeName,
}: {
  items: NavItem[];
  storeName: string;
}) {
  const { cart, setCartOpen, setSearchOpen, wishlist } = useStore();
  const [active, setActive] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevPath, setPrevPath] = React.useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setActive(null);
    setMobileOpen(false);
  }

  // Homepage: a large wordmark under the header that shrinks into the header logo while scrolling.
  const home = pathname === "/";
  const logoRef = React.useRef<HTMLAnchorElement>(null);
  const bigRef = React.useRef<HTMLSpanElement>(null);
  const spacerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const big = bigRef.current;
    const logo = logoRef.current;
    const spacer = spacerRef.current;
    if (
      !home ||
      !big ||
      !logo ||
      !spacer ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let frame = 0;
    let settleUntil = 0;
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    const draw = () => {
      frame = 0;
      big.style.transform = "none";
      const c = big.getBoundingClientRect();
      const n = logo.getBoundingClientRect();
      const sp = spacer.getBoundingClientRect();
      const headerBottom = logo
        .closest("header")!
        .getBoundingClientRect().bottom;
      const p = Math.min(
        1,
        Math.max(0, window.scrollY / Math.max(1, sp.height)),
      );
      const e = ease(p);
      // Shrinks and slides left while staying under the header (so it never covers the menu),
      // then rises into the header logo's place over the last fifth of the way.
      const x = c.left + (n.left - c.left) * e;
      const below = Math.max(
        sp.top + (sp.height - c.height) / 2,
        headerBottom + 8,
      );
      const q = ease(Math.min(1, Math.max(0, (p - 0.8) / 0.2)));
      const y = below + (n.top - below) * q;
      const k = 1 + (n.width / c.width - 1) * e;
      big.style.transform = `translate(${x - c.left}px, ${y - c.top}px) scale(${k})`;
      const done = p >= 1;
      big.style.visibility = done ? "hidden" : "visible";
      logo.style.opacity = done ? "1" : "0";
      // The header resizes with a transition after crossing its threshold: keep following it briefly.
      if (performance.now() < settleUntil) frame = requestAnimationFrame(draw);
    };
    const schedule = () => {
      settleUntil = performance.now() + 400;
      if (!frame) frame = requestAnimationFrame(draw);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      logo.style.opacity = "";
    };
  }, [home]);

  React.useEffect(() => {
    // Hysteresis keeps the header from flickering around the threshold.
    const onScroll = () =>
      setScrolled((was) => (was ? window.scrollY > 4 : window.scrollY > 48));
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
  const current =
    pathname +
    (searchParams.get("flag") ? `?flag=${searchParams.get("flag")}` : "");
  // "/shop" is the parent of every catalog URL, so it only counts as current on an exact match.
  const isCurrent = (href: string) =>
    current === href ||
    (!href.includes("?") &&
      href !== "/shop" &&
      pathname.startsWith(`${href}/`));
  const iconBtn =
    "relative inline-flex size-11 items-center justify-center rounded-full transition-[background-color,transform] duration-200 hover:bg-black/[0.04] active:scale-90 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-105";
  const badge =
    "absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-medium leading-none text-white";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 bg-white transition-[box-shadow,margin] duration-300",
          scrolled && "lg:mb-4",
          scrolled || activeItem
            ? "shadow-[0_1px_0_var(--border),0_8px_24px_-18px_rgba(0,0,0,0.25)]"
            : "shadow-[0_1px_0_transparent]",
        )}
        onMouseLeave={scheduleClose}
      >
        <div
          className={cn(
            "container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-300 ease-out lg:gap-8",
            scrolled ? "lg:h-16" : "lg:h-20",
          )}
        >
          {/* Mobile: menu + search */}
          <div className="-ml-3 flex items-center lg:hidden">
            <button
              className={iconBtn}
              aria-label="Відкрити меню"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
            <button
              className={iconBtn}
              aria-label="Пошук"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          <Link
            ref={logoRef}
            href="/"
            className={cn(
              "justify-self-center font-display font-semibold leading-none tracking-[0.34em] transition-[font-size,opacity] duration-300 lg:justify-self-start",
              "text-xl",
              scrolled ? "lg:text-[26px]" : "lg:text-[30px]",
              // On the homepage the big wordmark below stands in for it until it has shrunk into place.
              home && "opacity-0 motion-reduce:opacity-100",
            )}
            aria-label={`${storeName} — головна`}
          >
            {/* Trailing letter-spacing would push the word off-centre */}
            <span className="logo-shine logo-shine-once -mr-[0.34em]">
              {storeName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden h-full items-stretch justify-center lg:flex"
            aria-label="Головна навігація"
          >
            {items.map((item, i) => {
              const here = isCurrent(item.href);
              return (
                <div
                  key={item.label}
                  className="flex items-stretch"
                  onMouseEnter={() => open(i)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center px-3 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-200 xl:px-4",
                      item.highlight
                        ? "text-destructive hover:text-destructive/80"
                        : "text-foreground/80 hover:text-foreground",
                      here && !item.highlight && "text-foreground",
                      "after:absolute after:inset-x-3 after:bottom-[calc(50%-14px)] after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 xl:after:inset-x-4",
                      (active === i || here) && "after:scale-x-100",
                    )}
                    aria-current={here ? "page" : undefined}
                    aria-expanded={
                      item.columns.length ? active === i : undefined
                    }
                    onFocus={() => open(i)}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="-mr-3 flex items-center justify-end lg:mr-0 lg:gap-0.5">
            <button
              className={cn(iconBtn, "hidden lg:inline-flex")}
              aria-label="Пошук"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <Link
              href="/account"
              className={cn(iconBtn, "hidden lg:inline-flex")}
              aria-label="Акаунт"
            >
              <User className="size-5" strokeWidth={1.5} />
            </Link>
            <Link
              href="/wishlist"
              className={cn(iconBtn, "hidden sm:inline-flex")}
              aria-label={`Список бажань${wishlist.size ? `, ${wishlist.size}` : ""}`}
            >
              <Heart
                className={cn("size-5", wishlist.size > 0 && "fill-foreground")}
                strokeWidth={1.5}
              />
              {wishlist.size > 0 && (
                <span key={wishlist.size} className={cn(badge, "animate-pop")}>
                  {wishlist.size}
                </span>
              )}
            </Link>
            <button
              className={iconBtn}
              aria-label={`Кошик, ${cart.count} товарів`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {cart.count > 0 && (
                <span key={cart.count} className={cn(badge, "animate-pop")}>
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mega menu */}
        {home && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full flex h-[calc(17vw+24px)] max-h-[280px] items-center justify-center overflow-visible motion-reduce:hidden"
          >
            <span
              ref={bigRef}
              className="block origin-top-left font-display text-[min(17vw,240px)] font-semibold leading-none tracking-[0.34em] will-change-transform"
            >
              <span className="logo-shine logo-shine-once -mr-[0.34em]">
                {storeName}
              </span>
            </span>
          </div>
        )}

        {activeItem && (
          <div
            className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-8rem)] overflow-y-auto border-b border-border bg-white shadow-[0_24px_40px_-32px_rgba(0,0,0,0.35)] animate-fade-in lg:block"
            onMouseEnter={() =>
              closeTimer.current && clearTimeout(closeTimer.current)
            }
            onMouseLeave={scheduleClose}
          >
            <div className="container-page grid grid-cols-12 gap-10 py-8">
              {/* Many columns (all categories under "Магазин"): wider, four across, no promo. */}
              <div
                className={cn(
                  "grid gap-x-10 gap-y-8",
                  activeItem.columns.length > 4 || !activeItem.promos.length
                    ? "col-span-12 grid-cols-4"
                    : "col-span-8 grid-cols-3",
                )}
              >
                {activeItem.columns.map((col) => (
                  <div key={col.title}>
                    <p className="eyebrow mb-3 text-muted-foreground">
                      {col.title}
                    </p>
                    <ul className="space-y-2">
                      {col.links.map((l) => (
                        <li key={l.href + l.label}>
                          <Link
                            href={l.href}
                            className="group inline-flex items-center gap-2.5 text-sm hover:underline hover:underline-offset-4"
                          >
                            {l.swatch && (
                              <span
                                className="size-3 rounded-full border border-black/10"
                                style={{ background: l.swatch }}
                              />
                            )}
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div
                className={cn(
                  "col-span-4 grid grid-cols-2 gap-4",
                  (activeItem.columns.length > 4 ||
                    !activeItem.promos.length) &&
                    "hidden",
                )}
              >
                {activeItem.promos.map((p) => (
                  <Link
                    key={p.id}
                    href={p.link ?? "/shop"}
                    className={cn(
                      "group block",
                      activeItem.promos.length === 1 &&
                        "col-span-2 max-w-72 justify-self-end",
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-muted">
                      {p.image && (
                        <Image
                          src={p.image}
                          alt={p.title}
                          fill
                          sizes="20vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-2.5 text-sm font-medium">{p.title}</p>
                    {p.subtitle && (
                      <p className="text-xs text-muted-foreground">
                        {p.subtitle}
                      </p>
                    )}
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
              <span className="font-display text-base font-semibold tracking-[0.28em]">
                {storeName}
              </span>
            </div>
            <Accordion type="single" collapsible className="px-5">
              {items.map((item) =>
                item.columns.length ? (
                  <AccordionItem key={item.label} value={item.label}>
                    <AccordionTrigger
                      className={cn(
                        "py-5 text-sm",
                        item.highlight && "text-destructive",
                      )}
                    >
                      {item.label}
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-foreground">
                      <Link
                        href={item.href}
                        className="mb-4 block text-sm font-medium underline underline-offset-4"
                      >
                        Переглянути все
                      </Link>
                      {item.columns.map((col) => (
                        <div key={col.title} className="mb-5">
                          <p className="eyebrow mb-2.5 text-muted-foreground">
                            {col.title}
                          </p>
                          <ul
                            className={cn(
                              col.links.some((l) => l.swatch)
                                ? "flex flex-wrap gap-2"
                                : "space-y-2.5",
                            )}
                          >
                            {col.links.map((l) => (
                              <li key={l.href + l.label}>
                                {l.swatch ? (
                                  <Link
                                    href={l.href}
                                    className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs"
                                  >
                                    <span
                                      className="size-3 rounded-full border border-black/10"
                                      style={{ background: l.swatch }}
                                    />
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
                    <Link
                      href={item.href}
                      className={cn(
                        "block py-5 text-sm font-medium uppercase tracking-[0.12em]",
                        item.highlight && "text-destructive",
                      )}
                    >
                      {item.label}
                    </Link>
                  </div>
                ),
              )}
            </Accordion>
            <div className="mt-auto space-y-1 border-t border-border bg-soft px-5 py-6 text-sm">
              <Link href="/account" className="flex items-center gap-3 py-2">
                <User className="size-4" strokeWidth={1.5} /> Акаунт та
                замовлення
              </Link>
              <Link href="/wishlist" className="flex items-center gap-3 py-2">
                <Heart className="size-4" strokeWidth={1.5} /> Список бажань{" "}
                {wishlist.size > 0 && `(${wishlist.size})`}
              </Link>
              <Link
                href="/help/delivery"
                className="block py-2 text-muted-foreground"
              >
                Доставка та оплата
              </Link>
              <Link
                href="/help/returns"
                className="block py-2 text-muted-foreground"
              >
                Обмін та повернення
              </Link>
            </div>
          </SheetContent>
        </Dialog>
      </header>
      {home && (
        <div
          ref={spacerRef}
          aria-hidden
          className="h-[calc(17vw+24px)] max-h-[280px] motion-reduce:hidden"
        />
      )}
    </>
  );
}
