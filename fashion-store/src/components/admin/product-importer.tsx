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
type Result = { created: number; updated: number; skipped: number; errors: number; errorRows: { row: number; sku: string; error: string }[]; warnings: { row: number; sku: string; warning: string }[] };

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
  const input = React.useRef<HTMLInputElement>(null);

  const send = async (f: File, mode: "preview" | "commit") => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("mode", mode);
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) return toast.error("Upload a .csv or .xlsx file");
    setFile(f);
    setPreview(null);
    setResult(null);
    setBusy("preview");
    try {
      const json = await send(f, "preview");
      setPreview(json.preview);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read file");
      setFile(null);
    } finally {
      setBusy(null);
    }
  };

  const confirmImport = async () => {
    if (!file) return;
    setBusy("commit");
    try {
      const json = await send(file, "commit");
      setResult(json.result);
      setPreview(null);
      toast.success("Import finished");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
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
            <p className="text-sm font-medium">{busy === "preview" ? `Reading ${file?.name}…` : "Drop CSV or XLSX here, or click to choose"}</p>
            <p className="text-xs text-muted-foreground">Up to 5,000 rows · 10 MB. One row per variant (color / size).</p>
            <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>File format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href="/api/admin/import/template?format=csv">
                    <Download /> CSV template
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/api/admin/import/template?format=xlsx">
                    <Download /> XLSX template
                  </a>
                </Button>
              </div>
              <p className="text-muted-foreground">
                Required: <strong className="text-foreground">SKU, Product Name, Price</strong>. Rows with the same <strong className="text-foreground">Parent SKU</strong> (or the same name) are grouped into one product.
                Image URLs are downloaded and stored in Vercel Blob; separate several with commas.
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
              <CardTitle>Preview · {file?.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset} disabled={Boolean(busy)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmImport} disabled={Boolean(busy) || preview.totalRows === preview.errors + preview.duplicates}>
                  {busy === "commit" ? <Loader2 className="animate-spin" /> : <Upload />} Confirm import
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Rows" value={preview.totalRows} />
                <Stat label="New products" value={preview.newProducts} tone="success" />
                <Stat label="Products to update" value={preview.updatedProducts} />
                <Stat label="Variants new / upd." value={`${preview.newVariants} / ${preview.updatedVariants}`} />
                <Stat label="Duplicates" value={preview.duplicates} tone={preview.duplicates ? "warning" : undefined} />
                <Stat label="Errors" value={preview.errors} tone={preview.errors ? "danger" : undefined} />
              </div>
              {preview.unknownColumns.length > 0 && (
                <p className="mt-4 flex items-center gap-2 text-xs text-[#9a6200]">
                  <AlertTriangle className="size-4" /> Ignored columns: {preview.unknownColumns.join(", ")}
                </p>
              )}
              {busy === "commit" && <p className="mt-4 text-xs text-muted-foreground">Importing… downloading images can take a while for large files. Keep this tab open.</p>}
            </CardContent>
          </Card>
          <Card>
            <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2.5">
              {(["all", "create", "update", "duplicate", "error"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1 text-xs capitalize", filter === f ? "bg-foreground text-white" : "hover:bg-muted")}>
                  {f}
                </button>
              ))}
              {preview.errors + preview.duplicates > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={() => downloadCsv("import-errors.csv", [["Row", "SKU", "Product", "Problem"], ...preview.rows.filter((r) => r.action === "error" || r.action === "duplicate").map((r) => [r.row, r.sku, r.name, r.message ?? ""])])}
                >
                  <Download /> Error report
                </Button>
              )}
            </div>
            <Table>
              <THead>
                <tr>
                  <TH>Row</TH>
                  <TH>Action</TH>
                  <TH>SKU</TH>
                  <TH>Product</TH>
                  <TH>Color / Size</TH>
                  <TH>Price</TH>
                  <TH>Stock</TH>
                  <TH>Note</TH>
                </tr>
              </THead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <TR key={r.row}>
                    <TD className="text-muted-foreground">{r.row}</TD>
                    <TD>
                      <Badge variant={r.action === "create" ? "success" : r.action === "update" ? "muted" : r.action === "duplicate" ? "warning" : "danger"}>{r.action}</Badge>
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
            {rows.length > 300 && <p className="px-4 py-3 text-xs text-muted-foreground">Showing first 300 of {rows.length} rows.</p>}
          </Card>
        </>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Import complete
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>
                Import another file
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/products">View products</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Created" value={result.created} tone="success" />
              <Stat label="Updated" value={result.updated} />
              <Stat label="Skipped" value={result.skipped} tone={result.skipped ? "warning" : undefined} />
              <Stat label="Errors" value={result.errors} tone={result.errors ? "danger" : undefined} />
            </div>
            {(result.errorRows.length > 0 || result.warnings.length > 0) && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadCsv("import-error-report.csv", [
                      ["Row", "SKU", "Type", "Message"],
                      ...result.errorRows.map((e) => [e.row, e.sku, "error", e.error]),
                      ...result.warnings.map((w) => [w.row, w.sku, "warning", w.warning]),
                    ])
                  }
                >
                  <Download /> Download error report
                </Button>
                <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto text-xs">
                  {result.errorRows.map((e, i) => (
                    <li key={`e${i}`} className="text-destructive">
                      Row {e.row} ({e.sku}): {e.error}
                    </li>
                  ))}
                  {result.warnings.map((w, i) => (
                    <li key={`w${i}`} className="text-[#9a6200]">
                      Row {w.row} ({w.sku}): {w.warning}
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
