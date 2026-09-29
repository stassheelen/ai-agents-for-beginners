"use client";

import * as React from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Check, Copy, Film, ImageIcon, Link2, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMedia, importMediaFromUrl, listMedia, registerUploadedBlob, type MediaItem } from "@/actions/admin/media";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { AdminConfig } from "./shell";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm";

export function useUploader() {
  const { directUpload } = React.useContext(AdminConfig);
  const [uploading, setUploading] = React.useState(false);
  const uploadFiles = React.useCallback(
    async (files: File[]): Promise<MediaItem[]> => {
      if (!files.length) return [];
      setUploading(true);
      const out: MediaItem[] = [];
      try {
        if (directUpload) {
          for (const file of files) {
            try {
              const safe = file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
              const blob = await upload(`media/${safe}`, file, { access: "public", handleUploadUrl: "/api/admin/blob-upload" });
              const res = await registerUploadedBlob(blob.url, file.name);
              if (res.ok && res.data) out.push(res.data);
              else if (!res.ok) toast.error(`${file.name}: ${res.error}`);
            } catch (e) {
              toast.error(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
            }
          }
        } else {
          const fd = new FormData();
          files.forEach((f) => fd.append("files", f));
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          const json = (await res.json()) as { media?: (MediaItem & { createdAt: string })[]; errors?: string[]; error?: string };
          if (!res.ok) toast.error(json.error ?? "Upload failed");
          json.errors?.forEach((e) => toast.error(e));
          out.push(...(json.media ?? []));
        }
        if (out.length) toast.success(`Uploaded ${out.length} file(s)`);
      } finally {
        setUploading(false);
      }
      return out;
    },
    [directUpload],
  );
  return { uploadFiles, uploading };
}

export function Dropzone({ onFiles, uploading, compact, accept = ACCEPT, multiple = true }: { onFiles: (f: File[]) => void; uploading?: boolean; compact?: boolean; accept?: string; multiple?: boolean }) {
  const [over, setOver] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-input bg-white text-center transition-colors hover:border-foreground",
        compact ? "p-4" : "p-8",
        over && "border-foreground bg-muted",
      )}
    >
      {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" strokeWidth={1.5} />}
      <p className="text-xs">
        <span className="font-medium">Drag & drop</span> or click to upload
      </p>
      {!compact && <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, AVIF, GIF up to 8 MB · MP4/WEBM video</p>}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function MediaLibrary({
  selectable,
  multiple,
  onSelect,
  typeFilter = "ALL",
}: {
  selectable?: boolean;
  multiple?: boolean;
  onSelect?: (items: MediaItem[]) => void;
  typeFilter?: "IMAGE" | "VIDEO" | "ALL";
}) {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState(typeFilter);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [urlInput, setUrlInput] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const { uploadFiles, uploading } = useUploader();

  const load = React.useCallback(
    async (reset: boolean, cur?: string | null) => {
      setLoading(true);
      try {
        const res = await listMedia({ q: q || undefined, type, cursor: reset ? undefined : cur ?? undefined });
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [q, type],
  );

  React.useEffect(() => {
    const t = setTimeout(() => load(true), 250);
    return () => clearTimeout(t);
  }, [load]);

  const onFiles = async (files: File[]) => {
    const added = await uploadFiles(files);
    if (added.length) {
      setItems((prev) => [...added, ...prev]);
      if (selectable) setSelected((s) => (multiple ? [...added.map((a) => a.id), ...s] : [added[0].id]));
    }
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple || !selectable ? [...s, id] : [id]));

  const remove = async () => {
    if (!selected.length || !confirm(`Delete ${selected.length} file(s)? Files used on the site will be kept.`)) return;
    const res = await deleteMedia(selected);
    if (!res.ok) return toast.error(res.error);
    if (res.message) toast.message(res.message);
    else toast.success("Deleted");
    setSelected([]);
    load(true);
  };

  const importUrl = async () => {
    if (!urlInput) return;
    setImporting(true);
    const res = await importMediaFromUrl(urlInput);
    setImporting(false);
    if (!res.ok) return toast.error(res.error);
    setItems((prev) => [res.data!, ...prev]);
    setUrlInput("");
    toast.success("Imported");
  };

  return (
    <div className="space-y-4">
      <Dropzone onFiles={onFiles} uploading={uploading} compact={selectable} />
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="h-9 pl-9" />
        </div>
        {typeFilter === "ALL" && (
          <div className="flex border border-border bg-white">
            {(["ALL", "IMAGE", "VIDEO"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn("px-3 py-2 text-xs", type === t ? "bg-foreground text-white" : "hover:bg-muted")}>
                {t === "ALL" ? "All" : t === "IMAGE" ? "Images" : "Videos"}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://… import by URL" className="h-9 md:w-64" />
          <Button variant="outline" size="sm" className="h-9" onClick={importUrl} disabled={importing}>
            {importing ? <Loader2 className="animate-spin" /> : <Link2 />}
          </Button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-3 border border-border bg-white px-3 py-2">
          <span className="text-xs">{selected.length} selected</span>
          {selectable ? (
            <Button size="sm" onClick={() => onSelect?.(items.filter((i) => selected.includes(i.id)))}>
              <Check /> Use selected
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={remove}>
              <Trash2 /> Delete
            </Button>
          )}
          <button className="ml-auto text-xs underline" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      <div className={cn("grid gap-2", selectable ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6" : "grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8")}>
        {items.map((m) => {
          const on = selected.includes(m.id);
          return (
            <div key={m.id} className={cn("group relative border bg-white", on ? "border-foreground ring-1 ring-foreground" : "border-border")}>
              <button type="button" onClick={() => toggle(m.id)} className="relative block aspect-square w-full bg-muted" title={m.filename}>
                {m.type === "IMAGE" ? (
                  <Image src={m.url} alt={m.alt ?? m.filename} fill sizes="160px" className="object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <Film className="size-6 text-muted-foreground" />
                  </span>
                )}
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center bg-foreground text-white">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <p className="truncate text-[11px]" title={m.filename}>
                  {m.filename}
                </p>
                <button
                  type="button"
                  aria-label="Copy URL"
                  className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const full = m.url.startsWith("http") ? m.url : `${window.location.origin}${m.url}`;
                    navigator.clipboard.writeText(full).then(() => toast.success("URL copied"));
                  }}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="px-2 pb-1.5 text-[10px] text-muted-foreground">
                {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                {m.size ? `${Math.round(m.size / 1024)} KB` : m.mimeType}
              </p>
            </div>
          );
        })}
      </div>
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <ImageIcon className="size-6" />
          <p className="text-xs">No files yet</p>
        </div>
      )}
      {loading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}
      {cursor && !loading && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => load(false, cursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple,
  type = "IMAGE",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  type?: "IMAGE" | "VIDEO" | "ALL";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogTitle>Media library</DialogTitle>
        <div className="mt-4">
          {open && (
            <MediaLibrary
              selectable
              multiple={multiple}
              typeFilter={type}
              onSelect={(items) => {
                onSelect(items);
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Single image / video URL field with preview, library picker and direct upload. */
export function MediaField({
  label,
  value,
  onChange,
  type = "IMAGE",
  hint,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  type?: "IMAGE" | "VIDEO";
  hint?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { uploadFiles, uploading } = useUploader();
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden border border-border bg-muted">
          {value ? (
            type === "IMAGE" ? (
              <Image src={value} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Film className="size-5 text-muted-foreground" />
              </span>
            )
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-5" strokeWidth={1.4} />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} placeholder={type === "VIDEO" ? "/video.mp4 or https://…" : "/image.webp or https://…"} className="h-9" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
              Library
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => input.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onChange(null)}>
                <X /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <input
        ref={input}
        type="file"
        accept={type === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif,image/gif"}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          const [m] = await uploadFiles(files);
          if (m) onChange(m.url);
        }}
      />
      <MediaPickerDialog open={open} onOpenChange={setOpen} type={type} onSelect={(items) => items[0] && onChange(items[0].url)} />
    </div>
  );
}
