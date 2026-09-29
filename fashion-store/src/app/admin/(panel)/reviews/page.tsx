import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { ReviewsTable } from "@/components/admin/reviews-table";
import { Pagination } from "@/components/admin/filters";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reviews" };
const PER_PAGE = 30;

export default async function ReviewsPage(props: PageProps<"/admin/reviews">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && ["PENDING", "APPROVED", "REJECTED"].includes(sp.status) ? (sp.status as "PENDING") : "PENDING";
  const page = Math.max(1, Number(sp.page) || 1);
  const [total, reviews, counts] = await Promise.all([
    prisma.review.count({ where: { status } }),
    prisma.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { product: { select: { id: true, name: true } } } }),
    prisma.review.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <>
      <PageHeader title="Reviews" description="Customer reviews appear on product pages after approval." />
      <div className="mb-4 flex gap-1">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={cn("border px-3 py-1.5 text-xs capitalize", status === s ? "border-foreground bg-foreground text-white" : "border-border bg-white")}>
            {s.toLowerCase()} <span className="opacity-60">{counts.find((c) => c.status === s)?._count ?? 0}</span>
          </Link>
        ))}
      </div>
      <ReviewsTable reviews={reviews.map((r) => ({ id: r.id, name: r.name, email: r.email, rating: r.rating, title: r.title, body: r.body, status: r.status, createdAt: r.createdAt.toISOString(), product: r.product }))} />
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} />
    </>
  );
}
