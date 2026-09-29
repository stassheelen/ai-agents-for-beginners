"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { searchSuggestions, type SearchSuggestions } from "@/actions/catalog";
import { formatMoney } from "@/lib/utils";
import { useStore } from "./store-context";

const POPULAR = ["Легінси", "Худі", "Спортивний топ", "Чорний", "Штани", "Кепка"];

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setRes] = React.useState<SearchSuggestions | null>(null);
  const term = q.trim();
  const res = term.length >= 2 ? result : null;

  React.useEffect(() => {
    if (term.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      searchSuggestions(term)
        .then((r) => alive && setRes(r))
        .finally(() => alive && setLoading(false));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term]);

  const go = (term: string) => {
    if (!term.trim()) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  const close = () => setSearchOpen(false);

  return (
    <D.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-fade-in" />
        <D.Content className="fixed inset-x-0 top-0 z-50 max-h-dvh overflow-y-auto bg-white data-[state=open]:animate-fade-in">
          <D.Title className="sr-only">Пошук</D.Title>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(q);
            }}
            className="container-page flex h-16 items-center gap-3 border-b border-border lg:h-20"
          >
            <Search className="size-5 shrink-0" strokeWidth={1.5} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук товарів, кольорів, колекцій, SKU…"
              className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground lg:text-lg"
              aria-label="Пошуковий запит"
              maxLength={100}
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <D.Close className="p-1" aria-label="Закрити пошук">
              <X className="size-5" strokeWidth={1.5} />
            </D.Close>
          </form>

          <div className="container-page py-8 lg:py-10">
            {!res ? (
              <div>
                <p className="eyebrow mb-4 text-muted-foreground">Популярні запити</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p) => (
                    <button key={p} onClick={() => setQ(p)} className="border border-border px-4 py-2 text-sm hover:border-foreground">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : res.total === 0 && !res.categories.length ? (
              <p className="text-sm text-muted-foreground">
                Нічого не знайдено за запитом «{q}». Спробуйте інше слово або перегляньте <Link href="/shop" onClick={close} className="underline">весь каталог</Link>.
              </p>
            ) : (
              <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
                <div className="space-y-6">
                  {res.categories.length > 0 && (
                    <div>
                      <p className="eyebrow mb-3 text-muted-foreground">Категорії</p>
                      <ul className="space-y-2 text-sm">
                        {res.categories.map((c) => (
                          <li key={c.slug}>
                            <Link href={`/shop/${c.slug}`} onClick={close} className="hover:underline">
                              {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {res.collections.length > 0 && (
                    <div>
                      <p className="eyebrow mb-3 text-muted-foreground">Колекції</p>
                      <ul className="space-y-2 text-sm">
                        {res.collections.map((c) => (
                          <li key={c.slug}>
                            <Link href={`/collections/${c.slug}`} onClick={close} className="hover:underline">
                              {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <p className="eyebrow mb-4 text-muted-foreground">Товари</p>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                    {res.products.map((p) => (
                      <li key={p.id}>
                        <Link href={`/products/${p.slug}`} onClick={close} className="group block">
                          <div className="relative aspect-[4/5] bg-muted">
                            {p.images[0] && <Image src={p.images[0].url} alt={p.name} fill sizes="(min-width:1024px) 15vw, 45vw" className="object-cover" />}
                          </div>
                          <p className="mt-2 text-[13px] font-medium group-hover:underline">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatMoney(p.price)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {res.total > res.products.length && (
                    <button onClick={() => go(q)} className="mt-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] hover:underline">
                      Усі результати ({res.total}) <ArrowRight className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
