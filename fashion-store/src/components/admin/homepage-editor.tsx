"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteSection, duplicateSection, moveSection, saveSection, toggleSection, type SectionInput } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Switch } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { MediaField } from "./media";
import { useAdminAction } from "./use-action";

type SectionType = SectionInput["type"];
type Config = { source?: string; limit?: number; slug?: string; slugs?: string[]; layout?: "left" | "right"; align?: "left" | "center"; height?: "full" | "large" | "medium" };

export type SectionRow = {
  id?: string;
  type: SectionType;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  image: string | null;
  mobileImage: string | null;
  videoUrl: string | null;
  buttonLabel: string;
  buttonLink: string;
  button2Label: string;
  button2Link: string;
  background: string;
  textColor: string;
  active: boolean;
  config: Config;
};

const TYPES: { type: SectionType; label: string; hint: string }[] = [
  { type: "HERO", label: "Hero", hint: "Full-width image / video with headline and 2 buttons" },
  { type: "PRODUCT_CAROUSEL", label: "Product carousel", hint: "Horizontal scroll of products from a source" },
  { type: "PRODUCT_GRID", label: "Product grid", hint: "Grid of products from a source" },
  { type: "CATEGORY_GRID", label: "Category grid", hint: "Category tiles with images" },
  { type: "IMAGE_TEXT", label: "Image + text", hint: "Editorial split block" },
  { type: "BANNER", label: "Banner", hint: "Wide promo banner with CTA" },
  { type: "COLLECTION", label: "Collection", hint: "Collection tiles (all or one)" },
  { type: "VIDEO", label: "Video", hint: "Autoplay muted video" },
  { type: "TEXT", label: "Text section", hint: "Brand statement" },
];

const SOURCES = [
  { value: "new", label: "New products (flag)" },
  { value: "latest", label: "Latest added" },
  { value: "bestseller", label: "Best sellers" },
  { value: "featured", label: "Featured / trending" },
  { value: "sale", label: "On sale" },
  { value: "collection", label: "From a collection" },
  { value: "category", label: "From a category" },
];

const blank = (type: SectionType): SectionRow => ({
  type,
  label: "",
  title: "",
  subtitle: "",
  body: "",
  image: null,
  mobileImage: null,
  videoUrl: null,
  buttonLabel: "",
  buttonLink: "",
  button2Label: "",
  button2Link: "",
  background: "",
  textColor: "",
  active: true,
  config: type === "PRODUCT_CAROUSEL" || type === "PRODUCT_GRID" ? { source: "new", limit: 8 } : type === "HERO" ? { height: "full", align: "left" } : {},
});

