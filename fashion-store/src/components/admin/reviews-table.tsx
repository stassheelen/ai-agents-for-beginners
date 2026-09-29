"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Trash2, X } from "lucide-react";
import { deleteReviews, setReviewStatus } from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/misc";
import { Checkbox } from "@/components/ui/overlay";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./use-action";

type Review = { id: string; name: string; email: string | null; rating: number; title: string | null; body: string; status: string; createdAt: string; product: { id: string; name: string } };

export function ReviewsTable({ reviews }: { reviews: Review[] }) {
  const { run, pending } = useAdminAction();
  const [sel, setSel] = React.useState<string[]>([]);
  const [prevReviews, setPrevReviews] = React.useState(reviews);
  if (prevReviews !== reviews) {
    setPrevReviews(reviews);
    setSel([]);
  }
  if (!reviews.length) return <Card><EmptyState title="No reviews here" /></Card>;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <Checkbox checked={sel.length === reviews.length} onCheckedChange={(v) => setSel(v ? reviews.map((r) => r.id) : [])} aria-label="Select all" />
        <span className="text-xs text-muted-foreground">{sel.length} selected</span>
        <Button size="sm" variant="outline" className="h-8" disabled={!sel.length || pending} onClick={() => run(() => setReviewStatus(sel, "APPROVED"))}>
          <Check /> Approve
        </Button>
        <Button size="sm" variant="outline" className="h-8" disabled={!sel.length || pending} onClick={() => run(() => setReviewStatus(sel, "REJECTED"))}>
          <X /> Reject
        </Button>
        <Button size="sm" variant="ghost" className="h-8" disabled={!sel.length || pending} onClick={() => confirm("Delete selected reviews?") && run(() => deleteReviews(sel))}>
          <Trash2 /> Delete
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {reviews.map((r) => (
          <li key={r.id} className="flex gap-3 px-4 py-4">
            <Checkbox checked={sel.includes(r.id)} onCheckedChange={(v) => setSel((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 text-xs">
                <span className="font-medium">{"★".repeat(r.rating)}<span className="text-input">{"★".repeat(5 - r.rating)}</span></span>
                <span>{r.name}</span>
                {r.email && <span className="text-muted-foreground">{r.email}</span>}
                <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                <Link href={`/admin/products/${r.product.id}`} className="underline">{r.product.name}</Link>
              </div>
              {r.title && <p className="mt-2 font-medium">{r.title}</p>}
              <p className="mt-1 text-muted-foreground">{r.body}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {r.status !== "APPROVED" && (
                <button className="p-1.5 hover:bg-muted" onClick={() => run(() => setReviewStatus([r.id], "APPROVED"))} aria-label="Approve"><Check className="size-4" /></button>
              )}
              {r.status !== "REJECTED" && (
                <button className="p-1.5 hover:bg-muted" onClick={() => run(() => setReviewStatus([r.id], "REJECTED"))} aria-label="Reject"><X className="size-4" /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
