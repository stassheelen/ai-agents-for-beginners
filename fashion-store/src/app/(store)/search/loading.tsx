import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-8 h-12 w-72" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-3 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
