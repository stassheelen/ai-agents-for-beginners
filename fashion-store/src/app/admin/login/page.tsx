import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вхід в адмін-панель", robots: { index: false, follow: false } };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const session = await auth();
  if (session?.user) redirect("/admin");
  const sp = await props.searchParams;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/admin";
  let path = "/admin";
  try {
    path = new URL(callbackUrl, "http://x").pathname;
  } catch {}
  return (
    <div className="flex min-h-dvh items-center justify-center bg-soft p-4">
      <div className="w-full max-w-sm border border-border bg-white p-8">
        <p className="font-display text-lg font-semibold tracking-[0.28em]">VELLA</p>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Адмін-панель</p>
        <LoginForm callbackUrl={path} />
      </div>
    </div>
  );
}
