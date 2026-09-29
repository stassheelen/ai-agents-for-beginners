"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCollection, moveCollection, saveCollection } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, Switch } from "@/components/ui/overlay";
import { slugify } from "@/lib/utils";
import { MediaField } from "./media";
import { ProductPicker, type PickedProduct } from "./product-picker";
import { useAdminAction } from "./use-action";

type Col = { id?: string; name: string; slug: string; description: string; heroImage: string | null; seoTitle: string; seoDescription: string; published: boolean; products: PickedProduct[] };

const EMPTY: Col = { name: "", slug: "", description: "", heroImage: null, seoTitle: "", seoDescription: "", published: true, products: [] };

export function CollectionsManager({ collections }: { collections: (Col & { id: string })[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<Col | null>(null);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
          <Plus /> Додати колекцію
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <div className="relative aspect-[16/9] bg-muted">{c.heroImage && <Image src={c.heroImage} alt="" fill sizes="400px" className="object-cover" />}</div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-medium">
                {c.name} {!c.published && <Badge variant="warning">приховано</Badge>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                /collections/{c.slug} · товарів: {c.products.length}
              </p>
              <div className="mt-auto flex items-center gap-0.5 pt-3">
                <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveCollection(c.id, -1), { silent: true })} aria-label="Вгору">
                  <ArrowUp className="size-4" />
                </button>
                <button className="p-1.5 hover:bg-muted" disabled={pending} onClick={() => run(() => moveCollection(c.id, 1), { silent: true })} aria-label="Вниз">
                  <ArrowDown className="size-4" />
                </button>
                <a href={`/collections/${c.slug}`} target="_blank" className="p-1.5 hover:bg-muted" aria-label="Переглянути">
                  <ExternalLink className="size-4" />
                </a>
                <button className="ml-auto p-1.5 hover:bg-muted" onClick={() => setEditing({ ...c })} aria-label="Редагувати">
                  <Pencil className="size-4" />
                </button>
                <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm(`Видалити «${c.name}»? Товари не буде видалено.`) && run(() => deleteCollection(c.id))} aria-label="Видалити">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{editing?.id ? "Редагування колекції" : "Нова колекція"}</DialogTitle>
          {editing && (
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await run(() => saveCollection({ ...editing, productIds: editing.products.map((p) => p.id) }));
                if (res?.ok) setEditing(null);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Назва *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Адреса (slug)</Label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Опис</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-20" />
              </div>
              <MediaField label="Головне зображення" value={editing.heroImage} onChange={(v) => setEditing({ ...editing, heroImage: v })} />
              <div className="space-y-1.5">
                <Label>Товари</Label>
                <ProductPicker value={editing.products} onChange={(products) => setEditing({ ...editing, products })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>SEO-заголовок</Label>
                  <Input value={editing.seoTitle} onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO-опис</Label>
                  <Input value={editing.seoDescription} onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} /> Опубліковано
              </label>
              <div className="flex justify-end gap-2 pt-2">
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
