import type { Assignment, Employee } from "@/types/models";
import { combineDateTimeIST, nowIST } from "@/lib/ist-datetime";

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
 * Determine whether an assignment has already finished based on status or IST end datetime.
 */
export function isAssignmentEndedIST(a: Pick<Assignment, "status" | "start_date" | "end_date" | "start_time" | "end_time" | "shift">): boolean {
  if (a.status === "completed" || a.status === "replaced" || a.status === "cancelled") {
    return true;
  }
  if (!a.end_date) return false;
  const defEnd =
    a.end_time ||
    (a.shift === "night"
      ? "08:00"
      : a.shift === "morning"
      ? "15:00"
      : a.shift === "full_24h"
      ? a.start_time || "08:00"
      : "20:00");
  let endDt = combineDateTimeIST(String(a.end_date).slice(0, 10), defEnd);
  if (!endDt) return false;

  const sDate = String(a.start_date).slice(0, 10);
  const eDate = String(a.end_date).slice(0, 10);
  if (
    sDate === eDate &&
    (a.shift === "full_24h" || a.shift === "night") &&
    a.start_time &&
    defEnd <= a.start_time
  ) {
    endDt = endDt.plus({ days: 1 });
  }
  return nowIST() >= endDt;
}

/**
 * Derive a concise status pill for a staff member when picking them for an assignment.
 * Distinguishes live Ongoing/Working duties, recently Completed work (now free), Available, On Leave, and Inactive.
 */
export function resolveStaffDutyBadge(
  employee: Pick<Employee, "id" | "status">,
  assignments: Assignment[] = []
): StaffDutyBadge {
  const activeOrScheduled = assignments.filter(
    (a) => (a.status === "active" || a.status === "scheduled") && !isAssignmentEndedIST(a)
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

  if (employee.status === "on_leave") {
    return { text: "On Leave", tone: "rose" };
  }
  if (employee.status === "inactive") {
    return { text: "Inactive", tone: "slate" };
  }

  // Only show Ongoing from employee.status if we have no assignment list loaded or any active assignment exists
  if (employee.status === "assigned" && assignments.length === 0) {
    return { text: "Ongoing", tone: "amber" };
  }

  const finished = assignments.find(
    (a) => a.status === "completed" || a.status === "replaced" || isAssignmentEndedIST(a)
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
