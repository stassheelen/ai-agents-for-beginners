"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function loginAction(_: unknown, formData: FormData): Promise<{ error: string; email: string } | null> {
  const email = String(formData.get("email") ?? "").slice(0, 200);
  try {
    const next = String(formData.get("callbackUrl") ?? "/admin");
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: next.startsWith("/admin") ? next : "/admin",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "rate_limited") return { error: "Too many sign-in attempts. Try again in 15 minutes.", email };
      return { error: "Invalid email or password", email };
    }
    throw e; // NEXT_REDIRECT
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
