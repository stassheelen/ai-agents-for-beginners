"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ExternalLink,
  FolderTree,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Percent,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { Toaster } from "sonner";
import { logoutAction } from "@/actions/admin/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/banners", label: "Banners", icon: Megaphone },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/promotions", label: "Promotions", icon: Percent },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const AdminConfig = React.createContext({ directUpload: false });

export function AdminShell({ admin, directUpload, children }: { admin: { email: string; name: string | null; role: string }; directUpload: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [prevPath, setPrevPath] = React.useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("flex items-center gap-3 px-3 py-2 text-[13px] transition-colors", active ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <item.icon className="size-4" strokeWidth={1.6} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <AdminConfig.Provider value={{ directUpload }}>
    <div className="min-h-dvh bg-soft text-[13px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/admin" className="font-display text-sm font-semibold tracking-[0.28em]">
            VELLA
          </Link>
          <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">admin</span>
        </div>
        {nav}
        <div className="border-t border-border p-3">
          <Link href="/" target="_blank" className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-4" strokeWidth={1.6} /> View store
          </Link>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" strokeWidth={1.6} /> Sign out
            </button>
          </form>
          <p className="truncate px-3 pt-2 text-[11px] text-muted-foreground" title={admin.email}>
            {admin.email} · {admin.role.toLowerCase()}
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="-ml-2 p-2">
          <Menu className="size-5" />
        </button>
        <span className="font-display text-sm font-semibold tracking-[0.28em]">VELLA</span>
        <Link href="/" target="_blank" aria-label="View store" className="p-2">
          <ExternalLink className="size-4" />
        </Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto bg-white animate-slide-in-left">
            <div className="flex h-14 items-center justify-between border-b border-border px-5">
              <span className="font-display text-sm font-semibold tracking-[0.28em]">VELLA</span>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <form action={logoutAction} className="border-t border-border p-3">
              <button className="flex w-full items-center gap-3 px-3 py-2 text-muted-foreground">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <Toaster position="bottom-right" toastOptions={{ classNames: { toast: "!rounded-none !font-sans" } }} />
    </div>
    </AdminConfig.Provider>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
