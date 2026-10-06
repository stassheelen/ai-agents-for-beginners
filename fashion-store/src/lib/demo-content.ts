import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEMO_CATEGORIES, DEMO_COLLECTIONS, DEMO_PRODUCTS } from "../../prisma/demo-data";

/**
 * The demo catalogue loaded on the first deploy (prisma/seed.ts): products with /demo/ photos,
 * made-up customers and orders, demo banners, homepage photos, categories and collections.
 */
const DEMO = { startsWith: "/demo/" };
const DEMO_EMAILS = [
  "olena.koval@example.com", "maria.shev@example.com", "anna.b@example.com", "k.melnyk@example.com", "sofia.t@example.com", "iryna.k@example.com",
  "daryna.o@example.com", "yulia.s@example.com", "vika.r@example.com", "tetiana.l@example.com", "andrii.m@example.com", "max.p@example.com",
];
const DEMO_CATEGORY_SLUGS = DEMO_CATEGORIES.flatMap((c) => [c.slug, ...c.children.map((ch) => ch.slug)]);

/** Products whose photos are all demo ones (real products with a stray demo photo only lose that photo). */
const demoProductWhere: Prisma.ProductWhereInput = {
  OR: [
    { sku: { in: DEMO_PRODUCTS.map((p) => p.sku) }, images: { every: { url: DEMO } } },
    { images: { some: { url: DEMO }, every: { url: DEMO } } },
  ],
};
const unusedCategory: Prisma.CategoryWhereInput = { products: { none: {} }, primaryFor: { none: {} }, subFor: { none: {} } };
const demoBannerWhere: Prisma.BannerWhereInput = { OR: [{ image: DEMO }, { mobileImage: DEMO }] };
const demoSectionWhere: Prisma.HomepageSectionWhereInput = { OR: [{ image: DEMO }, { mobileImage: DEMO }] };

export type DemoContentSummary = { products: number; orders: number; banners: number; sections: number; images: number; total: number };

export async function countDemoContent(): Promise<DemoContentSummary> {
  const [products, orders, banners, sections, productImages, categoryImages, collectionImages, settings] = await Promise.all([
    prisma.product.count({ where: demoProductWhere }),
    prisma.order.count({ where: { email: { in: DEMO_EMAILS } } }),
    prisma.banner.count({ where: demoBannerWhere }),
    prisma.homepageSection.count({ where: demoSectionWhere }),
    prisma.productImage.count({ where: { url: DEMO } }),
    prisma.category.count({ where: { image: DEMO } }),
    prisma.collection.count({ where: { heroImage: DEMO } }),
    prisma.settings.count({ where: { ogImage: DEMO } }),
  ]);
  const images = productImages + categoryImages + collectionImages + settings;
  return { products, orders, banners, sections, images, total: products + orders + banners + sections + images };
}

/** Deletes the demo content and every /demo/ image reference. Real (imported or hand-made) data is kept. */
export async function removeDemoContent() {
  const summary = await countDemoContent();
  await prisma.$transaction(
    async (tx) => {
      await tx.order.deleteMany({ where: { email: { in: DEMO_EMAILS } } });
      await tx.customer.deleteMany({ where: { email: { in: DEMO_EMAILS }, orders: { none: {} } } });

      await tx.product.deleteMany({ where: demoProductWhere });
      await tx.productImage.deleteMany({ where: { url: DEMO } });
      await tx.product.updateMany({ where: { ogImage: DEMO }, data: { ogImage: null } });

      await tx.category.updateMany({ where: { image: DEMO }, data: { image: null } });
      await tx.collection.updateMany({ where: { heroImage: DEMO }, data: { heroImage: null } });
      await tx.category.deleteMany({ where: { slug: { in: DEMO_CATEGORY_SLUGS }, parentId: { not: null }, ...unusedCategory } });
      await tx.category.deleteMany({ where: { slug: { in: DEMO_CATEGORY_SLUGS }, parentId: null, children: { none: {} }, ...unusedCategory } });
      await tx.collection.deleteMany({ where: { slug: { in: DEMO_COLLECTIONS.map((c) => c.slug) }, products: { none: {} } } });

      await tx.banner.deleteMany({ where: demoBannerWhere });
      // Sections built around a demo photo are switched off until a real photo is set in the homepage editor.
      await tx.homepageSection.updateMany({ where: { ...demoSectionWhere, type: { in: ["HERO", "IMAGE_TEXT", "BANNER"] } }, data: { active: false } });
      await tx.homepageSection.updateMany({ where: { image: DEMO }, data: { image: null } });
      await tx.homepageSection.updateMany({ where: { mobileImage: DEMO }, data: { mobileImage: null } });
      for (const g of await tx.homepageSection.findMany({ where: { type: "CATEGORY_GRID" }, select: { id: true, config: true } })) {
        const slugs = (g.config as { slugs?: string[] } | null)?.slugs;
        if (slugs?.length && !(await tx.category.count({ where: { slug: { in: slugs } } }))) {
          await tx.homepageSection.update({ where: { id: g.id }, data: { config: {} } });
        }
      }
      await tx.settings.updateMany({ where: { ogImage: DEMO }, data: { ogImage: null } });
      await tx.media.deleteMany({ where: { url: DEMO } });

      // Keep the header menu filled: show the real top-level categories when the demo ones are gone.
      if (!(await tx.category.count({ where: { parentId: null, published: true, showInNav: true } }))) {
        const roots = await tx.category.findMany({
          where: { parentId: null, published: true, OR: [{ products: { some: {} } }, { children: { some: { products: { some: {} } } } }] },
          orderBy: { position: "asc" },
          take: 6,
          select: { id: true },
        });
        await tx.category.updateMany({ where: { id: { in: roots.map((r) => r.id) } }, data: { showInNav: true } });
      }
    },
    { timeout: 60000, maxWait: 30000 },
  );
  return summary;
}
