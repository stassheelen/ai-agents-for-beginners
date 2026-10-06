"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pages opened inside the store in this tab without a full reload (client-side navigations). */
let inAppPages = 0;

/** Counts client-side page changes; rendered once in the store layout. */
export function NavigationTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    inAppPages++;
  }, [pathname]);
  return null;
}

/**
 * Goes back to the previous page of the store (keeping its scroll position and filters);
 * when the visitor came from elsewhere (a link, a search engine), opens `fallback` instead.
 */
export function BackButton({ fallback, label = "Назад", variant = "glass", className }: { fallback: string; label?: string; variant?: "glass" | "text"; className?: string }) {
  const router = useRouter();
  const goBack = () => {
    let sameSite = inAppPages > 1;
    try {
      sameSite ||= Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch {}
    if (sameSite && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  if (variant === "text") {
    return (
      <button type="button" onClick={goBack} className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground", className)}>
        <ChevronLeft className="size-4" strokeWidth={1.5} />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-white/50 bg-white/60 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-200 active:scale-90",
        className,
      )}
    >
      <ChevronLeft className="size-5" strokeWidth={1.5} />
    </button>
  );
}
