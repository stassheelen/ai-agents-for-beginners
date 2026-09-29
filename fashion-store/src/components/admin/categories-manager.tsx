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
          <Plus /> Add category
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
                  {cat.name} {!cat.published && <Badge variant="warning">hidden</Badge>} {cat.showInNav && <Badge variant="muted">nav</Badge>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  /shop/{cat.slug} · {cat.products} products
                </p>
              </div>
              <div className="flex items-center">
                <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending} onClick={() => run(() => moveCategory(cat.id, -1), { silent: true })} aria-label="Move up">
                  <ArrowUp className="size-4" />
                </button>
                <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending} onClick={() => run(() => moveCategory(cat.id, 1), { silent: true })} aria-label="Move down">
                  <ArrowDown className="size-4" />
                </button>
                <a href={`/shop/${cat.slug}`} target="_blank" className="p-1.5 hover:bg-muted" aria-label="View">
                  <ExternalLink className="size-4" />
                </a>
                <button className="p-1.5 hover:bg-muted" onClick={() => setEditing({ ...cat })} aria-label="Edit">
                  <Pencil className="size-4" />
                </button>
                <button
                  className="p-1.5 hover:bg-muted hover:text-destructive"
                  onClick={() => confirm(`Delete “${cat.name}”? Subcategories move up one level; products stay in the catalog.`) && run(() => deleteCategory(cat.id))}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
          {tree.length === 0 && <li className="px-4 py-12 text-center text-muted-foreground">No categories yet</li>}
        </ul>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle>
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
                  <Label>Name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Parent category</Label>
                <NativeSelect value={editing.parentId ?? ""} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}>
                  <option value="">— top level —</option>
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
                <Label>Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="min-h-20" />
              </div>
              <MediaField label="Image" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>SEO title</Label>
                  <Input value={editing.seoTitle} onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO description</Label>
                  <Input value={editing.seoDescription} onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2">
                  <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} /> Published
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={editing.showInNav} onCheckedChange={(v) => setEditing({ ...editing, showInNav: v })} /> Show in navigation (top level)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
