import { Skeleton } from "@/components/ui/misc";

// Shown at once when a product is opened, while a page not yet cached is rendered.
export default function Loading() {
  return (
    <div className="lg:container-page lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)] lg:gap-12 lg:py-5 xl:gap-20">
      <div className="grid gap-1 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full" />
        <Skeleton className="hidden aspect-[4/5] w-full lg:block" />
      </div>
      <div className="container-page py-6 lg:px-0">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-4 h-5 w-24" />
        <div className="mt-8 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-9 rounded-full" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
        <Skeleton className="mt-8 h-12 w-full" />
      </div>
    </div>
  );
}
