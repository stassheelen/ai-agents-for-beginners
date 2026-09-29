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
  { type: "HERO", label: "Головний банер (Hero)", hint: "Фото / відео на всю ширину із заголовком і двома кнопками" },
  { type: "PRODUCT_CAROUSEL", label: "Карусель товарів", hint: "Горизонтальна стрічка товарів із вибраного джерела" },
  { type: "PRODUCT_GRID", label: "Сітка товарів", hint: "Сітка товарів із вибраного джерела" },
  { type: "CATEGORY_GRID", label: "Сітка категорій", hint: "Плитки категорій із зображеннями" },
  { type: "IMAGE_TEXT", label: "Зображення + текст", hint: "Редакційний блок у дві колонки" },
  { type: "BANNER", label: "Банер", hint: "Широкий промо-банер із кнопкою" },
  { type: "COLLECTION", label: "Колекції", hint: "Плитки колекцій (усі або одна)" },
  { type: "VIDEO", label: "Відео", hint: "Відео з автозапуском без звуку" },
  { type: "TEXT", label: "Текстовий блок", hint: "Заява бренду" },
];

const SOURCES = [
  { value: "new", label: "Новинки (позначка)" },
  { value: "latest", label: "Останні додані" },
  { value: "bestseller", label: "Бестселери" },
  { value: "featured", label: "Рекомендовані / у тренді" },
  { value: "sale", label: "Зі знижкою" },
  { value: "collection", label: "З колекції" },
  { value: "category", label: "З категорії" },
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
          <Plus /> Додати секцію
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
          Відкрити головну ↗
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
                {!s.active && <Badge variant="warning">приховано</Badge>}
              </div>
              <p className="mt-1 truncate font-medium">{s.title || s.label || "Без назви"}</p>
              {s.config.source && <p className="text-[11px] text-muted-foreground">Джерело: {SOURCES.find((x) => x.value === s.config.source)?.label} {s.config.slug && `· ${s.config.slug}`} · товарів: {s.config.limit ?? 8}</p>}
            </div>
            <div className="flex items-center">
              <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending || i === 0} onClick={() => run(() => moveSection(s.id!, -1), { silent: true })} aria-label="Вгору">
                <ArrowUp className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pending || i === sections.length - 1} onClick={() => run(() => moveSection(s.id!, 1), { silent: true })} aria-label="Вниз">
                <ArrowDown className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => run(() => toggleSection(s.id!, !s.active))} aria-label={s.active ? "Приховати" : "Показати"}>
                {s.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => run(() => duplicateSection(s.id!))} aria-label="Дублювати">
                <Copy className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted" onClick={() => setEditing(s)} aria-label="Редагувати">
                <Pencil className="size-4" />
              </button>
              <button className="p-1.5 hover:bg-muted hover:text-destructive" onClick={() => confirm("Видалити цю секцію?") && run(() => deleteSection(s.id!))} aria-label="Видалити">
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
        {sections.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-lg">Головна сторінка порожня</p>
            {addMenu}
          </Card>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>
            {editing?.id ? "Редагування секції" : "Нова секція"} · {TYPES.find((t) => t.type === editing?.type)?.label}
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
            <Label>Надзаголовок (дрібний текст над заголовком)</Label>
            <Input value={s.label} onChange={(e) => set("label", e.target.value)} />
          </div>
        )}
        <div className={cn("space-y-1.5", !has.label && "sm:col-span-2")}>
          <Label>Заголовок</Label>
          <Input value={s.title} onChange={(e) => set("title", e.target.value)} />
        </div>
      </div>
      {has.subtitle && (
        <div className="space-y-1.5">
          <Label>Підзаголовок</Label>
          <Input value={s.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
      )}
      {has.body && (
        <div className="space-y-1.5">
          <Label>Текст</Label>
          <Textarea value={s.body} onChange={(e) => set("body", e.target.value)} />
        </div>
      )}

      {has.products && (
        <div className="grid gap-4 border border-border bg-soft p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Джерело товарів</Label>
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
              <Label>{s.config.source === "collection" ? "Колекція" : "Категорія"}</Label>
              <NativeSelect value={s.config.slug ?? ""} onChange={(e) => setCfg({ slug: e.target.value })}>
                <option value="">Оберіть…</option>
                {(s.config.source === "collection" ? collections : categories).map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Кількість товарів</Label>
            <Input type="number" min={1} max={24} value={s.config.limit ?? 8} onChange={(e) => setCfg({ limit: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {t === "CATEGORY_GRID" && (
        <div className="space-y-1.5">
          <Label>Категорії (у порядку показу)</Label>
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
          <p className="text-[11px] text-muted-foreground">Залиште порожнім, щоб показати підкатегорії із зображеннями.</p>
        </div>
      )}

      {t === "COLLECTION" && (
        <div className="space-y-1.5">
          <Label>Колекція</Label>
          <NativeSelect value={s.config.slug ?? ""} onChange={(e) => setCfg({ slug: e.target.value || undefined })}>
            <option value="">Усі колекції (перші 3)</option>
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
          {has.image && <MediaField label="Зображення (десктоп)" value={s.image} onChange={(v) => set("image", v)} hint={t === "VIDEO" ? "Використовується як обкладинка" : undefined} />}
          {has.mobileImage && <MediaField label="Зображення для мобільних" value={s.mobileImage} onChange={(v) => set("mobileImage", v)} hint="Необовʼязково: вертикальний кадр для телефонів" />}
        </div>
      )}
      {has.video && <MediaField type="VIDEO" label="Відео" value={s.videoUrl} onChange={(v) => set("videoUrl", v)} hint="MP4 / WEBM. Відтворюється без звуку по колу. У Hero замінює зображення." />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Текст кнопки</Label>
          <Input value={s.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Посилання кнопки</Label>
          <Input value={s.buttonLink} onChange={(e) => set("buttonLink", e.target.value)} placeholder="/shop?flag=new" />
        </div>
        {has.button2 && (
          <>
            <div className="space-y-1.5">
              <Label>Текст другої кнопки</Label>
              <Input value={s.button2Label} onChange={(e) => set("button2Label", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Посилання другої кнопки</Label>
              <Input value={s.button2Link} onChange={(e) => set("button2Link", e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {has.colors && (
          <>
            <ColorInput label="Фон" value={s.background} onChange={(v) => set("background", v)} />
            <ColorInput label="Колір тексту" value={s.textColor} onChange={(v) => set("textColor", v)} />
          </>
        )}
        {t === "HERO" && (
          <div className="space-y-1.5">
            <Label>Висота</Label>
            <NativeSelect value={s.config.height ?? "full"} onChange={(e) => setCfg({ height: e.target.value as "full" })}>
              <option value="full">На весь екран</option>
              <option value="large">Велика (75%)</option>
              <option value="medium">Середня (60%)</option>
            </NativeSelect>
          </div>
        )}
        {(t === "HERO" || t === "TEXT") && (
          <div className="space-y-1.5">
            <Label>Вирівнювання тексту</Label>
            <NativeSelect value={s.config.align ?? (t === "TEXT" ? "center" : "left")} onChange={(e) => setCfg({ align: e.target.value as "left" })}>
              <option value="left">Ліворуч</option>
              <option value="center">По центру</option>
            </NativeSelect>
          </div>
        )}
        {t === "IMAGE_TEXT" && (
          <div className="space-y-1.5">
            <Label>Розташування зображення</Label>
            <NativeSelect value={s.config.layout ?? "left"} onChange={(e) => setCfg({ layout: e.target.value as "left" })}>
              <option value="left">Зображення ліворуч</option>
              <option value="right">Зображення праворуч</option>
            </NativeSelect>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2">
        <Switch checked={s.active} onCheckedChange={(v) => set("active", v)} /> Активна (показується на головній)
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Скасувати
        </Button>
        <Button type="submit" disabled={pending}>
          Зберегти секцію
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
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="за замовчуванням" />
      </div>
    </div>
  );
}
