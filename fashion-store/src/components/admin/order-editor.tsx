"use client";

import * as React from "react";
import { updateOrder } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/misc";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "./status";
import { useAdminAction } from "./use-action";

export function OrderEditor({ order }: { order: { id: string; status: string; paymentStatus: string; trackingNumber: string; adminNote: string } }) {
  const [f, setF] = React.useState(order);
  const { run, pending } = useAdminAction();
  const [prevOrder, setPrevOrder] = React.useState(order);
  if (prevOrder !== order) {
    setPrevOrder(order);
    setF(order);
  }
  const willRestock = !["CANCELLED", "RETURNED"].includes(order.status) && ["CANCELLED", "RETURNED"].includes(f.status);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Керування замовленням</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateOrder({ id: f.id, status: f.status as "NEW", paymentStatus: f.paymentStatus as "PAID", trackingNumber: f.trackingNumber, adminNote: f.adminNote }));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <NativeSelect value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Статус оплати</Label>
              <NativeSelect value={f.paymentStatus} onChange={(e) => setF({ ...f, paymentStatus: e.target.value })}>
                {["PENDING", "PAID", "FAILED", "REFUNDED"].map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Номер ТТН</Label>
              <Input value={f.trackingNumber} onChange={(e) => setF({ ...f, trackingNumber: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Внутрішня нотатка</Label>
            <Textarea value={f.adminNote} onChange={(e) => setF({ ...f, adminNote: e.target.value })} className="min-h-20" />
          </div>
          {willRestock && <p className="text-xs text-[#9a6200]">Товари з цього замовлення повернуться на склад.</p>}
          <Button type="submit" disabled={pending}>
            Зберегти зміни
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
