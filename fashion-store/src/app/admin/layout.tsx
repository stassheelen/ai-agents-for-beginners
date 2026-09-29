import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Адмін-панель", template: "%s · Адмін-панель" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
