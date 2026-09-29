"use client";

import * as React from "react";
import Link from "next/link";

export function AnnouncementBar({ items }: { items: { id: string; title: string; link: string | null }[] }) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const item = items[index];
  const content = <span key={item.id} className="inline-block animate-fade-in">{item.title}</span>;
  return (
    <div className="bg-accent text-accent-foreground">
      <div className="container-page flex h-9 items-center justify-center text-center text-[11px] font-medium uppercase tracking-[0.14em]">
        {item.link ? (
          <Link href={item.link} className="hover:opacity-80">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
