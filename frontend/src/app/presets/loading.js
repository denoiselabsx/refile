import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-40" />
        <Skeleton className="mt-3 h-4 w-72" />

        <div className="mt-8 flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-44" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20" />
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
