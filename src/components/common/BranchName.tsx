import { useQuery } from "@tanstack/react-query";
import { resourceServices } from "@/services/resources";

/** Resolve a branch/location id to its name for display in tables & cards.
 *  Shares the ["locations","all"] query cache with the rest of the app. */
export function BranchName({ id, className }: { id?: string | null; className?: string }) {
  const { data } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => resourceServices.locations.list({ page_size: 100 }),
    staleTime: 60_000,
  });
  if (!id) return <span className="text-muted-foreground">—</span>;
  const branch = data?.items.find((b) => b.id === id);
  return <span className={className}>{branch?.name ?? "—"}</span>;
}
