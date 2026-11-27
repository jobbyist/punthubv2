import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown by the router while a slow page loads (after 150 ms). Mirrors the common page layout (title, filter row,
 * card grid) so the swap to real content does not jump. Decorative only: the route progress bar announces loading.
 */
export function PageSkeleton() {
  return (
    <div className="puntr-page-skeleton container mx-auto px-4 py-6 sm:py-10" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-2/3 max-w-md" />
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
