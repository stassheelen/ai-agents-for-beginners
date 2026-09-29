import "server-only";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** Server-side permission check used by every admin action / route handler. */
export async function requireAdmin() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new UnauthorizedError();
  const admin = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, role: true, active: true, name: true } });
  if (!admin || !admin.active) throw new UnauthorizedError();
  return admin;
}

/** CSRF defence for route handlers: require same-origin requests. (Server Actions do this natively.) */
export async function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) throw new UnauthorizedError();
  try {
    if (new URL(origin).host !== host) throw new UnauthorizedError();
  } catch {
    throw new UnauthorizedError();
  }
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export function actionError(e: unknown): { ok: false; error: string } {
  if (e instanceof UnauthorizedError) return { ok: false, error: "Unauthorized" };
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
    const target = (e as { meta?: { target?: string[] | string } }).meta?.target;
    return { ok: false, error: `Value must be unique${target ? `: ${Array.isArray(target) ? target.join(", ") : target}` : ""}` };
  }
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues: { path: (string | number)[]; message: string }[] }).issues;
    return { ok: false, error: issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join("; ") };
  }
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
}
