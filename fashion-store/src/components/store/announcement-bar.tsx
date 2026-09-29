"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnnouncementBar({ items }: { items: { id: string; title: string; link: string | null }[] }) {
  const [state, setState] = React.useState({ index: 0, dir: 1 });
  const [paused, setPaused] = React.useState(false);
  const count = items.length;
  const go = React.useCallback((dir: 1 | -1) => setState((s) => ({ index: (s.index + dir + count) % count, dir })), [count]);

  React.useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [count, paused, go]);

  if (!count) return null;
  const item = items[state.index % count];
  const content = (
    <span key={item.id} className={cn("inline-block", state.dir > 0 ? "animate-ticker-next" : "animate-ticker-prev")}>
      {item.title}
    </span>
  );
  const arrow = "flex size-9 shrink-0 items-center justify-center opacity-60 transition-opacity duration-200 hover:opacity-100";

  return (
    <div
      className="bg-accent text-accent-foreground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page flex h-9 items-center justify-center gap-2 sm:gap-10">
        {count > 1 && (
          <button type="button" className={arrow} onClick={() => go(-1)} aria-label="Попереднє оголошення">
            <ChevronLeft className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
        <div className="min-w-0 flex-1 overflow-hidden text-center text-[11px] font-medium uppercase tracking-[0.16em] sm:max-w-md sm:flex-none sm:basis-md" aria-live={paused ? "polite" : "off"}>
          {item.link ? (
            <Link href={item.link} className="block truncate hover:opacity-80">
              {content}
            </Link>
          ) : (
            <p className="truncate">{content}</p>
          )}
        </div>
        {count > 1 && (
          <button type="button" className={arrow} onClick={() => go(1)} aria-label="Наступне оголошення">
            <ChevronRight className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
