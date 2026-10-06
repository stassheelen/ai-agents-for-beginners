"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Coins, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBrokenPhotoProducts, deleteEmptyProducts, roundPrices } from "@/actions/admin/products";
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

/** Deletes every product that still uses a photo from the suspended Vercel Blob store (shows as a broken image). */
export function DeleteBrokenPhotoProducts({ count }: { count: number }) {
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
        if (!confirm(`Видалити товари зі зламаними фото (${count})? Цю дію не можна скасувати.`)) return;
        start(async () => {
          const res = await deleteBrokenPhotoProducts();
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Готово");
            router.refresh();
          }
        });
      }}
    >
      <Trash2 /> Видалити всі зі зламаними фото ({count})
    </Button>
  );
}

/** Rounds all prices down: under 1000 ₴ to tens (671 → 670), from 1000 ₴ to hundreds (2032 → 2000). */
export function RoundPricesButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (!count) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Округлити ціни (${count})?\n\nДо 1000 ₴ — вниз до десятків (671 → 670), від 1000 ₴ — вниз до сотень (2032 → 2000). Стара ціна, яка стане не більшою за нову, прибирається.`)) return;
        start(async () => {
          const res = await roundPrices();
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Готово");
            router.refresh();
          }
        });
      }}
    >
      <Coins /> Округлити ціни ({count})
    </Button>
  );
}
