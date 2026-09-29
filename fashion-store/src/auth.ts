import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get("x-real-ip") ||
          "unknown";
        // 10 attempts / 15 min per IP and per account
        const [ipOk, accountOk] = await Promise.all([
          rateLimit(`login-ip:${ip}`, 10, 900),
          rateLimit(`login-acc:${parsed.data.email}`, 10, 900),
        ]);
        if (!ipOk || !accountOk) throw new RateLimited();

        const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
        if (!admin || !admin.active) {
          await bcrypt.compare(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!ok) return null;
        await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
        return { id: admin.id, email: admin.email, name: admin.name ?? admin.email, role: admin.role };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/admin/login")) return true;
      const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
      if (!isAdminArea) return true;
      if (auth?.user) return true;
      if (pathname.startsWith("/api/admin")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return false; // redirects to pages.signIn
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.adminId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.adminId as string | undefined;
      }
      return session;
    },
  },
});
