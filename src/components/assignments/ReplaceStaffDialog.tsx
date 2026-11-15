import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  ArrowRight,
  Loader2,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { resourceServices } from "@/services/resources";
import { describeError } from "@/services/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/types/models";
import { formatDate } from "@/lib/utils";

interface ReplaceStaffDialogProps {
  assignment: Assignment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReplaceStaffDialog({
  assignment,
  onClose,
  onSuccess,
}: ReplaceStaffDialogProps) {
  const qc = useQueryClient();

  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => getTodayIST());
  const [reason, setReason] = useState("");
  const [customRate, setCustomRate] = useState<string>("");
  const [payoutRate, setPayoutRate] = useState<string>("");

  // Load available staff in the same branch
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["employees", "branch", assignment?.location_id],
    queryFn: () =>
      resourceServices.employees.list({
        location_id: assignment?.location_id,
        page_size: 150,
      }),
    enabled: Boolean(assignment?.location_id),
    staleTime: 30_000,
  });

  const availableStaff = useMemo(() => {
    const list = staffData?.items ?? [];
    return list.filter(
      (e) => e.id !== assignment?.employee_id && (e.is_active ?? true)
    );
  }, [staffData, assignment]);

  const selectedNewEmp = useMemo(
    () => availableStaff.find((e) => e.id === newEmployeeId),
    [availableStaff, newEmployeeId]
  );

  // Compute handoff summary dates
  const handoffDates = useMemo(() => {
    if (!assignment || !effectiveDate) return null;
    const eff = new Date(effectiveDate);
    const dayBefore = new Date(eff);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().slice(0, 10);

    return {
      prevEnd: dayBeforeStr,
      newStart: effectiveDate,
      newEnd: assignment.end_date || "Ongoing",
    };
  }, [assignment, effectiveDate]);

  const replaceMutation = useMutation({
    mutationFn: () => {
      if (!assignment) throw new Error("No assignment selected");
      if (!newEmployeeId) throw new Error("Please select the replacement staff member");
      if (!effectiveDate) throw new Error("Please choose the effective replacement date");

      return resourceServices.assignments.replaceStaff(assignment.id, {
        new_employee_id: newEmployeeId,
        effective_date: effectiveDate,
        reason: reason.trim() || undefined,
        customer_daily_rate: customRate ? Number(customRate) : undefined,
        employee_daily_rate: payoutRate ? Number(payoutRate) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["monthly-bills"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["daily-roster"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });

      toast.success("Staff replaced successfully!", {
        description: `Duty handed over to ${selectedNewEmp?.name || "replacement nurse"} from ${effectiveDate}. Both nurses will appear on the consolidated customer bill.`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  if (!assignment) return null;

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Duty Handover &amp; Staff Replacement
          </div>
          <DialogTitle className="text-xl font-bold">
            Replace Staff (স্টাফ পরিবর্তন / নতুন অ্যাসাইন)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign a substitute nurse/attendant for{" "}
            <span className="font-semibold text-foreground">
              {assignment.customer_name}
            </span>
            . The client's monthly bill will automatically consolidate both attendants.
          </DialogDescription>
        </DialogHeader>

        {/* Current duty summary banner */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              <span>Current Nurse: {assignment.employee_name}</span>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono">
              {assignment.shift === "full_24h"
                ? "24 Hours Shift"
                : assignment.shift}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
            <div>
              <span className="font-medium text-foreground">Started: </span>
              {formatDate(assignment.start_date)}
            </div>
            <div>
              <span className="font-medium text-foreground">Scheduled End: </span>
              {assignment.end_date ? formatDate(assignment.end_date) : "Ongoing"}
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 py-2">
          {/* New Employee Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Select Replacement Staff (নতুন স্টাফ নির্বাচন করুন) *
            </Label>
            <Select
              value={newEmployeeId}
              onValueChange={(id) => {
                setNewEmployeeId(id);
                const emp = availableStaff.find((e) => e.id === id);
                if (emp?.daily_rate && !payoutRate) {
                  setPayoutRate(String(emp.daily_rate));
                }
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue
                  placeholder={
                    loadingStaff
                      ? "Loading staff members..."
                      : "Choose available staff member..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      {emp.code && (
                        <span className="font-mono text-xs text-muted-foreground">
                          ({emp.code})
                        </span>
                      )}
                      {emp.category && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                          {emp.category}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Effective Date & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Effective From Date (নতুন স্টাফ কোন তারিখ থেকে শুরু করবেন) *
              </Label>
              <Input
                type="date"
                value={effectiveDate}
                min={String(assignment.start_date).slice(0, 10)}
                max={
                  assignment.end_date
                    ? String(assignment.end_date).slice(0, 10)
                    : undefined
                }
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Reason / Note (কারণ, যেমন: ছুটি / ইমারজেন্সি)
              </Label>
              <Input
                placeholder="e.g. Family emergency, sick leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Daily Rate overrides if needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Client Daily Rate (₹/day)
              </Label>
              <Input
                type="number"
                placeholder={String(assignment.customer_daily_rate ?? "1200")}
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                New Staff Payout Rate (₹/day)
              </Label>
              <Input
                type="number"
                placeholder={String(selectedNewEmp?.daily_rate ?? assignment.employee_daily_rate ?? "700")}
                value={payoutRate}
                onChange={(e) => setPayoutRate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Handover Timeline Preview */}
          {handoffDates && selectedNewEmp && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs space-y-1.5 text-foreground">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> Handover Confirmation Preview:
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-medium text-foreground">{assignment.employee_name}:</span>
                <span>
                  {formatDate(assignment.start_date)} → {formatDate(handoffDates.prevEnd)} (Completed)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{selectedNewEmp.name}:</span>
                <span>
                  {formatDate(handoffDates.newStart)} → {handoffDates.newEnd !== "Ongoing" ? formatDate(handoffDates.newEnd) : "Ongoing"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/20">
                ✓ কাস্টমারের একটিমাত্র মাসিক বিল জেনারেট হবে যেখানে উভয় স্টাফের কাজের দিন ও টাকার হিসাব পরপর সুন্দরভাবে দেখানো থাকবে।
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={replaceMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => replaceMutation.mutate()}
            disabled={replaceMutation.isPending || !newEmployeeId || !effectiveDate}
            className="gap-2"
          >
            {replaceMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Confirm &amp; Replace Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
