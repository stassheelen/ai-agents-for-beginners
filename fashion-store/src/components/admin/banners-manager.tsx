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
  { value: "ANNOUNCEMENT", label: "Announcement bar", hint: "Rotating messages in the top bar (title + link)" },
  { value: "MEGA_MENU", label: "Mega menu", hint: "Promo tiles inside the desktop mega menu (first 2)" },
  { value: "CATALOG", label: "Catalog", hint: "Reserved for catalog placements" },
  { value: "HOMEPAGE", label: "Homepage", hint: "Reusable homepage promo banners" },
];

export function BannersManager({ banners }: { banners: (Banner & { id: string })[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<Banner | null>(null);
  const now = new Date();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ placement: "ANNOUNCEMENT", title: "", subtitle: "", image: null, mobileImage: null, buttonLabel: "", link: "", active: true, startsAt: "", endsAt: "" })}>
          <Plus /> Add banner
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
                          {b.title} {!b.active && <Badge variant="warning">off</Badge>} {scheduled && <Badge variant="muted">scheduled</Badge>}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{b.link || "no link"}</p>
                      </div>
                      <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveBanner(b.id, -1), { silent: true })} aria-label="Up">
                        <ArrowUp className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveBanner(b.id, 1), { silent: true })} aria-label="Down">
                        <ArrowDown className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted" onClick={() => setEditing(b)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm("Delete banner?") && run(() => deleteBanner(b.id))} aria-label="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No banners</li>}
              </ul>
            </Card>
          );
        })}
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{editing?.id ? "Edit banner" : "New banner"}</DialogTitle>
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
                  <Label>Placement</Label>
                  <NativeSelect value={editing.placement} onChange={(e) => setEditing({ ...editing, placement: e.target.value as Placement })}>
                    {PLACEMENTS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Link</Label>
                  <Input value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/shop?flag=sale" />
                </div>
                <div className="space-y-1.5">
                  <Label>Button text</Label>
                  <Input value={editing.buttonLabel} onChange={(e) => setEditing({ ...editing, buttonLabel: e.target.value })} />
                </div>
              </div>
              {editing.placement !== "ANNOUNCEMENT" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <MediaField label="Image" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
                  <MediaField label="Mobile image" value={editing.mobileImage} onChange={(v) => setEditing({ ...editing, mobileImage: v })} />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ends at</Label>
                  <Input type="datetime-local" value={editing.endsAt} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
