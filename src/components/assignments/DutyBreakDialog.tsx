import { useState, useId, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { assignmentService } from "@/services/resources";
import type { Assignment, DutyBreak } from "@/types/models";
import { formatDate } from "@/lib/utils";
import { combineDateTimeIST, parseIST } from "@/lib/ist-datetime";

interface DutyBreakDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASON_PRESETS = [
  "Customer Out of Town (কাস্টমার বাইরে গেছেন)",
  "Patient Hospitalized (রোগী হাসপাতালে ভর্তি)",
  "Staff Personal Leave (স্টাফের ছুটি)",
  "Family Event / Relatives Visiting",
  "Temporary Pause (সাময়িক কাজ বন্ধ)",
];

export function DutyBreakDialog({
  assignment,
  onClose,
  onSuccess,
}: DutyBreakDialogProps) {
  const qc = useQueryClient();
  const formId = useId();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("08:00");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (assignment) {
      const defTime =
        assignment.start_time ||
        (assignment.shift === "night"
          ? "20:00"
          : assignment.shift === "morning"
            ? "07:00"
            : "08:00");
      setStartTime(defTime);
      setEndTime(
        assignment.shift === "full_24h"
          ? defTime
          : assignment.end_time ||
              (assignment.shift === "night" ? "08:00" : assignment.shift === "morning" ? "15:00" : "20:00")
      );
    }
  }, [assignment]);

  const breakPreview = useMemo(() => {
    if (!startDate || !endDate) return null;
    const sD = parseIST(startDate);
    const eD = parseIST(endDate);
    if (!sD || !eD || eD < sD) return null;
    if (startTime && endTime) {
      const bs = combineDateTimeIST(startDate, startTime);
      let be = combineDateTimeIST(endDate, endTime);
      if (!bs || !be) return null;
      if (be.toMillis() === bs.toMillis() && sD.hasSame(eD, "day")) {
        be = bs.plus({ days: 1 });
      } else if (be <= bs) {
        be = be.plus({ days: 1 });
      }
      const hrs = Math.round(be.diff(bs, "hours").hours * 10) / 10;
      const days = Math.round((hrs / 24) * 2) / 2;
      return {
        label: `${bs.toFormat("dd MMM, hh:mm a")} → ${be.toFormat("dd MMM, hh:mm a")}`,
        days,
        hrs,
      };
    }
    const days = Math.round(eD.diff(sD, "days").days) + 1;
    return { label: `${sD.toFormat("dd MMM")} → ${eD.toFormat("dd MMM")}`, days, hrs: days * 24 };
  }, [startDate, endDate, startTime, endTime]);

  const breaks: DutyBreak[] = assignment?.duty_breaks ?? [];

  const addBreakMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) return;
      return assignmentService.addBreak(assignment.id, {
        start_date: startDate,
        end_date: endDate,
        start_time: startTime || null,
        end_time: endTime || null,
        reason: reason.trim() || "Customer request / staff leave",
      });
    },
    onSuccess: () => {
      toast.success("Duty pause / break added. Billing and attendance updated.");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["attendance-statement"] });
      qc.invalidateQueries({ queryKey: ["payroll-summary"] });
      setStartDate("");
      setEndDate("");
      setReason("");
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add duty break");
    },
  });

  const removeBreakMutation = useMutation({
    mutationFn: async (breakId: string) => {
      if (!assignment) return;
      return assignmentService.removeBreak(assignment.id, breakId);
    },
    onSuccess: () => {
      toast.success("Duty break removed. Paid duty resumed.");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["attendance-statement"] });
      qc.invalidateQueries({ queryKey: ["payroll-summary"] });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove duty break");
    },
  });

  const handleAddBreak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please specify both start date and end date for the break.");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }
    addBreakMutation.mutate();
  };

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <PauseCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Manage Duty Breaks & Pauses (ছুটি / সাময়িক বন্ধ)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Temporarily pause duty when customer doesn't need staff for a few days, or staff takes leave.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {assignment && (
          <div className="space-y-4 pt-2">
            {/* Assignment context banner */}
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground text-sm">
                  {assignment.customer_name}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  Staff: {assignment.employee_name}
                </Badge>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Duty Span: {formatDate(assignment.start_date)} →{" "}
                  {assignment.end_date ? formatDate(assignment.end_date) : "Ongoing"}
                </span>
                <span>
                  Rates: ₹{assignment.customer_daily_rate ?? "—"}/d (Cust) · ₹
                  {assignment.employee_daily_rate ?? "—"}/d (Staff)
                </span>
              </div>
            </div>

            {/* Existing breaks section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active & Recorded Breaks ({breaks.length})
              </Label>
              {breaks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  <PlayCircle className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                  No breaks recorded. Duty runs continuously without gaps.
                </div>
              ) : (
                <div className="space-y-2">
                  {breaks.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-900 dark:text-amber-200">
                            ⏸️ {formatDate(b.start_date)} {b.start_time ? `(${b.start_time})` : ""} →{" "}
                            {formatDate(b.end_date)} {b.end_time ? `(${b.end_time})` : ""}
                          </span>
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none">
                            Unpaid Off
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          Reason: {b.reason || "Customer request / staff leave"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 px-2"
                        disabled={removeBreakMutation.isPending}
                        onClick={() => removeBreakMutation.mutate(b.id)}
                      >
                        {removeBreakMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Resume
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new break form */}
            <form id={formId} onSubmit={handleAddBreak} className="space-y-3 rounded-xl border border-border p-4 bg-card">
              <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                <Plus className="h-4 w-4 text-primary" />
                Add New Break / Pause Period
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Break Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    min={assignment.start_date}
                    max={assignment.end_date || undefined}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Break Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Break End Date (Inclusive)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate || assignment.start_date}
                    max={assignment.end_date || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Break End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Reason for Pause / Break</Label>
                <div className="flex flex-wrap gap-1">
                  {REASON_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className={`text-[10px] rounded-md px-2 py-0.5 border transition ${
                        reason === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or enter custom reason (e.g. 2 days patient hospitalized)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="rounded-md bg-blue-500/10 p-2.5 text-[11px] text-blue-800 dark:text-blue-300 flex flex-col gap-1">
                {breakPreview && (
                  <div className="font-semibold text-foreground">
                    IST Pause Span: {breakPreview.label} ({breakPreview.days} Day{breakPreview.days === 1 ? "" : "s"} / {breakPreview.hrs} hrs)
                  </div>
                )}
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Break intervals are automatically deducted in IST and marked <strong>Off</strong> on attendance &amp; payslips.
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={addBreakMutation.isPending || !startDate || !endDate}
                className="w-full text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {addBreakMutation.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Apply Break & Recalculate Days
              </Button>
            </form>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
