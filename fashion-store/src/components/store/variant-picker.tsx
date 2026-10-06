"use client";

import { cn } from "@/lib/utils";
import { swatchBackground } from "@/lib/color-names";

export type PickerVariant = { id: string; color: string | null; size: string | null; stock: number };

export function stockLabel(stock: number | undefined) {
  if (stock === undefined) return null;
  if (stock <= 0) return { text: "Немає в наявності", tone: "text-destructive" };
  if (stock <= 5) return { text: `Залишилось лише ${stock} шт.`, tone: "text-[#9a6200]" };
  return { text: "В наявності", tone: "text-success" };
}

export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: { name: string; hex: string }[];
  value: string | null;
  onChange: (c: string) => void;
}) {
  if (!colors.length) return null;
  return (
    <div>
      <p className="mb-3 text-xs">
        <span className="uppercase tracking-[0.12em] text-muted-foreground">Колір:</span> <span className="font-medium">{value}</span>
      </p>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name)}
            aria-label={c.name}
            aria-pressed={value === c.name}
            title={c.name}
            className={cn("size-8 rounded-full border border-black/15 ring-offset-2 transition-shadow", value === c.name ? "ring-1 ring-foreground" : "hover:ring-1 hover:ring-foreground/40")}
            style={{ background: swatchBackground(c.name, c.hex) }}
          />
        ))}
      </div>
    </div>
  );
}

export function SizeSelector({
  sizes,
  variants,
  color,
  value,
  onChange,
  extra,
}: {
  sizes: string[];
  variants: PickerVariant[];
  color: string | null;
  value: string | null;
  onChange: (s: string) => void;
  extra?: React.ReactNode;
}) {
  if (!sizes.length) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs">
        <p>
          <span className="uppercase tracking-[0.12em] text-muted-foreground">Розмір:</span> <span className="font-medium">{value ?? "оберіть"}</span>
        </p>
        {extra}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {sizes.map((s) => {
          const v = variants.find((x) => x.size === s && (color === null || x.color === color));
          const soldOut = !v || v.stock <= 0;
          return (
            <button
              key={s}
              type="button"
              disabled={soldOut}
              onClick={() => onChange(s)}
              aria-pressed={value === s}
              className={cn(
                "relative h-11 border text-xs font-medium transition-colors",
                value === s ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground",
                soldOut && "cursor-not-allowed text-muted-foreground line-through decoration-1 hover:border-border",
                s.length > 4 && "col-span-2",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
