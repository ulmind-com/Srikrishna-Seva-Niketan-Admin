import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarOff,
  Clock,
  PauseCircle,
  Plus,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Assignment, DutyBreak } from "@/types/models";
import { payrollService, type StaffLeave } from "@/services/payroll.service";
import { computeBreakSummaryIST, formatSlashDateIST } from "@/lib/ist-datetime";

interface BreakDetailsDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
  onManageBreaks?: (assignment: Assignment) => void;
}

interface UnifiedBreakItem {
  id: string;
  startDate: string;
  endDate: string;
  windowLabel: string;
  days: number;
  hours: number;
  reason: string;
  kindLabel: string;
  deducted: boolean;
}

/**
 * Centered popup card showing full dynamic list of all breaks & leaves
 * taken by the assigned staff member under the selected customer engagement.
 */
export function BreakDetailsDialog({
  assignment,
  onClose,
  onManageBreaks,
}: BreakDetailsDialogProps) {
  const leavesQ = useQuery({
    queryKey: ["assignment-breaks-leaves", assignment?.id],
    queryFn: () =>
      payrollService.listLeaves({
        assignment_id: assignment?.id,
      }),
    enabled: !!assignment?.id,
  });

  const items = useMemo<UnifiedBreakItem[]>(() => {
    if (!assignment) return [];
    const leaves = leavesQ.data?.items ?? [];
    const leaveByBreakId = new Map<string, StaffLeave>();
    for (const lv of leaves) {
      if (lv.linked_break_id) {
        leaveByBreakId.set(lv.linked_break_id, lv);
      }
    }

    const list: UnifiedBreakItem[] = (assignment.duty_breaks ?? []).map(
      (b: DutyBreak, idx: number) => {
        const linkedLeave = b.id ? leaveByBreakId.get(b.id) : undefined;
        const summary = computeBreakSummaryIST(
          b.start_date,
          b.end_date,
          b.start_time,
          b.end_time
        );
        return {
          id: b.id || `brk-${idx}`,
          startDate: b.start_date,
          endDate: b.end_date,
          windowLabel: summary.label,
          days: summary.days,
          hours: summary.hours,
          reason: linkedLeave?.reason || b.reason || "Duty pause / Leave",
          kindLabel: linkedLeave
            ? `${linkedLeave.leave_type.toUpperCase()} Leave`
            : "Duty Break / Leave",
          deducted: linkedLeave ? linkedLeave.deduct_pay : true,
        };
      }
    );

    // Include any standalone approved leaves not represented by a duty_break (e.g., Paid Leave)
    const representedLeaveIds = new Set(
      (assignment.duty_breaks ?? [])
        .map((b) => (b.id ? leaveByBreakId.get(b.id)?.id : undefined))
        .filter(Boolean)
    );
    for (const lv of leaves) {
      if (representedLeaveIds.has(lv.id)) continue;
      if (lv.approval_status === "rejected") continue;
      const summary = computeBreakSummaryIST(
        lv.leave_date,
        lv.end_date || lv.leave_date
      );
      list.push({
        id: `lv-${lv.id}`,
        startDate: lv.leave_date,
        endDate: lv.end_date || lv.leave_date,
        windowLabel: summary.label,
        days: summary.days,
        hours: summary.hours,
        reason: lv.reason || "Staff Leave",
        kindLabel: `${lv.leave_type.toUpperCase()} Leave (${lv.approval_status})`,
        deducted: lv.deduct_pay,
      });
    }

    return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [assignment, leavesQ.data?.items]);

  const totalBreakDays = useMemo(
    () =>
      Math.round(
        items.reduce((sum, item) => sum + (item.deducted ? item.days : 0), 0) * 10
      ) / 10,
    [items]
  );

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
              <PauseCircle className="h-4 w-4" />
            </span>
            <span>Break &amp; Leave Details (ছুটির সম্পূর্ণ বিবরণ)</span>
          </DialogTitle>
          <DialogDescription>
            {assignment?.employee_name} → {assignment?.customer_name}
          </DialogDescription>
        </DialogHeader>

        {assignment && (
          <div className="space-y-4 text-sm">
            {/* Staff & Customer Duty Summary Card */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/25 p-3.5 text-xs">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Staff Member
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                  <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{assignment.employee_name}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer / Patient
                </p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {assignment.customer_name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Duty Period
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-muted-foreground tabular-nums">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {formatSlashDateIST(assignment.start_date)} →{" "}
                    {assignment.end_date
                      ? formatSlashDateIST(assignment.end_date)
                      : "Ongoing"}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Net Worked / Deducted Off
                </p>
                <p className="mt-0.5 font-semibold">
                  <span className="text-emerald-500">
                    {assignment.days_worked ?? 0}d worked
                  </span>
                  {totalBreakDays > 0 && (
                    <span className="text-amber-400"> · {totalBreakDays}d off</span>
                  )}
                </p>
              </div>
            </div>

            {/* Dynamic List of All Breaks / Leaves */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  All Breaks / Leaves ({items.length})
                </p>
                {items.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px]"
                  >
                    Total {items.length}{" "}
                    {items.length === 1 ? "Entry" : "Entries"}
                  </Badge>
                )}
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <CalendarOff className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No breaks or leaves recorded for this assignment yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-0.5">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-amber-500/25 bg-card p-3 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-400">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-foreground text-xs sm:text-sm tabular-nums">
                            {item.windowLabel}
                          </span>
                        </div>
                        <Badge className="shrink-0 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px]">
                          <Clock className="mr-1 h-3 w-3" />
                          {item.days} {item.days === 1 ? "Day" : "Days"}
                          {item.hours > 0 ? ` (${item.hours}h)` : ""}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pl-7 text-xs">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            Reason:
                          </span>{" "}
                          {item.reason}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {item.kindLabel}
                          </Badge>
                          {!item.deducted && (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                              Paid Leave
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t border-border">
          {assignment && onManageBreaks && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const cur = assignment;
                onClose();
                onManageBreaks(cur);
              }}
              className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage / Add Break
            </Button>
          )}
          <Button type="button" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
