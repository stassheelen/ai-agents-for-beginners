"use client";

import * as React from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Inertial wheel scrolling for the storefront (desktop mouse and trackpad).
 * Touch keeps the phone's native scrolling. Off for visitors who ask for reduced motion.
 * Open dialogs (cart, filters, search, menu) scroll natively and pause it, since
 * Radix marks the page with data-scroll-locked while one is open.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      anchors: { offset: -96 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      prevent: (node) => Boolean(node.closest("[role=dialog], [data-radix-popper-content-wrapper], [data-lenis-prevent]")),
    });
    const syncLock = () => (document.body.hasAttribute("data-scroll-locked") ? lenis.stop() : lenis.start());
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, []);
  return null;
}
