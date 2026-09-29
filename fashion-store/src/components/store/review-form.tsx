"use client";

import * as React from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, sizes }: { productId: string; sizes: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [state, action, pending] = useActionState(submitReview, null);
  if (state?.ok) return <p className="border border-border bg-soft p-5 text-sm">{state.message}</p>;
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Написати відгук
      </Button>
    );
  return (
    <form action={action} className="max-w-xl space-y-4 border border-border p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div>
        <Label>Оцінка</Label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i} зірок`}>
              <Star className={cn("size-5", i <= rating ? "fill-foreground" : "text-input")} strokeWidth={1.2} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rv-name">Ім&apos;я *</Label>
          <Input id="rv-name" name="name" required maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rv-email">Email</Label>
          <Input id="rv-email" name="email" type="email" maxLength={120} />
        </div>
      </div>
      {sizes.length > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor="rv-size">Придбаний розмір</Label>
          <select id="rv-size" name="size" className="h-11 w-full border border-input bg-white px-3 text-sm">
            <option value="">—</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="rv-title">Заголовок</Label>
        <Input id="rv-title" name="title" maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rv-body">Відгук *</Label>
        <Textarea id="rv-body" name="body" required minLength={10} maxLength={2000} />
      </div>
      {state && !state.ok && <p className="text-xs text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Надсилаємо…" : "Надіслати"}
      </Button>
    </form>
  );
}
