"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Stacked photos that cross-fade one after another; `offset` staggers neighbouring tiles so they don't change together. */
export function RotatingImage({ images, alt, sizes, interval = 4000, offset = 0 }: { images: string[]; alt: string; sizes: string; interval?: number; offset?: number }) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id: number | undefined;
    const start = window.setTimeout(() => {
      setIndex((i) => (i + 1) % images.length);
      id = window.setInterval(() => !document.hidden && setIndex((i) => (i + 1) % images.length), interval);
    }, interval + offset);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [images.length, interval, offset]);

  return (
    <>
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          aria-hidden={i !== index}
          fill
          sizes={sizes}
          className={cn(
            "object-cover transition-[opacity,transform] duration-1000 ease-out group-hover:scale-[1.03]",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </>
  );
}
