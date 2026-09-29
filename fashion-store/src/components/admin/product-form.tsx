"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Check, ExternalLink, GripVertical, ImagePlus, Loader2, Plus, Star, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { saveProduct, type ProductInput } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/misc";
import { Switch } from "@/components/ui/overlay";
import { cn, fromMinor, slugify, toMinor } from "@/lib/utils";
import { Dropzone, MediaPickerDialog, useUploader } from "./media";
import { ProductStatusBadge } from "./status";

export type ProductFormData = {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  shortDescription: string;
  brand: string;
  categoryId: string;
  subcategoryId: string;
  collectionIds: string[];
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  currency: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  onSale: boolean;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  tags: string[];
  details: string;
  material: string;
  careInstructions: string;
  shippingInfo: string;
  returnInfo: string;
  images: { url: string; alt: string; colorName: string }[];
  variants: { id?: string; sku: string; color: string; colorHex: string; size: string; stock: number; price: number | null }[];
};

type CategoryOpt = { id: string; name: string; parentId: string | null };
type ColorOpt = { name: string; hex: string };

const STEPS = ["Основна інформація", "Категорія", "Ціни", "Варіанти", "Фото", "SEO", "Публікація"] as const;
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

type VariantRow = { key: string; id?: string; sku: string; color: string; colorHex: string; size: string; stock: string; price: string };
type ImageRow = { key: string; url: string; alt: string; colorName: string };

let keySeq = 0;
const k = () => `k${++keySeq}`;

function code(s: string) {
  return s.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3) || "X";
}

