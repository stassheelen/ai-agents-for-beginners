import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const CART_COOKIE = "nf_cart";
export const VISITOR_COOKIE = "nf_vid";
const MAX_AGE = 60 * 60 * 24 * 90;

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function readCartId() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function setCartId(id: string) {
  (await cookies()).set(CART_COOKIE, id, cookieOpts);
}

export async function clearCartId() {
  (await cookies()).delete(CART_COOKIE);
}

export async function readVisitorId() {
  return (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
}

/** Only callable from Server Actions / Route Handlers (sets a cookie). */
export async function ensureVisitorId() {
  const existing = await readVisitorId();
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const id = crypto.randomBytes(16).toString("hex");
  (await cookies()).set(VISITOR_COOKIE, id, cookieOpts);
  return id;
}

/** HMAC token that lets a buyer view their own order confirmation page. */
export function orderToken(orderId: string) {
  const secret = process.env.AUTH_SECRET || "dev-secret";
  return crypto.createHmac("sha256", secret).update(`order:${orderId}`).digest("hex").slice(0, 32);
}

export function verifyOrderToken(orderId: string, token: string | undefined | null) {
  if (!token) return false;
  const expected = orderToken(orderId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
