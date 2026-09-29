"use client";

import * as React from "react";
import Link from "next/link";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type Preview = {
  totalRows: number;
  newProducts: number;
  updatedProducts: number;
  newVariants: number;
  updatedVariants: number;
  duplicates: number;
  errors: number;
  unknownColumns: string[];
  rows: { row: number; sku: string; name: string; color: string; size: string; price: string; stock: string; action: "create" | "update" | "duplicate" | "error"; message?: string }[];
};
type Result = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorRows: { row: number; sku: string; error: string }[];
  warnings: { row: number; sku: string; warning: string }[];
  totalGroups?: number;
  processedGroups?: number;
  done?: boolean;
};

const ACTION_LABELS = { all: "Усі", create: "Створення", update: "Оновлення", duplicate: "Дублікат", error: "Помилка" } as const;

function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob(["﻿" + Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductImporter({ columns }: { columns: string[] }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState<null | "preview" | "commit">(null);
  const [filter, setFilter] = React.useState<"all" | "create" | "update" | "duplicate" | "error">("all");
  const [over, setOver] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const send = async (f: File, mode: "preview" | "commit", chunk?: number) => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", mode);
    if (chunk !== undefined) fd.append("chunk", String(chunk));
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Помилка запиту");
    return json;
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) return toast.error("Завантажте файл .csv або .xlsx");
    setFile(f);
    setPreview(null);
    setResult(null);
    setBusy("preview");
    try {
      const json = await send(f, "preview");
      setPreview(json.preview);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося прочитати файл");
      setFile(null);
    } finally {
      setBusy(null);
    }
  };

  const confirmImport = async () => {
    if (!file) return;
    setBusy("commit");
    setProgress({ done: 0, total: preview?.newProducts !== undefined ? preview.newProducts + preview.updatedProducts : 0 });
    // Commit in chunks so big files never hit the server time limit and progress stays visible.
    const total: Result = { created: 0, updated: 0, skipped: 0, errors: 0, errorRows: [], warnings: [] };
    try {
      for (let chunk = 0; ; chunk++) {
        const r: Result = (await send(file, "commit", chunk)).result;
        total.created += r.created;
        total.updated += r.updated;
        total.skipped += r.skipped;
        total.errors += r.errors;
        total.errorRows.push(...r.errorRows);
        total.warnings.push(...r.warnings);
        setProgress({ done: r.processedGroups ?? 0, total: r.totalGroups ?? 0 });
        if (r.done !== false) break;
      }
      setResult(total);
      setPreview(null);
      toast.success("Імпорт завершено");
    } catch (e) {
      // Chunks already written stay imported; show what was done so far.
      if (total.created || total.updated) {
        setResult(total);
        setPreview(null);
      }
      toast.error(`${e instanceof Error ? e.message : "Помилка імпорту"}. Оброблене раніше збережено — можна завантажити файл ще раз, наявні артикули оновляться.`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const rows = preview?.rows.filter((r) => filter === "all" || r.action === filter) ?? [];

  return (
    <div className="space-y-4">
      {!preview && !result && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              onFile(e.dataTransfer.files[0]);
            }}
            onClick={() => input.current?.click()}
            role="button"
            tabIndex={0}
            className={cn("flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-input bg-white p-10 text-center hover:border-foreground", over && "border-foreground bg-muted")}
          >
            {busy === "preview" ? <Loader2 className="size-7 animate-spin" /> : <FileSpreadsheet className="size-7" strokeWidth={1.4} />}
            <p className="text-sm font-medium">{busy === "preview" ? `Читаємо ${file?.name}…` : "Перетягніть CSV або XLSX сюди або натисніть, щоб вибрати"}</p>
            <p className="text-xs text-muted-foreground">До 5 000 рядків · 10 МБ. Один рядок — один варіант (колір / розмір).</p>
            <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Формат файлу</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href="/api/admin/import/template?format=csv">
                    <Download /> Шаблон CSV
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/api/admin/import/template?format=xlsx">
                    <Download /> Шаблон XLSX
                  </a>
                </Button>
              </div>
              <p className="text-muted-foreground">
                Обовʼязково: <strong className="text-foreground">Артикул, Назва, Ціна</strong>. Рядки з однаковим <strong className="text-foreground">Артикулом моделі</strong> (або однаковою назвою) обʼєднуються в один товар.
                Фото за посиланнями завантажуються у Vercel Blob; кілька посилань розділяйте комами. Колонки можна називати українською або англійською.
              </p>
              <div className="flex flex-wrap gap-1">
                {columns.map((c) => (
                  <span key={c} className="bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {c}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Попередній перегляд · {file?.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset} disabled={Boolean(busy)}>
                  Скасувати
                </Button>
                <Button size="sm" onClick={confirmImport} disabled={Boolean(busy) || preview.totalRows === preview.errors + preview.duplicates}>
                  {busy === "commit" ? <Loader2 className="animate-spin" /> : <Upload />} Підтвердити імпорт
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Рядків" value={preview.totalRows} />
                <Stat label="Нових товарів" value={preview.newProducts} tone="success" />
                <Stat label="Буде оновлено" value={preview.updatedProducts} />
                <Stat label="Варіанти нові / оновл." value={`${preview.newVariants} / ${preview.updatedVariants}`} />
                <Stat label="Дублікати" value={preview.duplicates} tone={preview.duplicates ? "warning" : undefined} />
                <Stat label="Помилки" value={preview.errors} tone={preview.errors ? "danger" : undefined} />
              </div>
              {preview.unknownColumns.length > 0 && (
                <p className="mt-4 flex items-center gap-2 text-xs text-[#9a6200]">
                  <AlertTriangle className="size-4" /> Невідомі колонки (пропущено): {preview.unknownColumns.join(", ")}
                </p>
              )}
              {busy === "commit" && (
                <div className="mt-4 max-w-md" role="status" aria-live="polite">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Імпортуємо… Не закривайте вкладку.</span>
                    {progress && progress.total > 0 && (
                      <span className="tabular-nums">
                        {progress.done} / {progress.total} товарів
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden bg-muted">
                    <div
                      className="h-full bg-foreground transition-[width] duration-500"
                      style={{ width: progress && progress.total ? `${Math.max(3, (progress.done / progress.total) * 100)}%` : "3%" }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2.5">
              {(["all", "create", "update", "duplicate", "error"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1 text-xs", filter === f ? "bg-foreground text-white" : "hover:bg-muted")}>
                  {ACTION_LABELS[f]}
                </button>
              ))}
              {preview.errors + preview.duplicates > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={() => downloadCsv("pomylky-importu.csv", [["Рядок", "Артикул", "Товар", "Проблема"], ...preview.rows.filter((r) => r.action === "error" || r.action === "duplicate").map((r) => [r.row, r.sku, r.name, r.message ?? ""])])}
                >
                  <Download /> Звіт про помилки
                </Button>
              )}
            </div>
            <Table>
              <THead>
                <tr>
                  <TH>Рядок</TH>
                  <TH>Дія</TH>
                  <TH>Артикул</TH>
                  <TH>Товар</TH>
                  <TH>Колір / Розмір</TH>
                  <TH>Ціна</TH>
                  <TH>Залишок</TH>
                  <TH>Примітка</TH>
                </tr>
              </THead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <TR key={r.row}>
                    <TD className="text-muted-foreground">{r.row}</TD>
                    <TD>
                      <Badge variant={r.action === "create" ? "success" : r.action === "update" ? "muted" : r.action === "duplicate" ? "warning" : "danger"}>{ACTION_LABELS[r.action]}</Badge>
                    </TD>
                    <TD className="font-mono text-xs">{r.sku}</TD>
                    <TD>{r.name}</TD>
                    <TD className="text-muted-foreground">{[r.color, r.size].filter(Boolean).join(" / ") || "—"}</TD>
                    <TD>{r.price}</TD>
                    <TD>{r.stock}</TD>
                    <TD className={cn("text-xs", r.action === "error" ? "text-destructive" : "text-muted-foreground")}>{r.message}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            {rows.length > 300 && <p className="px-4 py-3 text-xs text-muted-foreground">Показано перші 300 з {rows.length} рядків.</p>}
          </Card>
        </>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Імпорт завершено
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>
                Імпортувати інший файл
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/products">До товарів</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Створено" value={result.created} tone="success" />
              <Stat label="Оновлено" value={result.updated} />
              <Stat label="Пропущено" value={result.skipped} tone={result.skipped ? "warning" : undefined} />
              <Stat label="Помилки" value={result.errors} tone={result.errors ? "danger" : undefined} />
            </div>
            {(result.errorRows.length > 0 || result.warnings.length > 0) && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadCsv("zvit-importu.csv", [
                      ["Рядок", "Артикул", "Тип", "Повідомлення"],
                      ...result.errorRows.map((e) => [e.row, e.sku, "помилка", e.error]),
                      ...result.warnings.map((w) => [w.row, w.sku, "попередження", w.warning]),
                    ])
                  }
                >
                  <Download /> Завантажити звіт про помилки
                </Button>
                <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto text-xs">
                  {result.errorRows.map((e, i) => (
                    <li key={`e${i}`} className="text-destructive">
                      Рядок {e.row} ({e.sku}): {e.error}
                    </li>
                  ))}
                  {result.warnings.map((w, i) => (
                    <li key={`w${i}`} className="text-[#9a6200]">
                      Рядок {w.row} ({w.sku}): {w.warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="border border-border p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl", tone === "success" && "text-success", tone === "warning" && "text-[#9a6200]", tone === "danger" && "text-destructive")}>{value}</p>
    </div>
  );
}
