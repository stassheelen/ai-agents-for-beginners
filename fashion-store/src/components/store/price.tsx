import { cn, discountPercent, formatMoney } from "@/lib/utils";

export function Price({ price, compareAt, currency = "UAH", className, showDiscount = false }: { price: number; compareAt?: number | null; currency?: string; className?: string; showDiscount?: boolean }) {
  const onSale = Boolean(compareAt && compareAt > price);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn(onSale && "text-destructive")}>{formatMoney(price, currency)}</span>
      {onSale && <s className="text-muted-foreground">{formatMoney(compareAt!, currency)}</s>}
      {onSale && showDiscount && <span className="text-xs text-destructive">−{discountPercent(price, compareAt)}%</span>}
    </span>
  );
}

export function Stars({ rating, className, size = 12 }: { rating: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-px", className)} aria-label={`Рейтинг ${rating} з 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="#d6d3cd" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#s${i}-${Math.round(fill * 100)})`}
              d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
            />
          </svg>
        );
      })}
    </span>
  );
}
