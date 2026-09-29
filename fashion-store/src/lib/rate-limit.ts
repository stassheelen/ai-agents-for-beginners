import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres so limits hold across
 * serverless instances. Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStartThreshold = new Date(now.getTime() - windowSeconds * 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStartThreshold} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStartThreshold} THEN ${now} ELSE "RateLimit"."windowStart" END
      RETURNING "count"`;
    return (rows[0]?.count ?? 0) <= limit;
  } catch (e) {
    console.error("rateLimit failed", e);
    return true; // fail open — never block shoppers because of limiter issues
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function limitByIp(scope: string, limit: number, windowSeconds: number) {
  const ip = await clientIp();
  return rateLimit(`${scope}:${ip}`, limit, windowSeconds);
}
