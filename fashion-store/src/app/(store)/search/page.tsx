import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { parseCatalogParams } from "@/lib/catalog-params";

export const metadata: Metadata = { title: "Пошук", robots: { index: false } };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const params = parseCatalogParams(sp);
  const q = params.q ?? "";
  return (
    <CatalogView
      title={q ? `«${q}»` : "Пошук"}
      description={q ? "Результати пошуку" : "Введіть запит у пошуку, щоб знайти товари."}
      breadcrumbs={[
        { name: "Головна", href: "/" },
        { name: "Пошук", href: `/search${q ? `?q=${encodeURIComponent(q)}` : ""}` },
      ]}
      scope={{ q: q || undefined }}
      params={params}
    />
  );
}
