"use client";

import * as React from "react";
import { getProductsByIds } from "@/actions/catalog";
import type { ProductCardData } from "@/lib/queries";
import { ProductRail } from "./product-rail";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = React.useState<ProductCardData[]>([]);
  React.useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("nf_recent") ?? "[]");
    } catch {}
    ids = ids.filter((i) => i !== excludeId);
    if (!ids.length) return;
    getProductsByIds(ids).then(setItems).catch(() => {});
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section className="container-page py-12 lg:py-16">
      <h2 className="mb-6 font-display text-2xl font-medium lg:mb-8 lg:text-[32px]">Нещодавно переглянуті</h2>
      <ProductRail products={items} />
    </section>
  );
}
