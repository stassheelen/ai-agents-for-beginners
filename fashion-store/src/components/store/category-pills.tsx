"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Pill = { name: string; href: string; active?: boolean };

/**
 * Horizontally scrollable category pills: swipe on touch, drag / wheel / arrow buttons with a mouse,
 * edge fades + a progress track when the list overflows, and the active pill kept in view.
 */
export function CategoryPills({ items, label = "Категорії" }: { items: Pill[]; label?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ overflow: false, start: true, end: true, thumb: 1, offset: 0 });
  // Highlight the tapped pill immediately, before navigation finishes.
  const [pending, setPending] = React.useState<string | null>(null);
  const [prevItems, setPrevItems] = React.useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setPending(null);
  }
  const activeHref = pending ?? items.find((i) => i.active)?.href ?? null;

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setEdges({
      overflow: max > 2,
      start: scrollLeft <= 2,
      end: scrollLeft >= max - 2,
      thumb: clientWidth / scrollWidth,
      offset: max > 0 ? scrollLeft / clientWidth : 0,
    });
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });

    // Vertical mouse wheel scrolls the row sideways while there is room to scroll.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = el.scrollLeft + e.deltaY;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(max, next));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  // Keep the active pill in view (instantly on first paint, smoothly afterwards).
  const first = React.useRef(true);
  React.useEffect(() => {
    const el = ref.current;
    const pill = el?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el || !pill) return;
    const left = pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2;
    el.scrollTo({ left, behavior: first.current ? "instant" : "smooth" });
    first.current = false;
  }, [activeHref]);

  // Mouse drag-to-scroll. Pointer capture starts only after a real drag so plain clicks still navigate.
  const drag = React.useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(d.id);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      ref.current?.releasePointerCapture(d.id);
      // Swallow the click that follows a drag.
      const stop = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
      setDragging(false);
    }
  };

  const scrollByPage = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-[0_2px_10px_-2px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.05)] transition-[opacity,transform,box-shadow] duration-300 hover:scale-105 hover:shadow-[0_6px_18px_-4px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.06)] active:scale-95 md:flex";
  const fade = "pointer-events-none absolute inset-y-0 z-[5] w-16 transition-opacity duration-300";

  return (
    <div className="relative -mx-4 md:mx-0">
      <button type="button" onClick={() => scrollByPage(-1)} aria-label="Прокрутити категорії ліворуч" tabIndex={-1} className={cn(arrow, "left-0", (!edges.overflow || edges.start) && "pointer-events-none opacity-0")}>
        <ChevronLeft className="size-4" strokeWidth={1.5} />
      </button>
      <div className={cn(fade, "left-0 bg-linear-to-r from-white to-transparent md:left-0", (!edges.overflow || edges.start) && "opacity-0")} />
      <div className={cn(fade, "right-0 bg-linear-to-l from-white to-transparent", (!edges.overflow || edges.end) && "opacity-0")} />
      <button type="button" onClick={() => scrollByPage(1)} aria-label="Прокрутити категорії праворуч" tabIndex={-1} className={cn(arrow, "right-0", (!edges.overflow || edges.end) && "pointer-events-none opacity-0")}>
        <ChevronRight className="size-4" strokeWidth={1.5} />
      </button>

      <nav aria-label={label}>
        <div
          ref={ref}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            "no-scrollbar relative flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 [-webkit-overflow-scrolling:touch] md:gap-2.5 md:px-1",
            dragging ? "cursor-grabbing select-none [&_a]:pointer-events-none" : edges.overflow && "md:cursor-grab",
          )}
        >
          {items.map((it) => {
            const on = it.href === activeHref;
            return (
              <Link
                key={it.href}
                href={it.href}
                scroll={false}
                draggable={false}
                data-active={on}
                aria-current={on ? "page" : undefined}
                onClick={() => setPending(it.href)}
                className={cn(
                  "shrink-0 select-none whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] leading-none transition-[background-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.96] md:px-6 md:py-3 md:text-sm",
                  on
                    ? "bg-foreground text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.5)]"
                    : "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:bg-soft hover:shadow-[0_8px_18px_-10px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.09)] active:translate-y-0",
                )}
              >
                {it.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {edges.overflow && (
        <div className="mx-4 mt-1 h-0.5 overflow-hidden rounded-full bg-black/[0.06] md:mx-1" aria-hidden>
          <div
            className="h-full rounded-full bg-foreground transition-transform duration-150 ease-out"
            style={{ width: `${edges.thumb * 100}%`, transform: `translateX(${edges.offset * 100}%)` }}
          />
        </div>
      )}
    </div>
  );
}
