import type { Metadata } from "next";
import { ViewTransition } from "react";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { StoreProvider } from "@/components/store/store-context";
import { CartDrawer } from "@/components/store/cart-drawer";
import { QuickAdd } from "@/components/store/quick-add";
import { SearchOverlay } from "@/components/store/search-overlay";
import { SmoothScroll } from "@/components/store/smooth-scroll";
import { BackgroundWordmark } from "@/components/store/background-wordmark";
import { getSettings } from "@/lib/queries";
import { Toaster } from "sonner";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";

// Store pages are cached and rebuilt at most every 5 minutes; any change saved in the
// admin panel refreshes them at once (src/lib/cache.ts). Pages that read the URL query
// or the visitor's cookies (catalogue filters, search, wishlist) still render per request.
export const revalidate = 300;

export const metadata: Metadata = {
  openGraph: {
    siteName: "VELLA",
    locale: "uk_UA",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "VELLA — Твій стиль. Твій ритм." }],
  },
  // Large preview cards (Telegram, X, Viber) instead of a small square thumbnail.
  twitter: { card: "summary_large_image" },
};

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const accent = /^#[0-9a-f]{6}$/i.test(settings.accentColor) ? settings.accentColor : "#1f1f1f";
  return (
    <StoreProvider>
      <style>{`:root{--accent:${accent}}`}</style>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="relative isolate flex-1">
          <BackgroundWordmark />
          {/* Page content fades between routes; header and footer stay put (globals.css → page-fade). */}
          <ViewTransition default="page-fade">{children}</ViewTransition>
        </main>
        <SiteFooter />
      </div>
      <CartDrawer freeShippingThreshold={settings.freeShippingThreshold} shippingFlatRate={settings.shippingFlatRate} />
      <QuickAdd />
      <SearchOverlay />
      <SmoothScroll />
      <Toaster
        position="bottom-center"
        toastOptions={{ classNames: { toast: "!rounded-none !border-border !bg-white !text-foreground !shadow-[0_8px_30px_rgba(0,0,0,0.08)] !font-sans" } }}
      />
    </StoreProvider>
  );
}
