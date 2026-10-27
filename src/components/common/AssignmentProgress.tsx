import type { Assignment } from "@/types/models";

/** Human label for where a staff member is posted. */
export const PLACE_LABEL: Record<string, string> = {
  home: "Customer's Home",
  hospital: "Hospital",
  nursing_home: "Nursing Home",
  other: "Other",
};

/**
 * How far through an engagement a staff member is.
 *
 * Shows a bar plus "x of y days left", and leans on colour so a glance across
 * the list tells you who is about to come free: amber in the last three days,
 * red on the final day, slate once it is done.
 */
export function AssignmentProgress({
  row,
  className = "",
}: {
  row: Pick<Assignment, "total_days" | "days_elapsed" | "days_remaining" | "progress_pct" | "end_date">;
  className?: string;
}) {
  // Open-ended engagements have no finish line to measure against.
  if (row.total_days == null || row.days_remaining == null) {
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>Ongoing</span>
    );
  }

  const { total_days: total, days_remaining: left } = row;
  const pct = row.progress_pct ?? 0;

  const tone =
    left === 0
      ? { bar: "bg-muted-foreground/40", text: "text-muted-foreground" }
      : left <= 1
        ? { bar: "bg-danger", text: "text-danger" }
        : left <= 3
          ? { bar: "bg-warning", text: "text-warning" }
          : { bar: "bg-primary", text: "text-foreground" };

  return (
    <div className={`min-w-[132px] ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xs font-medium ${tone.text}`}>
          {left === 0 ? "Completed" : `${left} day${left === 1 ? "" : "s"} left`}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {row.days_elapsed ?? 0}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