export function HomepageEditor({ sections, categories, collections }: { sections: SectionRow[]; categories: { name: string; slug: string; parentId: string | null }[]; collections: { name: string; slug: string }[] }) {
  const { run, pending } = useAdminAction();
  const [editing, setEditing] = React.useState<SectionRow | null>(null);

  const addMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus /> Add section
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        {TYPES.map((t) => (
          <DropdownMenuItem key={t.type} onSelect={() => setEditing(blank(t.type))} className="flex-col items-start gap-0">
            <span className="font-medium">{t.label}</span>
            <span className="text-[11px] text-muted-foreground">{t.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <a href="/" target="_blank" className="text-xs underline">
          Open homepage ↗
        </a>
        {addMenu}
      </div>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <Card key={s.id} className={cn("flex items-center gap-4 p-3", !s.active && "opacity-60")}>
            <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
            <div className="relative h-14 w-20 shrink-0 bg-muted">{s.image && <Image src={s.image} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{TYPES.find((t) => t.type === s.type)?.label}</Badge>
                {!s.active && <Badge variant="warning">hidden</Badge>}
              </div>
              <p className="mt-1 truncate font-medium">{s.title || s.label || "Untitled"}</p>
              {s.config.source && <p className="text-[11px] text-muted-foreground">Source: {SOURCES.find((x) => x.value === s.config.source)?.label} {s.config.slug && `· ${s.config.slug}`} · {s.config.limit ?? 8} items</p>}
            </div>
            <div className="flex items-center">
              <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending || i === 0} onClick={() => run(() => moveSection(s.id!, -1), { silent: true })} aria-label="Move up">
                <ArrowUp className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending || i === sections.length - 1} onClick={() => run(() => moveSection(s.id!, 1), { silent: true })} aria-label="Move down">
                <ArrowDown className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => run(() => toggleSection(s.id!, !s.active))} aria-label={s.active ? "Hide" : "Show"}>
                {s.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => run(() => duplicateSection(s.id!))} aria-label="Duplicate">
                <Copy className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => setEditing(s)} aria-label="Edit">
                <Pencil className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm("Delete this section?") && run(() => deleteSection(s.id!))} aria-label="Delete">
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
        {sections.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-lg">The homepage is empty</p>
            {addMenu}
          </Card>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>
            {editing?.id ? "Edit" : "New"} section · {TYPES.find((t) => t.type === editing?.type)?.label}
          </DialogTitle>
          {editing && <SectionForm value={editing} onChange={setEditing} categories={categories} collections={collections} onCancel={() => setEditing(null)} onSubmit={async () => {
            const { config, ...rest } = editing;
            const res = await run(() =>
              saveSection({
                ...rest,
                config: {
                  ...config,
                  source: config.source as "new" | undefined,
                  slugs: config.slugs?.filter(Boolean),
                },
              }),
            );
            if (res?.ok) setEditing(null);
          }} pending={pending} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionForm({
  value: s,
  onChange,
  categories,
  collections,
  onSubmit,
  onCancel,
  pending,
}: {
  value: SectionRow;
  onChange: (v: SectionRow) => void;
  categories: { name: string; slug: string; parentId: string | null }[];
  collections: { name: string; slug: string }[];
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const set = <K extends keyof SectionRow>(k: K, v: SectionRow[K]) => onChange({ ...s, [k]: v });
  const setCfg = (patch: Partial<Config>) => onChange({ ...s, config: { ...s.config, ...patch } });
  const t = s.type;
  const has = {
    label: ["HERO", "IMAGE_TEXT", "BANNER", "TEXT"].includes(t),
    subtitle: t !== "TEXT",
    body: ["IMAGE_TEXT", "TEXT"].includes(t),
    image: ["HERO", "IMAGE_TEXT", "BANNER", "VIDEO"].includes(t),
    mobileImage: ["HERO", "BANNER"].includes(t),
    video: ["HERO", "VIDEO"].includes(t),
    button2: t === "HERO",
    colors: ["HERO", "IMAGE_TEXT", "BANNER", "TEXT", "VIDEO", "PRODUCT_CAROUSEL", "PRODUCT_GRID"].includes(t),
    products: ["PRODUCT_CAROUSEL", "PRODUCT_GRID"].includes(t),
  };

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {has.label && (
          <div className="space-y-1.5">
            <Label>Label (small text above title)</Label>
            <Input value={s.label} onChange={(e) => set("label", e.target.value)} />
          </div>
        )}
        <div className={cn("space-y-1.5", !has.label && "sm:col-span-2")}>
          <Label>Title</Label>
          <Input value={s.title} onChange={(e) => set("title", e.target.value)} />
        </div>
      </div>
      {has.subtitle && (
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Input value={s.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
      )}
      {has.body && (
        <div className="space-y-1.5">
          <Label>Text</Label>
          <Textarea value={s.body} onChange={(e) => set("body", e.target.value)} />
        </div>
      )}

      {has.products && (
        <div className="grid gap-4 border border-border bg-soft p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Products source</Label>
            <NativeSelect value={s.config.source ?? "new"} onChange={(e) => setCfg({ source: e.target.value, slug: undefined })}>
              {SOURCES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {(s.config.source === "collection" || s.config.source === "category") && (
            <div className="space-y-1.5">
              <Label>{s.config.source === "collection" ? "Collection" : "Category"}</Label>
              <NativeSelect value={s.config.slug ?? ""} onChange={(e) => setCfg({ slug: e.target.value })}>
                <option value="">Choose…</option>
                {(s.config.source === "collection" ? collections : categories).map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Number of products</Label>
            <Input type="number" min={1} max={24} value={s.config.limit ?? 8} onChange={(e) => setCfg({ limit: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {t === "CATEGORY_GRID" && (
        <div className="space-y-1.5">
          <Label>Categories (in order)</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = s.config.slugs?.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCfg({ slugs: on ? s.config.slugs!.filter((x) => x !== c.slug) : [...(s.config.slugs ?? []), c.slug] })}
                  className={cn("border px-3 py-1.5 text-xs", on ? "border-foreground bg-foreground text-white" : "border-border bg-white")}
                >
                  {c.name}
                  {on && ` · ${s.config.slugs!.indexOf(c.slug) + 1}`}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">Leave empty to show subcategories that have images.</p>
        </div>
      )}

      {t === "COLLECTION" && (
        <div className="space-y-1.5">
          <Label>Collection</Label>
          <NativeSelect value={s.config.slug ?? ""} onChange={(e) => setCfg({ slug: e.target.value || undefined })}>
            <option value="">All collections (first 3)</option>
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {(has.image || has.mobileImage) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {has.image && <MediaField label="Image (desktop)" value={s.image} onChange={(v) => set("image", v)} hint={t === "VIDEO" ? "Used as poster" : undefined} />}
          {has.mobileImage && <MediaField label="Mobile image" value={s.mobileImage} onChange={(v) => set("mobileImage", v)} hint="Optional portrait crop for phones" />}
        </div>
      )}
      {has.video && <MediaField type="VIDEO" label="Video" value={s.videoUrl} onChange={(v) => set("videoUrl", v)} hint="MP4 / WEBM. Plays muted & looped. Overrides the image in Hero." />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Button text</Label>
          <Input value={s.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Button link</Label>
          <Input value={s.buttonLink} onChange={(e) => set("buttonLink", e.target.value)} placeholder="/shop?flag=new" />
        </div>
        {has.button2 && (
          <>
            <div className="space-y-1.5">
              <Label>Second button text</Label>
              <Input value={s.button2Label} onChange={(e) => set("button2Label", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Second button link</Label>
              <Input value={s.button2Link} onChange={(e) => set("button2Link", e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {has.colors && (
          <>
            <ColorInput label="Background" value={s.background} onChange={(v) => set("background", v)} />
            <ColorInput label="Text color" value={s.textColor} onChange={(v) => set("textColor", v)} />
          </>
        )}
        {t === "HERO" && (
          <div className="space-y-1.5">
            <Label>Height</Label>
            <NativeSelect value={s.config.height ?? "full"} onChange={(e) => setCfg({ height: e.target.value as "full" })}>
              <option value="full">Full screen</option>
              <option value="large">Large (75%)</option>
              <option value="medium">Medium (60%)</option>
            </NativeSelect>
          </div>
        )}
        {(t === "HERO" || t === "TEXT") && (
          <div className="space-y-1.5">
            <Label>Text alignment</Label>
            <NativeSelect value={s.config.align ?? (t === "TEXT" ? "center" : "left")} onChange={(e) => setCfg({ align: e.target.value as "left" })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </NativeSelect>
          </div>
        )}
        {t === "IMAGE_TEXT" && (
          <div className="space-y-1.5">
            <Label>Image position</Label>
            <NativeSelect value={s.config.layout ?? "left"} onChange={(e) => setCfg({ layout: e.target.value as "left" })}>
              <option value="left">Image left</option>
              <option value="right">Image right</option>
            </NativeSelect>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2">
        <Switch checked={s.active} onCheckedChange={(v) => set("active", v)} /> Active (visible on the homepage)
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          Save section
        </Button>
      </div>
    </form>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-11 w-12 shrink-0 cursor-pointer border border-input" aria-label={label} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="default" />
      </div>
    </div>
  );
}
