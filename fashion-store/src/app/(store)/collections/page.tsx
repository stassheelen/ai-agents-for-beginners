import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCollectionTiles } from "@/lib/queries";
import { Breadcrumbs } from "@/components/store/catalog-view";

export const metadata: Metadata = { title: "Колекції", alternates: { canonical: "/collections" } };

export default async function CollectionsPage() {
  const cols = await getCollectionTiles();
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ name: "Головна", href: "/" }, { name: "Колекції", href: "/collections" }]} />
      <h1 className="mt-8 font-display text-4xl font-medium lg:text-6xl">Колекції</h1>
      <div className="mt-10 grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {cols.map((c, i) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group">
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              {c.heroImage && <Image src={c.heroImage} alt={c.name} fill priority={i < 3} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
            </div>
            <p className="mt-4 font-display text-2xl">{c.name}</p>
            {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
