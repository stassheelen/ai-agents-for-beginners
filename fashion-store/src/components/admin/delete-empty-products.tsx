"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEmptyProducts } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";

/** Deletes every product without photos or variants (they show as blank cards). */
export function DeleteEmptyProducts({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (!count) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-destructive"
      onClick={() => {
        if (!confirm(`Видалити порожні товари (${count}) — без фото або без варіантів? Цю дію не можна скасувати.`)) return;
        start(async () => {
          const res = await deleteEmptyProducts();
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Готово");
            router.refresh();
          }
        });
      }}
    >
      <Trash2 /> Видалити порожні ({count})
    </Button>
  );
}
