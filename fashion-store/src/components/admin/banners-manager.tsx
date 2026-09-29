"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBanner, moveBanner, saveBanner } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Badge, Card, CardHeader, CardTitle } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, Switch } from "@/components/ui/overlay";
import { MediaField } from "./media";
import { useAdminAction } from "./use-action";

type Placement = "ANNOUNCEMENT" | "HOMEPAGE" | "MEGA_MENU" | "CATALOG";
type Banner = { id?: string; placement: Placement; title: string; subtitle: string; image: string | null; mobileImage: string | null; buttonLabel: string; link: string; active: boolean; startsAt: string; endsAt: string };

const PLACEMENTS: { value: Placement; label: string; hint: string }[] = [
  { value: "ANNOUNCEMENT", label: "Рядок оголошень", hint: "Повідомлення, що змінюються у верхньому рядку (заголовок + посилання)" },
  { value: "MEGA_MENU", label: "Мега-меню", hint: "Промо-плитки в мега-меню на десктопі (перші 2)" },
  { value: "CATALOG", label: "Каталог", hint: "Зарезервовано для розміщень у каталозі" },
  { value: "HOMEPAGE", label: "Головна", hint: "Промо-банери для головної сторінки" },
];

export function BannersManager({ banners }: { banners: (Banner & { id: string })[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<Banner | null>(null);
  const now = new Date();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ placement: "ANNOUNCEMENT", title: "", subtitle: "", image: null, mobileImage: null, buttonLabel: "", link: "", active: true, startsAt: "", endsAt: "" })}>
          <Plus /> Додати банер
        </Button>
      </div>
      <div className="space-y-4">
        {PLACEMENTS.map((p) => {
          const list = banners.filter((b) => b.placement === p.value);
          return (
            <Card key={p.value}>
              <CardHeader>
                <div>
                  <CardTitle>{p.label}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">{p.hint}</p>
                </div>
              </CardHeader>
              <ul className="divide-y divide-border">
                {list.map((b) => {
                  const scheduled = (b.startsAt && new Date(b.startsAt) > now) || (b.endsAt && new Date(b.endsAt) < now);
                  return (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                      {p.value !== "ANNOUNCEMENT" && <div className="relative h-10 w-16 shrink-0 bg-muted">{b.image && <Image src={b.image} alt="" fill sizes="64px" className="object-cover" />}</div>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {b.title} {!b.active && <Badge variant="warning">вимкнено</Badge>} {scheduled && <Badge variant="muted">за розкладом</Badge>}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{b.link || "без посилання"}</p>
                      </div>
                      <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveBanner(b.id, -1), { silent: true })} aria-label="Вгору">
                        <ArrowUp className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveBanner(b.id, 1), { silent: true })} aria-label="Вниз">
                        <ArrowDown className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted" onClick={() => setEditing(b)} aria-label="Редагувати">
                        <Pencil className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm("Видалити банер?") && run(() => deleteBanner(b.id))} aria-label="Видалити">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">Банерів немає</li>}
              </ul>
            </Card>
          );
        })}
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{editing?.id ? "Редагування банера" : "Новий банер"}</DialogTitle>
          {editing && (
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await run(() => saveBanner({ ...editing, startsAt: editing.startsAt || null, endsAt: editing.endsAt || null }));
                if (res?.ok) setEditing(null);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Розміщення</Label>
                  <NativeSelect value={editing.placement} onChange={(e) => setEditing({ ...editing, placement: e.target.value as Placement })}>
                    {PLACEMENTS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label>Заголовок *</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Підзаголовок</Label>
                  <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Посилання</Label>
                  <Input value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/shop?flag=sale" />
                </div>
                <div className="space-y-1.5">
                  <Label>Текст кнопки</Label>
                  <Input value={editing.buttonLabel} onChange={(e) => setEditing({ ...editing, buttonLabel: e.target.value })} />
                </div>
              </div>
              {editing.placement !== "ANNOUNCEMENT" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <MediaField label="Зображення" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
                  <MediaField label="Зображення для мобільних" value={editing.mobileImage} onChange={(v) => setEditing({ ...editing, mobileImage: v })} />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Початок показу</Label>
                  <Input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Кінець показу</Label>
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
