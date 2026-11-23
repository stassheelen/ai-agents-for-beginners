"use client";

import { useReveal } from "./use-reveal";

/** Fades and lifts each direct child in as it scrolls into view (see useReveal). */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>(null);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
