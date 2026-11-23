import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Neon suspends an idle database and takes a few seconds to wake it, longer
 * than Prisma's 5 s default connect timeout. A page also runs ~10 queries at
 * once, more than the default pool for one serverless instance. Raise both
 * unless DATABASE_URL already sets them.
 */
const CONNECTION_DEFAULTS: Record<string, string> = {
  connect_timeout: "15",
  pool_timeout: "20",
  connection_limit: "10",
};

function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    for (const [key, value] of Object.entries(CONNECTION_DEFAULTS)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  const url = databaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
