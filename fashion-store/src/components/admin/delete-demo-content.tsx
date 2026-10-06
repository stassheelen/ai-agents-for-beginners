"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eraser } from "lucide-react";
import { toast } from "sonner";
import { deleteDemoContent } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import type { DemoContentSummary } from "@/lib/demo-content";

/** Removes the demo catalogue (sample products, orders, banners and photos) after a confirmation that lists what goes. */
export function DeleteDemoContent({ summary }: { summary: DemoContentSummary }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (!summary.total) return null;
  const lines = [
    summary.products && `товарів-прикладів: ${summary.products}`,
    summary.orders && `тестових замовлень: ${summary.orders}`,
    summary.banners && `банерів: ${summary.banners}`,
    summary.sections && `блоків головної з демо-фото: ${summary.sections} (будуть вимкнені)`,
    summary.images && `демо-зображень: ${summary.images}`,
  ].filter(Boolean);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-destructive"
      onClick={() => {
        if (!confirm(`Видалити демо-дані?\n\n• ${lines.join("\n• ")}\n\nВаші реальні товари залишаться. Цю дію не можна скасувати.`)) return;
        start(async () => {
          const res = await deleteDemoContent();
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Готово");
            router.refresh();
          }
        });
      }}
    >
      <Eraser /> Видалити демо-дані
    </Button>
  );
}
