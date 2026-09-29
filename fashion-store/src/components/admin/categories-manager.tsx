"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, CornerDownRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, moveCategory, saveCategory } from "@/actions/admin/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, Switch } from "@/components/ui/overlay";
import { slugify } from "@/lib/utils";
import { MediaField } from "./media";
import { useAdminAction } from "./use-action";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  image: string | null;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  showInNav: boolean;
  products: number;
};

const EMPTY: Omit<Cat, "id" | "products"> & { id?: string } = { name: "", slug: "", parentId: null, description: "", image: null, seoTitle: "", seoDescription: "", published: true, showInNav: false };

export function CategoriesManager({ categories }: { categories: Cat[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<(typeof EMPTY) | null>(null);

  const tree: { cat: Cat; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of categories.filter((x) => x.parentId === parentId)) {
      tree.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
          <Plus /> Додати категорію
        </Button>
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {tree.map(({ cat, depth }) => (
            <li key={cat.id} className="flex items-center gap-3 px-4 py-2.5" style={{ paddingLeft: 16 + depth * 28 }}>
              {depth > 0 && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />}
              <div className="relative size-9 shrink-0 bg-muted">{cat.image && <Image src={cat.image} alt="" fill sizes="36px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {cat.name} {!cat.published && <Badge variant="warning">приховано</Badge>} {cat.showInNav && <Badge variant="muted">у меню</Badge>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  /shop/{cat.slug} · товарів: {cat.products}
                </p>
              </div>
              <div className="flex items-center">
                <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending} onClick={() => run(() => moveCategory(cat.id, -1), { silent: true })} aria-label="Вгору">
                  <ArrowUp className="size-4" />
                </button>
                <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending} onClick={() => run(() => moveCategory(cat.id, 1), { silent: true })} aria-label="Вниз">
                  <ArrowDown className="size-4" />
                </button>
                <a href={`/shop/${cat.slug}`} target="_blank" className="p-1.5 hover:bg-muted" aria-label="Переглянути">
                  <ExternalLink className="size-4" />
                </a>
                <button className="p-1.5 hover:bg-muted" onClick={() => setEditing({ ...cat })} aria-label="Редагувати">
                  <Pencil className="size-4" />
                </button>
                <button
                  className="p-1.5 hover:bg-muted hover:text-destructive"
                  onClick={() => confirm(`Видалити «${cat.name}»? Підкатегорії піднімуться на рівень вище, товари залишаться в каталозі.`) && run(() => deleteCategory(cat.id))}
                  aria-label="Видалити"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
          {tree.length === 0 && <li className="px-4 py-12 text-center text-muted-foreground">Категорій ще немає</li>}
        </ul>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{editing?.id ? "Редагування категорії" : "Нова категорія"}</DialogTitle>
          {editing && (
            <form
              className="mt-5 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await run(() => saveCategory(editing));
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
                <Label>Батьківська категорія</Label>
                <NativeSelect value={editing.parentId ?? ""} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}>
                  <option value="">— верхній рівень —</option>
                  {tree
                    .filter(({ cat }) => cat.id !== editing.id)
                    .map(({ cat, depth }) => (
                      <option key={cat.id} value={cat.id}>
                        {"— ".repeat(depth)}
                        {cat.name}
                      </option>
                    ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Опис</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-20" />
              </div>
              <MediaField label="Зображення" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
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
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} /> Опубліковано
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={editing.showInNav} onCheckedChange={(v) => setEditing({ ...editing, showInNav: v })} /> Показувати в меню (для верхнього рівня)
                </label>
              </div>
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
