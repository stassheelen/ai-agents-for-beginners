import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { StoreProvider } from "@/components/store/store-context";
import { CartDrawer } from "@/components/store/cart-drawer";
import { QuickAdd } from "@/components/store/quick-add";
import { SearchOverlay } from "@/components/store/search-overlay";
import { getSettings } from "@/lib/queries";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const accent = /^#[0-9a-f]{6}$/i.test(settings.accentColor) ? settings.accentColor : "#1f1f1f";
  return (
    <StoreProvider>
      <style>{`:root{--accent:${accent}}`}</style>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <CartDrawer freeShippingThreshold={settings.freeShippingThreshold} shippingFlatRate={settings.shippingFlatRate} />
      <QuickAdd />
      <SearchOverlay />
      <Toaster
        position="bottom-center"
        toastOptions={{ classNames: { toast: "!rounded-none !border-border !bg-white !text-foreground !shadow-[0_8px_30px_rgba(0,0,0,0.08)] !font-sans" } }}
      />
    </StoreProvider>
  );
}
