import Link from "next/link";
import { getNavigation, getSettings } from "@/lib/queries";
import { NewsletterForm } from "./newsletter-form";

export async function SiteFooter() {
  const [settings, nav] = await Promise.all([getSettings(), getNavigation()]);
  return (
    <footer className="mt-24 border-t border-border bg-soft">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-display text-xl font-semibold tracking-[0.28em]">{settings.storeName}</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{settings.tagline ?? "Преміальний activewear та базовий гардероб."}</p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
          <div>
            <p className="eyebrow mb-4">Магазин</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/shop?flag=new" className="hover:text-foreground">Новинки</Link></li>
              <li><Link href="/shop?flag=bestseller" className="hover:text-foreground">Бестселери</Link></li>
              {nav.categories.map((c) => (
                <li key={c.slug}><Link href={`/shop/${c.slug}`} className="hover:text-foreground">{c.name}</Link></li>
              ))}
              <li><Link href="/shop?flag=sale" className="hover:text-foreground">Розпродаж</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Колекції</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {nav.collections.map((c) => (
                <li key={c.slug}><Link href={`/collections/${c.slug}`} className="hover:text-foreground">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Допомога</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/help/delivery" className="hover:text-foreground">Доставка та оплата</Link></li>
              <li><Link href="/help/returns" className="hover:text-foreground">Обмін та повернення</Link></li>
              <li><Link href="/help/size-guide" className="hover:text-foreground">Таблиця розмірів</Link></li>
              <li><Link href="/account" className="hover:text-foreground">Статус замовлення</Link></li>
              {settings.contactEmail && <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">{settings.contactEmail}</a></li>}
              {settings.contactPhone && <li><a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-foreground">{settings.contactPhone}</a></li>}
            </ul>
          </div>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {settings.storeName}. Усі права захищено.</p>
        <div className="flex gap-5">
          {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Instagram</a>}
          <Link href="/help/delivery" className="hover:text-foreground">Умови</Link>
        </div>
      </div>
    </footer>
  );
}
