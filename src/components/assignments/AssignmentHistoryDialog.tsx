import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarOff,
  History,
  IndianRupee,
  Loader2,
  PauseCircle,
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
import type { Assignment } from "@/types/models";
import { payrollService } from "@/services/payroll.service";
import { financeService } from "@/services/finance.service";
import { formatSlashDateIST } from "@/lib/ist-datetime";
import { formatBillNo } from "@/lib/utils";

interface AssignmentHistoryDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
}

const inr = (n?: number | null) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

export function AssignmentHistoryDialog({
  assignment,
  onClose,
}: AssignmentHistoryDialogProps) {
  const leavesQ = useQuery({
    queryKey: ["assignment-history-leaves", assignment?.id],
    queryFn: () =>
      payrollService.listLeaves({
        assignment_id: assignment?.id,
      }),
    enabled: !!assignment?.id,
  });

  const clientLedgerQ = useQuery({
    queryKey: ["assignment-history-ledger", assignment?.customer_id],
    queryFn: () =>
      financeService.clientLedger({
        customer_id: assignment?.customer_id,
      }),
    enabled: !!assignment?.customer_id,
  });

  const receiptsForAssignment = (clientLedgerQ.data?.clients?.[0]?.receipts ?? []).filter(
    (r) => r.assignment_id === assignment?.id
  );
  const breaks = assignment?.duty_breaks ?? [];
  const leaves = leavesQ.data?.items ?? [];

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Assignment History &amp; Financial Timeline
          </DialogTitle>
          <DialogDescription>
            {assignment?.employee_name} → {assignment?.customer_name}
            {assignment?.bill_no != null ? ` · Bill #${formatBillNo(assignment.bill_no)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {assignment && (
          <div className="space-y-5 text-sm">
            {/* Core Assignment Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-border bg-muted/20 p-3">
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Period</p>
                <p className="font-semibold">
                  {formatSlashDateIST(assignment.start_date)} →{" "}
                  {assignment.end_date ? formatSlashDateIST(assignment.end_date) : "Ongoing"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Shift &amp; Days</p>
                <p className="font-semibold capitalize">
                  {assignment.shift.replace("_", " ")} · {assignment.days_worked ?? 0}d
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Customer Bill</p>
                <p className="font-bold text-sky-500">{inr(assignment.customer_rate)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Staff Payout</p>
                <p className="font-bold text-emerald-500">{inr(assignment.employee_payout)}</p>
              </div>
            </div>

            {/* Replacement / Handover History */}
            {(assignment.replacement_for_employee_name || assignment.replaced_by_employee_name) && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-400">
                  <UserCheck className="h-3.5 w-3.5" /> Handover / Replacement Chain
                </p>
                {assignment.replacement_for_employee_name && (
                  <p className="text-xs">
                    Replacement for: <strong>{assignment.replacement_for_employee_name}</strong>
                    {assignment.replacement_reason ? ` — Reason: ${assignment.replacement_reason}` : ""}
                  </p>
                )}
                {assignment.replaced_by_employee_name && (
                  <p className="text-xs">
                    Handed over to: <strong>{assignment.replaced_by_employee_name}</strong>
                    {assignment.replacement_reason ? ` — Reason: ${assignment.replacement_reason}` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Recorded Leaves */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarOff className="h-3.5 w-3.5 text-orange-400" /> Staff Leaves ({leaves.length})
              </p>
              {leavesQ.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : leaves.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No leave entries recorded for this assignment.</p>
              ) : (
                <div className="space-y-1.5">
                  {leaves.map((lv) => (
                    <div key={lv.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                      <div>
                        <span className="font-semibold">
                          {formatSlashDateIST(lv.leave_date)}
                          {lv.end_date && lv.end_date !== lv.leave_date ? ` → ${formatSlashDateIST(lv.end_date)}` : ""}
                        </span>
                        <span className="ml-2 uppercase text-muted-foreground">[{lv.leave_type}]</span>
                        {lv.reason && <p className="text-muted-foreground mt-0.5">{lv.reason}</p>}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {lv.approval_status}{lv.deduct_pay ? " · Deducted" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Duty Breaks / Pauses */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <PauseCircle className="h-3.5 w-3.5 text-amber-400" /> Duty Pauses / Breaks ({breaks.length})
              </p>
              {breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No duty breaks recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {breaks.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                      <div>
                        <span className="font-semibold">
                          {formatSlashDateIST(b.start_date)} → {formatSlashDateIST(b.end_date)}
                        </span>
                        {b.reason && <p className="text-muted-foreground mt-0.5">{b.reason}</p>}
                      </div>
                      <Badge variant="secondary">
                        {b.start_time && b.end_time ? `${b.start_time} – ${b.end_time}` : "Duty Off"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Payment Receipts */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-500" /> Client Payment Receipts ({receiptsForAssignment.length})
              </p>
              {clientLedgerQ.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : receiptsForAssignment.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No direct payment receipts linked yet · Payment Status: <strong className="uppercase">{assignment.payment_status}</strong>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {receiptsForAssignment.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                      <div>
                        <span className="font-semibold text-primary">{r.receipt_no || "RCP"}</span>
                        <span className="ml-2 text-muted-foreground">{formatSlashDateIST(r.date)}</span>
                        <span className="ml-2 uppercase text-muted-foreground">{r.mode.replace(/_/g, " ")}</span>
                      </div>
                      <span className="font-bold text-emerald-500">{inr(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status / Notes */}
            {assignment.notes && (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <CalendarClock className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                Notes: {assignment.notes}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
