"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { regroupAllCategories } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import type { RegroupSummary } from "@/lib/regroup-categories";

/** Shows the planned structure and, after confirmation, regroups every product into it. */
export function RegroupCategoriesButton({ summary }: { summary: RegroupSummary }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (!summary.productCount) return null;
  const plan = summary.groups
    .map((g) => `• ${g.name} (${g.products})${g.types.length ? `: ${g.types.map((t) => t.name).join(", ")}` : ""}`)
    .join("\n");
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Згрупувати категорії?\n\nЗараз категорій: ${summary.categoriesBefore}. Буде ${summary.groups.length} основних:\n\n${plan}\n\nСтарі категорії без товарів буде видалено.`)) return;
        start(async () => {
          const res = await regroupAllCategories();
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Готово");
            router.refresh();
          }
        });
      }}
    >
      <Layers /> {pending ? "Групую…" : "Згрупувати категорії"}
    </Button>
  );
}
