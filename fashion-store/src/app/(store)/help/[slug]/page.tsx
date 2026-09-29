import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PAGES = {
  delivery: { title: "Доставка та оплата", field: "deliveryInfo" },
  returns: { title: "Обмін та повернення", field: "returnsInfo" },
  "size-guide": { title: "Таблиця розмірів", field: "sizeGuide" },
} as const;

type Slug = keyof typeof PAGES;

export async function generateMetadata(props: PageProps<"/help/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = PAGES[slug as Slug];
  return page ? { title: page.title, alternates: { canonical: `/help/${slug}` } } : { title: "Не знайдено" };
}

export default async function HelpPage(props: PageProps<"/help/[slug]">) {
  const { slug } = await props.params;
  const page = PAGES[slug as Slug];
  if (!page) notFound();
  const settings = await getSettings();
  const content = settings[page.field];
  return (
    <div className="container-page grid max-w-5xl gap-10 py-8 lg:grid-cols-[200px_1fr] lg:py-16">
      <nav className="flex gap-4 overflow-x-auto text-sm lg:flex-col lg:gap-3">
        {(Object.keys(PAGES) as Slug[]).map((s) => (
          <Link key={s} href={`/help/${s}`} className={cn("shrink-0", s === slug ? "font-medium underline underline-offset-4" : "text-muted-foreground hover:text-foreground")}>
            {PAGES[s].title}
          </Link>
        ))}
      </nav>
      <article>
        <h1 className="font-display text-3xl font-medium lg:text-5xl">{page.title}</h1>
        <div className="mt-8 whitespace-pre-line text-[15px] leading-8 text-muted-foreground">{content || "Інформація скоро з'явиться."}</div>
        {slug === "delivery" && (
          <p className="mt-6 text-[15px] leading-8 text-muted-foreground">
            Способи оплати: оплата карткою онлайн або накладений платіж при отриманні у відділенні Нової Пошти.
          </p>
        )}
      </article>
    </div>
  );
}
