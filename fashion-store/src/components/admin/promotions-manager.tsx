"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deletePromotion, savePromotion } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Badge, Card, EmptyState, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, Switch } from "@/components/ui/overlay";
import { toMinor } from "@/lib/utils";
import { useAdminAction } from "./use-action";

type Promo = { id?: string; code: string; description: string; type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"; value: string; minSubtotal: string; usageLimit: string; usageCount?: number; active: boolean; startsAt: string; endsAt: string };

export function PromotionsManager({ promotions }: { promotions: (Promo & { id: string })[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<Promo | null>(null);
  const describe = (p: Promo) => (p.type === "PERCENTAGE" ? `−${p.value}%` : p.type === "FIXED" ? `−${p.value} ₴` : "Безкоштовна доставка");
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ code: "", description: "", type: "PERCENTAGE", value: "10", minSubtotal: "0", usageLimit: "", active: true, startsAt: "", endsAt: "" })}>
          <Plus /> Додати промокод
        </Button>
      </div>
      <Card>
        {promotions.length === 0 ? (
          <EmptyState title="Промокодів немає" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Код</TH>
                <TH>Знижка</TH>
                <TH>Мін. сума</TH>
                <TH>Використано</TH>
                <TH>Статус</TH>
                <TH className="w-20" />
              </tr>
            </THead>
            <tbody>
              {promotions.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <p className="font-mono font-medium">{p.code}</p>
                    <p className="text-[11px] text-muted-foreground">{p.description}</p>
                  </TD>
                  <TD>{describe(p)}</TD>
                  <TD>{Number(p.minSubtotal) ? `${p.minSubtotal} ₴` : "—"}</TD>
                  <TD>
                    {p.usageCount}
                    {p.usageLimit && ` / ${p.usageLimit}`}
                  </TD>
                  <TD>{p.active ? <Badge variant="success">активний</Badge> : <Badge variant="muted">вимкнено</Badge>}</TD>
                  <TD>
                    <div className="flex">
                      <button className="p-1.5 hover:bg-muted" onClick={() => setEditing(p)} aria-label="Редагувати">
                        <Pencil className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm(`Видалити ${p.code}?`) && run(() => deletePromotion(p.id))} aria-label="Видалити">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogTitle>{editing?.id ? "Редагування промокоду" : "Новий промокод"}</DialogTitle>
          {editing && (
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await run(() =>
                  savePromotion({
                    id: editing.id,
                    code: editing.code,
                    description: editing.description,
                    type: editing.type,
                    value: editing.type === "FIXED" ? toMinor(editing.value) ?? 0 : editing.type === "PERCENTAGE" ? Number(editing.value) : 0,
                    minSubtotal: toMinor(editing.minSubtotal) ?? 0,
                    usageLimit: editing.usageLimit ? Number(editing.usageLimit) : null,
                    active: editing.active,
                    startsAt: editing.startsAt || null,
                    endsAt: editing.endsAt || null,
                  }),
                );
                if (res?.ok) setEditing(null);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Код *</Label>
                  <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Тип</Label>
                  <NativeSelect value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Promo["type"] })}>
                    <option value="PERCENTAGE">Відсоток</option>
                    <option value="FIXED">Фіксована сума</option>
                    <option value="FREE_SHIPPING">Безкоштовна доставка</option>
                  </NativeSelect>
                </div>
                {editing.type !== "FREE_SHIPPING" && (
                  <div className="space-y-1.5">
                    <Label>{editing.type === "PERCENTAGE" ? "Відсоток" : "Сума (₴)"}</Label>
                    <Input value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} inputMode="decimal" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Мінімальна сума замовлення (₴)</Label>
                  <Input value={editing.minSubtotal} onChange={(e) => setEditing({ ...editing, minSubtotal: e.target.value })} inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Ліміт використань</Label>
                  <Input value={editing.usageLimit} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value.replace(/\D/g, "") })} placeholder="без обмежень" />
                </div>
                <div className="space-y-1.5">
                  <Label>Опис</Label>
                  <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Діє з</Label>
                  <Input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Діє до</Label>
                  <Input type="datetime-local" value={editing.endsAt} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Активний
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Скасувати
                </Button>
                <Button type="submit" disabled={pending}>
                  Зберегти
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
