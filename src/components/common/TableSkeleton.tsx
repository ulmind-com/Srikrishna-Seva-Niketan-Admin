import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton
                className="h-4"
                style={{ width: `${50 + ((r + c) % 4) * 12}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-7 w-24" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
