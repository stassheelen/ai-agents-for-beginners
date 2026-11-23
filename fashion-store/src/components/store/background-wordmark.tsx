"use client";

import * as React from "react";

const ROWS = 16;

/**
 * Giant, barely visible VELLA wordmarks behind the store pages, over soft
 * powder, olive and sand colour glows that stay in view and slowly float.
 * While the page scrolls the letters drift slower than the content (parallax)
 * and sideways in alternating directions. Sections with their own background
 * cover both. Static for visitors who prefer reduced motion.
 */
export function BackgroundWordmark() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const layer = ref.current;
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      layer.style.setProperty("--sy", String(window.scrollY));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // overflow-clip (not hidden) keeps the sticky colour layer pinned to the viewport while clipping the letters.
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-clip select-none">
      <div className="bg-blobs">
        <span className="bg-blob bg-blob-1" />
        <span className="bg-blob bg-blob-2" />
        <span className="bg-blob bg-blob-3" />
      </div>
      <div ref={ref} className="bg-wordmark-layer">
        {Array.from({ length: ROWS }, (_, i) => (
          <span key={i} className="bg-wordmark-row" data-dir={i % 2 ? "right" : "left"}>
            VELLA
          </span>
        ))}
      </div>
    </div>
  );
}
