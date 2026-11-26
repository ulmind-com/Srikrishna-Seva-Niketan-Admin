import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarOff,
  Check,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  payrollService,
  type LeaveApprovalStatus,
  type LeaveType,
} from "@/services/payroll.service";
import type { Assignment } from "@/types/models";
import { formatSlashDateIST, parseIST, todayIST } from "@/lib/ist-datetime";

interface LeaveRecordDialogProps {
  assignment?: Assignment | null;
  employee?: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LEAVE_TYPES: { value: LeaveType; label: string; defaultDeduct: boolean }[] = [
  { value: "unpaid", label: "Unpaid Leave (Pay Deducted)", defaultDeduct: true },
  { value: "casual", label: "Casual Leave (CL)", defaultDeduct: false },
  { value: "sick", label: "Sick / Medical Leave (SL)", defaultDeduct: false },
  { value: "paid", label: "Paid Leave (No Deduction)", defaultDeduct: false },
  { value: "emergency", label: "Emergency Leave", defaultDeduct: true },
];

export function LeaveRecordDialog({
  assignment,
  employee,
  open,
  onClose,
  onSuccess,
}: LeaveRecordDialogProps) {
  const qc = useQueryClient();
  const empId = assignment?.employee_id || employee?.id || "";
  const empName = assignment?.employee_name || employee?.name || "Staff Member";

  const [leaveDate, setLeaveDate] = useState(todayIST());
  const [endDate, setEndDate] = useState(todayIST());
  const [leaveType, setLeaveType] = useState<LeaveType>("unpaid");
  const [deductPay, setDeductPay] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<LeaveApprovalStatus>("approved");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      const defDate =
        assignment?.start_date && assignment.start_date > todayIST()
          ? assignment.start_date
          : todayIST();
      setLeaveDate(defDate);
      setEndDate(defDate);
      setLeaveType("unpaid");
      setDeductPay(true);
      setApprovalStatus("approved");
      setReason("");
    }
  }, [open, assignment?.id]);

  const leaveDaysCount = useMemo(() => {
    const s = parseIST(leaveDate);
    const e = parseIST(endDate || leaveDate);
    if (!s || !e || e < s) return 0;
    return Math.round(e.diff(s, "days").days) + 1;
  }, [leaveDate, endDate]);

  const existingQ = useQuery({
    queryKey: ["staff-leaves", empId, assignment?.id || "all"],
    queryFn: () =>
      payrollService.listLeaves({
        employee_id: empId || undefined,
        assignment_id: assignment?.id || undefined,
      }),
    enabled: open && !!empId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["staff-leaves"] });
    qc.invalidateQueries({ queryKey: ["assignments"] });
    qc.invalidateQueries({ queryKey: ["payroll-run"] });
    qc.invalidateQueries({ queryKey: ["payslip"] });
    qc.invalidateQueries({ queryKey: ["attendance-day"] });
    qc.invalidateQueries({ queryKey: ["monthly-bills"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["staff-ledger"] });
  };

  const createMut = useMutation({
    mutationFn: payrollService.createLeave,
    onSuccess: () => {
      toast.success("Leave recorded and synced with Attendance, Payslips & Billing");
      invalidateAll();
      setReason("");
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to record leave"),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      approval_status,
    }: {
      id: string;
      approval_status: LeaveApprovalStatus;
    }) => payrollService.updateLeave(id, { approval_status }),
    onSuccess: () => {
      toast.success("Leave status updated");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: payrollService.deleteLeave,
    onSuccess: () => {
      toast.success("Leave record removed & attendance restored");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  const existingLeaves = existingQ.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-500" />
            Staff Leave &amp; Attendance Adjustment
          </DialogTitle>
          <DialogDescription>
            {empName}
            {assignment ? ` · Customer: ${assignment.customer_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Leave Start Date</Label>
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => {
                  setLeaveDate(e.target.value);
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Leave End Date</Label>
              <Input
                type="date"
                min={leaveDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select
                value={leaveType}
                onValueChange={(val) => {
                  const t = val as LeaveType;
                  setLeaveType(t);
                  const found = LEAVE_TYPES.find((x) => x.value === t);
                  if (found) setDeductPay(found.defaultDeduct);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Approval Status</Label>
              <Select
                value={approvalStatus}
                onValueChange={(v) => setApprovalStatus(v as LeaveApprovalStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Deduct Salary &amp; Assignment Billing</p>
              <p className="text-xs text-muted-foreground">
                {deductPay
                  ? "Unpaid leave — marks duty off, deducts staff payout & customer bill for these days."
                  : "Paid leave — marks leave in register without salary deduction."}
              </p>
            </div>
            <Switch checked={deductPay} onCheckedChange={setDeductPay} />
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family emergency / Medical checkup"
            />
          </div>

          {leaveDaysCount > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground">
              Recording <strong>{leaveDaysCount}</strong> day(s) of{" "}
              <strong className="uppercase">{leaveType}</strong> leave (
              {deductPay ? "Unpaid / Deducted" : "Paid / No deduction"}).
            </div>
          )}

          {/* Existing Leaves History */}
          {existingLeaves.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recorded Leaves ({existingLeaves.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {existingLeaves.map((lv) => (
                  <div
                    key={lv.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>
                          {formatSlashDateIST(lv.leave_date)}
                          {lv.end_date && lv.end_date !== lv.leave_date
                            ? ` → ${formatSlashDateIST(lv.end_date)}`
                            : ""}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {lv.leave_type}
                        </Badge>
                        <Badge
                          className={
                            lv.approval_status === "approved"
                              ? "text-[10px] bg-emerald-500/15 text-emerald-500"
                              : lv.approval_status === "rejected"
                              ? "text-[10px] bg-rose-500/15 text-rose-500"
                              : "text-[10px] bg-amber-500/15 text-amber-500"
                          }
                        >
                          {lv.approval_status}
                        </Badge>
                        {lv.deduct_pay && (
                          <span className="text-[10px] text-rose-500 font-semibold">Deducted</span>
                        )}
                      </div>
                      {lv.reason && (
                        <p className="text-muted-foreground mt-0.5">{lv.reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {lv.approval_status === "pending" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-emerald-500"
                            title="Approve"
                            onClick={() =>
                              updateMut.mutate({ id: lv.id, approval_status: "approved" })
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-rose-500"
                            title="Reject"
                            onClick={() =>
                              updateMut.mutate({ id: lv.id, approval_status: "rejected" })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-rose-500"
                        title="Delete"
                        onClick={() => deleteMut.mutate(lv.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={createMut.isPending || !empId || leaveDaysCount <= 0}
            onClick={() =>
              createMut.mutate({
                employee_id: empId,
                assignment_id: assignment?.id || undefined,
                leave_date: leaveDate,
                end_date: endDate || leaveDate,
                leave_type: leaveType,
                deduct_pay: deductPay,
                approval_status: approvalStatus,
                reason: reason || undefined,
              })
            }
          >
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Save Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
