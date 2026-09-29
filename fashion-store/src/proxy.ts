import { auth } from "@/auth";

// Guards /admin and /api/admin. Every admin server action and route handler
// additionally re-checks the session server-side (see lib/admin.ts).
export const proxy = auth;

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
