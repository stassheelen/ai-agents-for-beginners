import Link from "next/link";

export function SectionHeading({ title, subtitle, href, linkLabel }: { title?: string | null; subtitle?: string | null; href?: string | null; linkLabel?: string | null }) {
  if (!title && !href) return null;
  return (
    <div className="mb-6 flex items-end justify-between gap-6 lg:mb-8">
      <div>
        {title && <h2 className="font-display text-2xl font-medium lg:text-[32px]">{title}</h2>}
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] underline underline-offset-[6px] hover:no-underline">
          {linkLabel || "Дивитись усе"}
        </Link>
      )}
    </div>
  );
}
