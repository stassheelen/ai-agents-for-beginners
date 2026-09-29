"use client";

import * as React from "react";

/**
 * Fades children of the returned container in as they scroll into view.
 * Children already on screen when first observed are left untouched, so above-the-fold content never waits;
 * only items that start below the viewport get the hidden state. Pass a value that changes when children are added.
 */
export function useReveal<T extends HTMLElement>(dep: unknown) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const show = (el: HTMLElement, delay: number) => {
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add("reveal-in");
      el.classList.remove("reveal-pending");
      el.addEventListener("transitionend", () => (el.style.transitionDelay = ""), { once: true });
    };
    const io = new IntersectionObserver((entries) => {
      let batch = 0;
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const firstReport = !seen.has(el);
        seen.add(el);
        if (entry.isIntersecting) {
          if (el.classList.contains("reveal-pending")) show(el, Math.min(batch++, 3) * 70);
          io.unobserve(el);
        } else if (firstReport) {
          el.classList.add("reveal-pending");
        }
      }
    });
    for (const child of Array.from(root.children)) if (!child.classList.contains("reveal-in")) io.observe(child);
    return () => io.disconnect();
  }, [dep]);
  return ref;
}
