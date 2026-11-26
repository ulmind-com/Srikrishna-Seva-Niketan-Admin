import type { Assignment, Employee } from "@/types/models";

export type StaffBadgeTone = "emerald" | "amber" | "sky" | "rose" | "slate";

export interface StaffDutyBadge {
  text: string;
  tone: StaffBadgeTone;
  detail?: string;
}

export const STAFF_BADGE_CLASSES: Record<StaffBadgeTone, string> = {
  emerald:
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber:
    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  sky:
    "bg-sky-500/15 text-sky-400 border-sky-500/30",
  rose:
    "bg-rose-500/15 text-rose-400 border-rose-500/30",
  slate:
    "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

/**
 * Derive a concise status pill for a staff member when picking them for an assignment.
 * Distinguishes Ongoing/Working duties, recently Completed work (now free), Available, On Leave, and Inactive.
 */
export function resolveStaffDutyBadge(
  employee: Pick<Employee, "id" | "status">,
  assignments: Assignment[] = []
): StaffDutyBadge {
  const activeOrScheduled = assignments.filter(
    (a) => a.status === "active" || a.status === "scheduled"
  );

  const ongoing = activeOrScheduled.find((a) => !a.end_date);
  if (ongoing) {
    return {
      text: "Working · Ongoing",
      tone: "amber",
      detail: ongoing.customer_name ? `Ongoing: ${ongoing.customer_name}` : undefined,
    };
  }

  if (activeOrScheduled.length > 0) {
    const cur = activeOrScheduled[0];
    return {
      text: "Working",
      tone: "amber",
      detail: cur.customer_name ? `With ${cur.customer_name}` : undefined,
    };
  }

  if (employee.status === "assigned") {
    return { text: "Ongoing", tone: "amber" };
  }
  if (employee.status === "on_leave") {
    return { text: "On Leave", tone: "rose" };
  }
  if (employee.status === "inactive") {
    return { text: "Inactive", tone: "slate" };
  }

  const finished = assignments.find(
    (a) => a.status === "completed" || a.status === "replaced"
  );
  if (finished) {
    return {
      text: "Completed · Available",
      tone: "sky",
      detail: finished.customer_name ? `Last: ${finished.customer_name}` : undefined,
    };
  }

  return { text: "Available", tone: "emerald" };
}
