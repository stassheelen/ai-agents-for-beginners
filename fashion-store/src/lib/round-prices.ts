import "server-only";
import { prisma } from "@/lib/db";

/**
 * Store price rounding applied to saved prices (kopecks): under 1000 ₴ down to tens, from 1000 ₴ down to hundreds.
 * Same rule as roundPriceMajor in utils, written in SQL so the whole catalogue updates in a few statements.
 */
const rounded = (col: string) => `CASE WHEN ${col} < 100000 THEN (${col} / 1000) * 1000 ELSE (${col} / 10000) * 10000 END`;
const unrounded = (col: string) => `(${col} IS NOT NULL AND ${col} <> ${rounded(col)})`;

export async function countUnroundedPrices(): Promise<number> {
  const [row] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT (SELECT count(*) FROM "Product" WHERE ${unrounded('"price"')} OR ${unrounded('"compareAtPrice"')})
          + (SELECT count(*) FROM "ProductVariant" WHERE ${unrounded('"price"')} OR ${unrounded('"compareAtPrice"')}) AS n`,
  );
  return Number(row?.n ?? 0);
}

/** Rounds every product and variant price; drops "old prices" that are no longer above the new price. */
export async function roundAllPrices() {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`UPDATE "Product" SET "price" = ${rounded('"price"')} WHERE ${unrounded('"price"')}`),
    prisma.$executeRawUnsafe(`UPDATE "Product" SET "compareAtPrice" = ${rounded('"compareAtPrice"')} WHERE ${unrounded('"compareAtPrice"')}`),
    prisma.$executeRawUnsafe(`UPDATE "Product" SET "compareAtPrice" = NULL, "onSale" = false WHERE "compareAtPrice" IS NOT NULL AND "compareAtPrice" <= "price"`),
    prisma.$executeRawUnsafe(`UPDATE "ProductVariant" SET "price" = ${rounded('"price"')} WHERE ${unrounded('"price"')}`),
    prisma.$executeRawUnsafe(`UPDATE "ProductVariant" SET "compareAtPrice" = ${rounded('"compareAtPrice"')} WHERE ${unrounded('"compareAtPrice"')}`),
    // A variant price equal to its product's price is the same as "no override".
    prisma.$executeRawUnsafe(`UPDATE "ProductVariant" v SET "price" = NULL FROM "Product" p WHERE v."productId" = p."id" AND v."price" = p."price"`),
    prisma.$executeRawUnsafe(`UPDATE "ProductVariant" SET "compareAtPrice" = NULL WHERE "compareAtPrice" IS NOT NULL AND "price" IS NOT NULL AND "compareAtPrice" <= "price"`),
  ]);
}
