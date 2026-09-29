"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { saveSettings } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/misc";
import { toMinor } from "@/lib/utils";
import { MediaField } from "./media";
import { ColorInput } from "./homepage-editor";
import { useAdminAction } from "./use-action";

type S = Record<"storeName" | "tagline" | "accentColor" | "currency" | "freeShippingThreshold" | "shippingFlatRate" | "lowStockThreshold" | "contactEmail" | "contactPhone" | "instagramUrl" | "seoTitle" | "seoDescription" | "ogImage" | "sizeGuide" | "deliveryInfo" | "returnsInfo", string>;

export function SettingsForm({ initial, integrations }: { initial: S; integrations: { name: string; ok: boolean; hint: string }[] }) {
  const [f, setF] = React.useState(initial);
  const { run, pending } = useAdminAction();
  const field = (k: keyof S, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </div>
  );
  return (
    <form
      className="grid gap-4 xl:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveSettings({
            ...f,
            freeShippingThreshold: toMinor(f.freeShippingThreshold) ?? 0,
            shippingFlatRate: toMinor(f.shippingFlatRate) ?? 0,
            lowStockThreshold: Number(f.lowStockThreshold) || 0,
          }),
        );
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Store</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("storeName", "Store name (logo text)")}
            {field("tagline", "Tagline")}
            <ColorInput label="Accent color (announcement bar, accent buttons)" value={f.accentColor} onChange={(v) => setF({ ...f, accentColor: v })} />
            {field("currency", "Currency", { maxLength: 3 })}
            {field("contactEmail", "Contact email", { type: "email" })}
            {field("contactPhone", "Contact phone")}
            {field("instagramUrl", "Instagram URL")}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipping & inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {field("freeShippingThreshold", "Free shipping from (₴)", { inputMode: "decimal" })}
            {field("shippingFlatRate", "Shipping cost (₴)", { inputMode: "decimal" })}
            {field("lowStockThreshold", "Low stock threshold", { inputMode: "numeric" })}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium">Integrations</p>
            {integrations.map((i) => (
              <p key={i.name} className="flex items-center gap-2 text-xs">
                {i.ok ? <CheckCircle2 className="size-4 text-success" /> : <CircleDashed className="size-4 text-muted-foreground" />}
                {i.name} <span className="text-muted-foreground">{i.ok ? "connected" : `— set ${i.hint}`}</span>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>SEO defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field("seoTitle", "Homepage title")}
          <div className="space-y-1.5">
            <Label>Homepage description</Label>
            <Textarea value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} className="min-h-20" />
          </div>
          <MediaField label="Default OG image" value={f.ogImage} onChange={(v) => setF({ ...f, ogImage: v ?? "" })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["sizeGuide", "Size guide (product page + /help/size-guide)"],
              ["deliveryInfo", "Delivery info (/help/delivery)"],
              ["returnsInfo", "Returns info (/help/returns)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label>{label}</Label>
              <Textarea value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="min-h-28" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="xl:col-span-2">
        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
