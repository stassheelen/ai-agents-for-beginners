import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cardSelect, toCard } from "@/lib/queries";
import { readVisitorId } from "@/lib/visitor";
import { WishlistGrid } from "@/components/store/wishlist-grid";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Список бажань", robots: { index: false } };

export default async function WishlistPage() {
  const vid = await readVisitorId();
  const rows = vid
    ? await prisma.wishlist.findMany({
        where: { visitorId: vid, product: { status: "PUBLISHED" } },
        orderBy: { createdAt: "desc" },
        select: { product: { select: cardSelect } },
      })
    : [];
  const products = rows.map((r) => toCard(r.product));
  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="font-display text-4xl font-medium lg:text-6xl">Список бажань</h1>
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-display text-2xl">Тут поки порожньо</p>
          <p className="max-w-sm text-sm text-muted-foreground">Натисніть ♡ на товарі, щоб зберегти його тут і повернутися пізніше.</p>
          <Button asChild className="mt-2">
            <Link href="/shop">До каталогу</Link>
          </Button>
        </div>
      ) : (
        <WishlistGrid products={products} />
      )}
    </div>
  );
}