export function ProductForm({
  initial,
  categories,
  collections,
  colors,
}: {
  initial: ProductFormData | null;
  categories: CategoryOpt[];
  collections: { id: string; name: string }[];
  colors: ColorOpt[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState<null | "draft" | "publish" | "save">(null);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial?.slug));
  const [f, setF] = React.useState(() => ({
    name: initial?.name ?? "",
    sku: initial?.sku ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    shortDescription: initial?.shortDescription ?? "",
    brand: initial?.brand ?? "",
    categoryId: initial?.categoryId ?? "",
    subcategoryId: initial?.subcategoryId ?? "",
    collectionIds: initial?.collectionIds ?? [],
    price: initial ? fromMinor(initial.price) : "",
    compareAtPrice: fromMinor(initial?.compareAtPrice),
    costPrice: fromMinor(initial?.costPrice),
    currency: initial?.currency ?? "UAH",
    status: initial?.status ?? "DRAFT",
    featured: initial?.featured ?? false,
    isNew: initial?.isNew ?? true,
    bestSeller: initial?.bestSeller ?? false,
    onSale: initial?.onSale ?? false,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    ogImage: initial?.ogImage ?? "",
    tags: (initial?.tags ?? []).join(", "),
    details: initial?.details ?? "",
    material: initial?.material ?? "",
    careInstructions: initial?.careInstructions ?? "",
    shippingInfo: initial?.shippingInfo ?? "",
    returnInfo: initial?.returnInfo ?? "",
  }));
  const [variants, setVariants] = React.useState<VariantRow[]>(
    () =>
      initial?.variants.map((v) => ({ key: k(), id: v.id, sku: v.sku, color: v.color, colorHex: v.colorHex || "#888888", size: v.size, stock: String(v.stock), price: fromMinor(v.price) })) ?? [],
  );
  const [images, setImages] = React.useState<ImageRow[]>(() => initial?.images.map((i) => ({ key: k(), ...i })) ?? []);
  const [dirty, setDirty] = React.useState(false);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => {
    setF((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setDirty(true);
  };

  React.useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  const parents = categories.filter((c) => !c.parentId);
  const children = categories.filter((c) => c.parentId && c.parentId === f.categoryId);
  const variantColors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  const save = async (mode: "draft" | "publish" | "save") => {
    const status = mode === "draft" ? "DRAFT" : mode === "publish" ? "PUBLISHED" : f.status;
    const price = toMinor(f.price);
    if (!f.name.trim()) return failAt(0, "Вкажіть назву товару");
    if (!f.sku.trim()) return failAt(0, "Вкажіть артикул");
    if (price === null) return failAt(2, "Вкажіть ціну продажу");
    if (status === "PUBLISHED" && variants.length === 0) return failAt(3, "Додайте хоча б один варіант перед публікацією");
    for (const v of variants) {
      if (!v.sku.trim()) return failAt(3, "Кожному варіанту потрібен артикул");
    }
    const payload: ProductInput = {
      id: initial?.id,
      name: f.name,
      sku: f.sku,
      slug: f.slug,
      description: f.description,
      shortDescription: f.shortDescription,
      brand: f.brand,
      categoryId: f.categoryId || null,
      subcategoryId: f.subcategoryId || null,
      collectionIds: f.collectionIds,
      price,
      compareAtPrice: toMinor(f.compareAtPrice),
      costPrice: toMinor(f.costPrice),
      currency: f.currency,
      status,
      featured: f.featured,
      isNew: f.isNew,
      bestSeller: f.bestSeller,
      onSale: f.onSale,
      seoTitle: f.seoTitle,
      seoDescription: f.seoDescription,
      ogImage: f.ogImage,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      details: f.details,
      material: f.material,
      careInstructions: f.careInstructions,
      shippingInfo: f.shippingInfo,
      returnInfo: f.returnInfo,
      images: images.map((i) => ({ url: i.url, alt: i.alt || null, colorName: i.colorName || null })),
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku.trim(),
        color: v.color.trim() || null,
        colorHex: v.color.trim() ? v.colorHex : null,
        size: v.size.trim() || null,
        stock: Number(v.stock) || 0,
        price: toMinor(v.price),
      })),
    };
    setSaving(mode);
    try {
      const res = await saveProduct(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDirty(false);
      toast.success(status === "PUBLISHED" ? "Збережено й опубліковано" : "Збережено");
      set("status", status);
      setDirty(false);
      if (!initial?.id && res.data) router.replace(`/admin/products/${res.data.id}`);
      else router.refresh();
    } finally {
      setSaving(null);
    }
  };

  function failAt(s: number, msg: string) {
    setStep(s);
    toast.error(msg);
  }

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-1.5 hover:bg-muted" aria-label="Назад">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-medium">{initial ? f.name || "Редагування товару" : "Новий товар"}</h1>
            {initial && (
              <p className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                <ProductStatusBadge status={f.status} /> {f.sku}
              </p>
            )}
          </div>
        </div>
        {initial && f.status === "PUBLISHED" && (
          <Button asChild variant="ghost" size="sm">
            <a href={`/products/${f.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Переглянути в магазині
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:self-start">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={cn("flex shrink-0 items-center gap-3 px-3 py-2 text-left", step === i ? "bg-foreground text-white" : "hover:bg-muted")}
            >
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]", step === i ? "border-white" : "border-input")}>{i + 1}</span>
              {s}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Крок 1 · Основна інформація</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <Field label="Назва товару *">
                    <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Легінси з високою посадкою" />
                  </Field>
                  <Field label="Артикул (SKU) *" hint="Унікальний код товару. За ним CSV-імпорт знаходить товари.">
                    <Input value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="VL-LG-001" className="font-mono" />
                  </Field>
                </div>
                <Field label="Короткий опис" hint="Показується під ціною на сторінці товару.">
                  <Textarea value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className="min-h-16" maxLength={500} />
                </Field>
                <Field label="Опис">
                  <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} className="min-h-36" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Бренд">
                    <Input value={f.brand} onChange={(e) => set("brand", e.target.value)} />
                  </Field>
                  <Field label="Теги" hint="Через кому — використовуються в пошуку.">
                    <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="легінси, висока посадка" />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Деталі">
                    <Textarea value={f.details} onChange={(e) => set("details", e.target.value)} />
                  </Field>
                  <Field label="Склад">
                    <Textarea value={f.material} onChange={(e) => set("material", e.target.value)} />
                  </Field>
                  <Field label="Догляд">
                    <Textarea value={f.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
                  </Field>
                  <Field label="Доставка">
                    <Textarea value={f.shippingInfo} onChange={(e) => set("shippingInfo", e.target.value)} />
                  </Field>
                  <Field label="Повернення">
                    <Textarea value={f.returnInfo} onChange={(e) => set("returnInfo", e.target.value)} />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Крок 2 · Категорія</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Категорія">
                    <NativeSelect
                      value={f.categoryId}
                      onChange={(e) => {
                        set("categoryId", e.target.value);
                        set("subcategoryId", "");
                      }}
                    >
                      <option value="">— не вибрано —</option>
                      {parents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Підкатегорія">
                    <NativeSelect value={f.subcategoryId} onChange={(e) => set("subcategoryId", e.target.value)} disabled={!children.length}>
                      <option value="">— не вибрано —</option>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field label="Колекції">
                  <div className="flex flex-wrap gap-2">
                    {collections.map((c) => {
                      const on = f.collectionIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => set("collectionIds", on ? f.collectionIds.filter((x) => x !== c.id) : [...f.collectionIds, c.id])}
                          className={cn("inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs", on ? "border-foreground bg-foreground text-white" : "border-border bg-white hover:border-foreground")}
                        >
                          {on && <Check className="size-3" />} {c.name}
                        </button>
                      );
                    })}
                    {collections.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Колекцій ще немає — <Link href="/admin/collections" className="underline">створіть першу</Link>.
                      </p>
                    )}
                  </div>
                </Field>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Крок 3 · Ціни</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Собівартість">
                    <Input inputMode="decimal" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Ціна продажу *">
                    <Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Стара ціна" hint="Показується перекресленою.">
                    <Input inputMode="decimal" value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="—" />
                  </Field>
                  <Field label="Валюта">
                    <NativeSelect value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                      {["UAH", "EUR", "USD", "PLN"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <PricingSummary price={toMinor(f.price)} cost={toMinor(f.costPrice)} compare={toMinor(f.compareAtPrice)} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <VariantsEditor variants={variants} setVariants={(v) => { setVariants(v); setDirty(true); }} productSku={f.sku} colors={colors} />
          )}

          {step === 4 && <ImagesEditor images={images} setImages={(v) => { setImages(v); setDirty(true); }} colors={variantColors} productName={f.name} />}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Крок 6 · SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="SEO-заголовок" hint={`${f.seoTitle.length}/60 рекомендовано`}>
                  <Input value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={f.name} />
                </Field>
                <Field label="SEO-опис" hint={`${f.seoDescription.length}/160 рекомендовано`}>
                  <Textarea value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder={f.shortDescription} className="min-h-20" />
                </Field>
                <Field label="Адреса сторінки (slug)" hint={`/products/${f.slug || "…"}`}>
                  <Input
                    value={f.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", slugify(e.target.value));
                    }}
                  />
                </Field>
                <Field label="OG-зображення (URL)" hint="За замовчуванням — головне фото товару.">
                  <Input value={f.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder={images[0]?.url ?? ""} />
                </Field>
                <div className="border border-border bg-soft p-4">
                  <p className="text-[11px] text-muted-foreground">Попередній перегляд у пошуку</p>
                  <p className="mt-1 text-[15px] text-[#1a0dab]">{f.seoTitle || f.name || "Назва товару"}</p>
                  <p className="text-xs text-[#006621]">/products/{f.slug}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.seoDescription || f.shortDescription || "Опис…"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>Крок 7 · Публікація</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="Статус">
                  <div className="flex gap-2">
                    {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("status", s)}
                        className={cn("border px-4 py-2 text-xs", f.status === s ? "border-foreground bg-foreground text-white" : "border-border bg-white hover:border-foreground")}
                      >
                        {s === "DRAFT" ? "Чернетка" : s === "PUBLISHED" ? "Опубліковано" : "Архів"}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["featured", "Рекомендований", "Показується першим у сортуванні «Рекомендовані» та в «У тренді»"],
                      ["isNew", "Новинка", "Бейдж «Новинка» та розділ «Новинки»"],
                      ["bestSeller", "Бестселер", "Бейдж «Бестселер» та розділ «Бестселери»"],
                      ["onSale", "Знижка", "Бейдж «Знижка» та розділ «Розпродаж» (автоматично, якщо вказана стара ціна)"],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <label key={key} className="flex cursor-pointer items-start justify-between gap-4 border border-border p-4">
                      <span>
                        <span className="font-medium">{label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
                      </span>
                      <Switch checked={f[key]} onCheckedChange={(v) => set(key, v)} />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex justify-between">
            <Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Назад
            </Button>
            {step < STEPS.length - 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s + 1)}>
                Далі: {STEPS[step + 1]}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-2 px-4 py-3 md:px-6 lg:px-8">
          {dirty && <span className="mr-auto text-xs text-muted-foreground">Є незбережені зміни</span>}
          <Button type="button" variant="outline" onClick={() => save("draft")} disabled={Boolean(saving)}>
            {saving === "draft" && <Loader2 className="animate-spin" />} Зберегти чернетку
          </Button>
          <Button type="button" onClick={() => save("publish")} disabled={Boolean(saving)}>
            {saving === "publish" && <Loader2 className="animate-spin" />} Зберегти й опублікувати
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PricingSummary({ price, cost, compare }: { price: number | null; cost: number | null; compare: number | null }) {
  if (!price) return null;
  const margin = cost ? price - cost : null;
  return (
    <div className="grid grid-cols-3 gap-3 border border-border bg-soft p-4 text-xs">
      <div>
        <p className="text-muted-foreground">Маржа</p>
        <p className="mt-1 text-sm font-medium">{margin !== null ? `${(margin / 100).toFixed(2)} (${Math.round((margin / price) * 100)}%)` : "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Націнка</p>
        <p className="mt-1 text-sm font-medium">{cost ? `${Math.round(((price - cost) / cost) * 100)}%` : "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Знижка</p>
        <p className="mt-1 text-sm font-medium">{compare && compare > price ? `−${Math.round(((compare - price) / compare) * 100)}%` : "—"}</p>
      </div>
    </div>
  );
}

function VariantsEditor({ variants, setVariants, productSku, colors }: { variants: VariantRow[]; setVariants: (v: VariantRow[]) => void; productSku: string; colors: ColorOpt[] }) {
  const [genColors, setGenColors] = React.useState<ColorOpt[]>([]);
  const [genSizes, setGenSizes] = React.useState<string[]>(DEFAULT_SIZES);
  const [newColor, setNewColor] = React.useState({ name: "", hex: "#888888" });
  const [customSize, setCustomSize] = React.useState("");
  const [bulkStock, setBulkStock] = React.useState("");

  const update = (key: string, patch: Partial<VariantRow>) => setVariants(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const generate = () => {
    const sizes = genSizes.length ? genSizes : [""];
    const cols = genColors.length ? genColors : [{ name: "", hex: "#888888" }];
    const existing = new Set(variants.map((v) => `${v.color.toLowerCase()}|${v.size.toLowerCase()}`));
    const added: VariantRow[] = [];
    for (const c of cols)
      for (const s of sizes) {
        if (existing.has(`${c.name.toLowerCase()}|${s.toLowerCase()}`)) continue;
        added.push({
          key: k(),
          sku: [productSku || "SKU", c.name && code(c.name), s && s.replace(/[^a-z0-9]/gi, "").toUpperCase()].filter(Boolean).join("-"),
          color: c.name,
          colorHex: c.hex,
          size: s,
          stock: "0",
          price: "",
        });
      }
    if (!added.length) return toast.message("Усі комбінації вже існують");
    setVariants([...variants, ...added]);
    toast.success(`Додано варіантів: ${added.length}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Крок 4 · Варіанти</CardTitle>
          <span className="text-xs text-muted-foreground">{variants.length} варіантів · {variants.reduce((a, v) => a + (Number(v.stock) || 0), 0)} шт.</span>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Кольори</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((c) => {
                const on = genColors.some((g) => g.name === c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setGenColors(on ? genColors.filter((g) => g.name !== c.name) : [...genColors, c])}
                    className={cn("inline-flex items-center gap-2 border px-3 py-1.5 text-xs", on ? "border-foreground bg-foreground text-white" : "border-border bg-white")}
                  >
                    <span className="size-3 rounded-full border border-black/15" style={{ background: c.hex }} /> {c.name}
                  </button>
                );
              })}
              {genColors
                .filter((g) => !colors.some((c) => c.name === g.name))
                .map((g) => (
                  <span key={g.name} className="inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-1.5 text-xs text-white">
                    <span className="size-3 rounded-full" style={{ background: g.hex }} /> {g.name}
                    <button type="button" onClick={() => setGenColors(genColors.filter((x) => x.name !== g.name))} aria-label="Прибрати">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })} placeholder="Назва нового кольору" className="h-8 w-44" />
              <input type="color" value={newColor.hex} onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })} className="h-8 w-10 cursor-pointer border border-input" aria-label="Колір" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  if (!newColor.name.trim()) return;
                  setGenColors([...genColors, { name: newColor.name.trim(), hex: newColor.hex }]);
                  setNewColor({ name: "", hex: "#888888" });
                }}
              >
                <Plus /> Додати
              </Button>
            </div>
          </div>
          <div>
            <Label>Розміри</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[...new Set([...DEFAULT_SIZES, "XXL", "ONE SIZE", ...genSizes])].map((s) => {
                const on = genSizes.includes(s);
                return (
                  <button key={s} type="button" onClick={() => setGenSizes(on ? genSizes.filter((x) => x !== s) : [...genSizes, s])} className={cn("min-w-11 border px-3 py-1.5 text-xs", on ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
                    {s}
                  </button>
                );
              })}
              <Input value={customSize} onChange={(e) => setCustomSize(e.target.value.toUpperCase())} placeholder="Свій" className="h-8 w-24" />
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => customSize && (setGenSizes([...genSizes, customSize]), setCustomSize(""))}>
                <Plus />
              </Button>
            </div>
          </div>
          <Button type="button" onClick={generate} size="sm">
            <Wand2 /> Створити комбінацій: {Math.max(genColors.length, 1) * Math.max(genSizes.length, 1)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">Залишок для всіх:</span>
          <Input value={bulkStock} onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ""))} className="h-8 w-20" />
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => bulkStock && setVariants(variants.map((v) => ({ ...v, stock: bulkStock })))}>
            Застосувати
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-8"
            onClick={() => setVariants([...variants, { key: k(), sku: `${productSku}-${variants.length + 1}`, color: "", colorHex: "#888888", size: "", stock: "0", price: "" }])}
          >
            <Plus /> Додати рядок
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-soft text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Колір</th>
                <th className="px-3 py-2 font-medium">Розмір</th>
                <th className="px-3 py-2 font-medium">Артикул</th>
                <th className="px-3 py-2 font-medium">Залишок</th>
                <th className="px-3 py-2 font-medium">Своя ціна</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={v.colorHex} onChange={(e) => update(v.key, { colorHex: e.target.value })} className="h-8 w-8 shrink-0 cursor-pointer border border-input" aria-label="Код кольору" />
                      <Input value={v.color} onChange={(e) => update(v.key, { color: e.target.value })} className="h-8" placeholder="—" list="color-names" />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input value={v.size} onChange={(e) => update(v.key, { size: e.target.value.toUpperCase() })} className="h-8 w-24" placeholder="—" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={v.sku} onChange={(e) => update(v.key, { sku: e.target.value.toUpperCase() })} className="h-8 font-mono text-xs" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={v.stock} onChange={(e) => update(v.key, { stock: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={cn("h-8 w-24", v.stock === "0" && "text-destructive")} />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={v.price} onChange={(e) => update(v.key, { price: e.target.value })} inputMode="decimal" placeholder="базова" className="h-8 w-28" />
                  </td>
                  <td className="px-2">
                    <button type="button" onClick={() => setVariants(variants.filter((x) => x.key !== v.key))} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Видалити варіант">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {variants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    Варіантів ще немає. Оберіть кольори й розміри вище та натисніть «Створити».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <datalist id="color-names">
            {colors.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>
      </Card>
    </div>
  );
}

function SortableImage({ img, index, colors, onChange, onRemove, onMain }: { img: ImageRow; index: number; colors: string[]; onChange: (p: Partial<ImageRow>) => void; onRemove: () => void; onMain: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.key });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("border bg-white", index === 0 ? "border-foreground" : "border-border", isDragging && "z-10 opacity-80 shadow-lg")}>
      <div className="relative aspect-[4/5] bg-muted">
        <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
        <button type="button" {...attributes} {...listeners} className="absolute left-1.5 top-1.5 cursor-grab bg-white p-1 active:cursor-grabbing" aria-label="Перетягніть, щоб змінити порядок">
          <GripVertical className="size-4" />
        </button>
        {index === 0 ? (
          <span className="absolute right-1.5 top-1.5 bg-foreground px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">Головне</span>
        ) : (
          <button type="button" onClick={onMain} className="absolute right-1.5 top-1.5 bg-white p-1" title="Зробити головним" aria-label="Зробити головним">
            <Star className="size-4" />
          </button>
        )}
        <button type="button" onClick={onRemove} className="absolute bottom-1.5 right-1.5 bg-white p-1 hover:text-destructive" aria-label="Видалити фото">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="space-y-1.5 p-2">
        <Input value={img.alt} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Альтернативний текст" className="h-8 text-xs" />
        <NativeSelect value={img.colorName} onChange={(e) => onChange({ colorName: e.target.value })} className="h-8 text-xs">
          <option value="">Усі кольори</option>
          {colors.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

function ImagesEditor({ images, setImages, colors, productName }: { images: ImageRow[]; setImages: (v: ImageRow[]) => void; colors: string[]; productName: string }) {
  const { uploadFiles, uploading } = useUploader();
  const [picker, setPicker] = React.useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = images.findIndex((i) => i.key === e.active.id);
    const to = images.findIndex((i) => i.key === e.over!.id);
    setImages(arrayMove(images, from, to));
  };
  const add = (urls: string[]) => setImages([...images, ...urls.map((url) => ({ key: k(), url, alt: productName, colorName: "" }))]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Крок 5 · Фото</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => setPicker(true)}>
          <ImagePlus /> З бібліотеки
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dropzone
          uploading={uploading}
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          onFiles={async (files) => {
            const media = await uploadFiles(files);
            add(media.map((m) => m.url));
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Перше фото — головне. Перетягуйте, щоб змінити порядок. Призначте колір, щоб фото показувалося лише для цього кольору; друге фото показується при наведенні в картці товару.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {images.map((img, i) => (
                <SortableImage
                  key={img.key}
                  img={img}
                  index={i}
                  colors={colors}
                  onChange={(p) => setImages(images.map((x) => (x.key === img.key ? { ...x, ...p } : x)))}
                  onRemove={() => setImages(images.filter((x) => x.key !== img.key))}
                  onMain={() => setImages([img, ...images.filter((x) => x.key !== img.key)])}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <MediaPickerDialog open={picker} onOpenChange={setPicker} multiple onSelect={(items) => add(items.map((i) => i.url))} />
      </CardContent>
    </Card>
  );
}
