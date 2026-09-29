"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/utils";

const STEPS = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];

export function OrderLookup() {
  const [state, action, pending] = useActionState(lookupOrder, null);
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <form action={action} className="space-y-4">
        <h2 className="eyebrow">Статус замовлення</h2>
        <div className="space-y-1.5">
          <Label htmlFor="ol-number">Номер замовлення</Label>
          <Input id="ol-number" name="number" placeholder="Напр. 1024" required inputMode="numeric" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ol-email">Email, вказаний при замовленні</Label>
          <Input id="ol-email" name="email" type="email" required />
        </div>
        {state && !state.ok && <p className="text-xs text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Шукаємо…" : "Перевірити"}
        </Button>
      </form>
      {state?.ok && (
        <div className="border border-border p-6">
          <p className="eyebrow text-muted-foreground">Замовлення #{state.order.number}</p>
          <p className="mt-2 font-display text-2xl">{state.order.statusLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(state.order.createdAt)} · {formatMoney(state.order.total, state.order.currency)}
          </p>
          {STEPS.includes(state.order.status) && (
            <div className="mt-6 flex gap-1">
              {STEPS.map((s, i) => (
                <span key={s} className={`h-1 flex-1 ${i <= STEPS.indexOf(state.order.status) ? "bg-foreground" : "bg-muted"}`} />
              ))}
            </div>
          )}
          {state.order.trackingNumber && (
            <p className="mt-4 text-sm">
              ТТН: <strong>{state.order.trackingNumber}</strong>
            </p>
          )}
          <ul className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            {state.order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-4">
                <span>
                  {i.name} <span className="text-muted-foreground">{[i.color, i.size].filter(Boolean).join(" / ")}</span>
                </span>
                <span>× {i.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
