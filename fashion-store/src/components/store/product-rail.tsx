"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCardData } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** Horizontal product carousel. With `autoplay` (ms) it advances one card at a time and loops, pausing while the visitor interacts. */
export function ProductRail({ products, autoplay }: { products: ProductCardData[]; autoplay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pausedUntil = React.useRef(0);
  const hovering = React.useRef(false);
  const pause = (ms = 8000) => {
    pausedUntil.current = Date.now() + ms;
  };
  React.useEffect(() => {
    if (!autoplay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const el = ref.current;
      if (!el || hovering.current || document.hidden || Date.now() < pausedUntil.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const card = el.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      el.scrollBy({ left: (card?.offsetWidth ?? el.clientWidth / 4) + gap, behavior: "smooth" });
    }, autoplay);
    return () => window.clearInterval(id);
  }, [autoplay]);
  const [edges, setEdges] = React.useState({ start: true, end: false });
  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);
  React.useEffect(() => {
    update();
  }, [update]);
  const scroll = (dir: 1 | -1) => {
    pause();
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div
      className="group/rail relative"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocusCapture={() => pause()}
      onPointerDown={() => pause()}
      onTouchStart={() => pause()}
    >
      <div ref={ref} onScroll={update} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:gap-4 lg:scroll-px-0 lg:px-0">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-3*1rem)/4)]">
            <ProductCard product={p} priority={i < 2} sizes="(min-width:1024px) 25vw, (min-width:640px) 31vw, 46vw" />
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll(-1)}
        disabled={edges.start}
        aria-label="Назад"
        className="absolute left-3 top-[38%] hidden size-10 items-center justify-center bg-white opacity-0 transition-opacity disabled:!opacity-0 group-hover/rail:opacity-100 lg:flex"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => scroll(1)}
        disabled={edges.end}
        aria-label="Вперед"
        className="absolute right-3 top-[38%] hidden size-10 items-center justify-center bg-white opacity-0 transition-opacity disabled:!opacity-0 group-hover/rail:opacity-100 lg:flex"
      >
        <ChevronRight className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
